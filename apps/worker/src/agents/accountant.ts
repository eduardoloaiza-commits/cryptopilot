import { MISSION_BRIEF, COMMON_TONE } from "./shared/prompts.js";
import { logger } from "../lib/logger.js";
import { runAgent } from "../lib/agent-sdk.js";
import { getActivePortfolio } from "../lib/portfolio.js";
import { prisma, Prisma } from "@cryptopilot/db";
import { z } from "zod";

/**
 * Accountant.recordTrade: el paper engine ya persiste Trade + Movements, así que
 * aquí sólo registramos en log (para trazabilidad y possible hook futuro).
 */
async function recordTradeFn(executed: unknown) {
  logger.info({ executed }, "accountant.recordTrade");
}

const ReportSchema = z.object({
  summaryMd: z.string().min(20),
});

const DAILY_REPORT_PROMPT = `
${MISSION_BRIEF}

Rol: CONTADOR (fase REPORT).
Tarea: genera un DailyReport en markdown, conciso (~150-300 palabras), con:
- Equity inicial y final del día (USDT)
- P&L neto y % sobre equity inicial
- Nº de trades, winrate
- Mejor y peor trade
- Menciones clave (vetos, guardrails, señales descartadas si llegan en el input)
- Una línea de "lecciones" si hay patrón visible

Devuelve JSON estricto: { "summaryMd": "..." }. NADA más.

${COMMON_TONE}
`.trim();

async function generateDailyReportFn(): Promise<void> {
  logger.info("accountant.generateDailyReport.start");
  const portfolio = await getActivePortfolio();
  if (!portfolio) {
    logger.warn("accountant: no portfolio");
    return;
  }

  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setUTCDate(tomorrow.getUTCDate() + 1);

  const closedTrades = await prisma.trade.findMany({
    where: {
      portfolioId: portfolio.id,
      status: "CLOSED",
      closedAt: { gte: today, lt: tomorrow },
    },
    orderBy: { closedAt: "asc" },
  });

  const movementsToday = await prisma.movement.aggregate({
    where: {
      portfolioId: portfolio.id,
      kind: "TRADE_PNL",
      ts: { gte: today, lt: tomorrow },
    },
    _sum: { amountUsdt: true },
  });

  const feesAgg = await prisma.movement.aggregate({
    where: {
      portfolioId: portfolio.id,
      kind: "FEE",
      ts: { gte: today, lt: tomorrow },
    },
    _sum: { amountUsdt: true },
  });

  const realizedPnl = Number(movementsToday._sum.amountUsdt ?? 0);
  const feesPaid = Number(feesAgg._sum.amountUsdt ?? 0);
  const endEquity = Number(portfolio.currentEquity);
  const startEquity = endEquity - realizedPnl - feesPaid;
  const pnlPct = startEquity > 0 ? realizedPnl / startEquity : 0;

  const wins = closedTrades.filter((t) => Number(t.pnlUsdt ?? 0) > 0).length;
  const winrate = closedTrades.length > 0 ? wins / closedTrades.length : 0;

  const pnls = closedTrades.map((t) => Number(t.pnlUsdt ?? 0));
  const best = pnls.length ? Math.max(...pnls) : 0;
  const worst = pnls.length ? Math.min(...pnls) : 0;

  const summaryInput = {
    date: today.toISOString().slice(0, 10),
    startEquity,
    endEquity,
    realizedPnl,
    pnlPct,
    tradesCount: closedTrades.length,
    winrate,
    best,
    worst,
    feesPaid,
    trades: closedTrades.map((t) => ({
      symbol: t.symbol,
      side: t.side,
      qty: Number(t.qty),
      entry: Number(t.entryPrice),
      exit: t.exitPrice != null ? Number(t.exitPrice) : null,
      pnl: Number(t.pnlUsdt ?? 0),
    })),
  };

  const mdResult = await runAgent({
    role: "ACCOUNTANT",
    phase: "REPORT",
    systemPrompt: DAILY_REPORT_PROMPT,
    userPrompt: `Input:\n${JSON.stringify(summaryInput, null, 2)}\n\nGenera summaryMd.`,
    model: "claude-haiku-4-5-20251001",
    allowedTools: [],
    outputSchema: ReportSchema,
    maxTurns: 3,
    portfolioId: portfolio.id,
  });

  const summaryMd = mdResult.ok
    ? mdResult.data.summaryMd
    : fallbackMarkdown(summaryInput);

  await prisma.dailyReport.upsert({
    where: { portfolioId_date: { portfolioId: portfolio.id, date: today } },
    update: {
      startEquity: new Prisma.Decimal(startEquity.toFixed(8)),
      endEquity: new Prisma.Decimal(endEquity.toFixed(8)),
      pnlUsdt: new Prisma.Decimal(realizedPnl.toFixed(8)),
      pnlPct: new Prisma.Decimal(pnlPct.toFixed(6)),
      tradesCount: closedTrades.length,
      winrate: new Prisma.Decimal(winrate.toFixed(4)),
      maxDrawdown: new Prisma.Decimal("0"),
      summaryMd,
    },
    create: {
      portfolioId: portfolio.id,
      date: today,
      startEquity: new Prisma.Decimal(startEquity.toFixed(8)),
      endEquity: new Prisma.Decimal(endEquity.toFixed(8)),
      pnlUsdt: new Prisma.Decimal(realizedPnl.toFixed(8)),
      pnlPct: new Prisma.Decimal(pnlPct.toFixed(6)),
      tradesCount: closedTrades.length,
      winrate: new Prisma.Decimal(winrate.toFixed(4)),
      maxDrawdown: new Prisma.Decimal("0"),
      summaryMd,
    },
  });

  logger.info(
    { date: summaryInput.date, pnl: realizedPnl, trades: closedTrades.length, winrate },
    "accountant.generateDailyReport.done",
  );
}

function fallbackMarkdown(input: {
  date: string;
  startEquity: number;
  endEquity: number;
  realizedPnl: number;
  pnlPct: number;
  tradesCount: number;
  winrate: number;
}): string {
  return [
    `# Daily Report ${input.date}`,
    ``,
    `- Equity inicial: **${input.startEquity.toFixed(2)} USDT**`,
    `- Equity final: **${input.endEquity.toFixed(2)} USDT**`,
    `- P&L: **${input.realizedPnl.toFixed(2)} USDT** (${(input.pnlPct * 100).toFixed(2)}%)`,
    `- Trades: ${input.tradesCount} · Winrate: ${(input.winrate * 100).toFixed(1)}%`,
    ``,
    `_Fallback summary (agente no disponible)._`,
  ].join("\n");
}

export const runAccountant = {
  recordTrade: recordTradeFn,
  generateDailyReport: generateDailyReportFn,
};
