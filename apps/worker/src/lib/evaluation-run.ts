import { prisma } from "@cryptopilot/db";
import { logger } from "./logger.js";

export interface RunMetrics {
  portfolioId: string;
  windowStart: string;
  windowEnd: string;
  durationHours: number;

  startEquity: number;
  endEquity: number;
  pnlUsdt: number;
  pnlPct: number;

  cyclesTotal: number;
  cyclesWithSignal: number;
  cyclesStandAside: number;
  cyclesGatedByRisk: number;

  tradesOpened: number;
  tradesClosed: number;
  winners: number;
  losers: number;
  winrate: number;
  avgWinnerUsdt: number;
  avgLoserUsdt: number;
  realizedRR: number;

  exitReasons: Record<string, number>;
  bySymbol: Record<string, { n: number; pnl: number; winrate: number }>;
  bySymbolSignals: Record<string, number>;

  totalCostUsd: number;
  totalAnalystCostUsd: number;
  totalRiskCostUsd: number;
}

export async function computeRunMetrics(
  portfolioId: string,
  windowStart: Date,
  windowEnd: Date,
  startEquity: number,
): Promise<RunMetrics> {
  const [portfolio, trades, logs] = await Promise.all([
    prisma.portfolio.findUnique({ where: { id: portfolioId } }),
    prisma.trade.findMany({
      where: { portfolioId, openedAt: { gte: windowStart, lt: windowEnd } },
    }),
    prisma.agentLog.findMany({
      where: { portfolioId, ts: { gte: windowStart, lt: windowEnd } },
      select: { role: true, phase: true, level: true, output: true, toolName: true },
    }),
  ]);

  const endEquity = portfolio ? Number(portfolio.currentEquity) : startEquity;
  const durationHours = (windowEnd.getTime() - windowStart.getTime()) / 3_600_000;

  const closed = trades.filter((t) => t.status === "CLOSED");
  const winners = closed.filter((t) => Number(t.pnlUsdt ?? 0) > 0);
  const losers = closed.filter((t) => Number(t.pnlUsdt ?? 0) < 0);
  const sumWin = winners.reduce((a, t) => a + Number(t.pnlUsdt ?? 0), 0);
  const sumLose = losers.reduce((a, t) => a + Number(t.pnlUsdt ?? 0), 0);
  const avgWinner = winners.length ? sumWin / winners.length : 0;
  const avgLoser = losers.length ? sumLose / losers.length : 0;
  const realizedRR = avgLoser === 0 ? 0 : Math.abs(avgWinner / avgLoser);

  // Cycle classification via AgentLog.
  const orchestratorLogs = logs.filter((l) => l.role === "ORCHESTRATOR" && l.phase === "SCAN");
  const analystLogs = logs.filter((l) => l.role === "ANALYST" && l.phase === "SCAN");
  const riskLogs = logs.filter((l) => l.role === "RISK_MANAGER" && l.phase === "SCAN");

  const cyclesTotal = orchestratorLogs.length + analystLogs.length;
  const cyclesWithSignal = analystLogs.filter((l) => {
    const out = l.output as unknown;
    return Array.isArray(out) && out.length > 0;
  }).length;
  const cyclesStandAside = analystLogs.length - cyclesWithSignal;
  const cyclesGatedByRisk = riskLogs.filter((l) => {
    const out = l.output as { allow?: boolean } | null;
    return out?.allow === false;
  }).length;

  // Exit reasons
  const exitReasons: Record<string, number> = {};
  for (const t of closed) {
    const reasoning = t.reasoningAi ?? "";
    const key = reasoning.includes("TIME_STOP")
      ? "TIME_STOP"
      : reasoning.includes("SL_HIT")
        ? "SL_HIT"
        : reasoning.includes("TP_HIT")
          ? "TP_HIT"
          : "OTHER";
    exitReasons[key] = (exitReasons[key] ?? 0) + 1;
  }

  const bySymbol: Record<string, { n: number; pnl: number; winrate: number }> = {};
  for (const t of closed) {
    const s = t.symbol;
    bySymbol[s] ??= { n: 0, pnl: 0, winrate: 0 };
    bySymbol[s].n += 1;
    bySymbol[s].pnl += Number(t.pnlUsdt ?? 0);
  }
  for (const [sym, v] of Object.entries(bySymbol)) {
    const wins = closed.filter(
      (t) => t.symbol === sym && Number(t.pnlUsdt ?? 0) > 0,
    ).length;
    v.winrate = v.n ? wins / v.n : 0;
  }

  const bySymbolSignals: Record<string, number> = {};
  for (const l of analystLogs) {
    const out = l.output as Array<{ symbol?: string }> | null;
    if (!Array.isArray(out)) continue;
    for (const sig of out) {
      if (sig.symbol) bySymbolSignals[sig.symbol] = (bySymbolSignals[sig.symbol] ?? 0) + 1;
    }
  }

  const totalAnalystCostUsd = analystLogs.reduce((a, l) => {
    const out = l.output as { costUsd?: number } | null;
    return a + (out?.costUsd ?? 0);
  }, 0);
  const totalRiskCostUsd = riskLogs.reduce((a, l) => {
    const out = l.output as { costUsd?: number } | null;
    return a + (out?.costUsd ?? 0);
  }, 0);

  return {
    portfolioId,
    windowStart: windowStart.toISOString(),
    windowEnd: windowEnd.toISOString(),
    durationHours,
    startEquity,
    endEquity,
    pnlUsdt: endEquity - startEquity,
    pnlPct: startEquity > 0 ? (endEquity - startEquity) / startEquity : 0,
    cyclesTotal,
    cyclesWithSignal,
    cyclesStandAside,
    cyclesGatedByRisk,
    tradesOpened: trades.length,
    tradesClosed: closed.length,
    winners: winners.length,
    losers: losers.length,
    winrate: closed.length ? winners.length / closed.length : 0,
    avgWinnerUsdt: avgWinner,
    avgLoserUsdt: avgLoser,
    realizedRR,
    exitReasons,
    bySymbol,
    bySymbolSignals,
    totalCostUsd: totalAnalystCostUsd + totalRiskCostUsd,
    totalAnalystCostUsd,
    totalRiskCostUsd,
  };
}

export function renderRunReport(m: RunMetrics, label?: string | null): string {
  const sign = (n: number) => (n >= 0 ? "+" : "");
  const pct = (n: number) => `${sign(n * 100)}${(n * 100).toFixed(3)}%`;
  const dollar = (n: number) => `${sign(n)}$${n.toFixed(2)}`;

  const lines: string[] = [];
  lines.push(`# Evaluation Run${label ? ` — ${label}` : ""}`);
  lines.push("");
  lines.push(
    `Ventana: \`${m.windowStart.slice(0, 16)}Z\` → \`${m.windowEnd.slice(0, 16)}Z\` (${m.durationHours.toFixed(1)}h)`,
  );
  lines.push("");
  lines.push("## P&L");
  lines.push("");
  lines.push(`- Equity inicio: \`$${m.startEquity.toFixed(2)}\``);
  lines.push(`- Equity fin:    \`$${m.endEquity.toFixed(2)}\``);
  lines.push(`- P&L:           **${dollar(m.pnlUsdt)}** (${pct(m.pnlPct)})`);
  lines.push("");
  lines.push("## Ciclos");
  lines.push("");
  lines.push(`- Total de análisis del Analyst: ${m.cyclesTotal}`);
  lines.push(`- Con señal emitida:             ${m.cyclesWithSignal}`);
  lines.push(`- Stand-aside (\`[]\`):            ${m.cyclesStandAside}`);
  lines.push(`- Bloqueados por Risk:           ${m.cyclesGatedByRisk}`);
  lines.push("");
  lines.push("## Trades");
  lines.push("");
  lines.push(`- Abiertos en ventana: ${m.tradesOpened}`);
  lines.push(`- Cerrados en ventana: ${m.tradesClosed}`);
  lines.push(
    `- Winners / Losers:    ${m.winners} / ${m.losers}  → winrate ${(m.winrate * 100).toFixed(1)}%`,
  );
  lines.push(
    `- Avg winner / loser:  ${dollar(m.avgWinnerUsdt)} / ${dollar(m.avgLoserUsdt)}  (R:R realizado ${m.realizedRR.toFixed(2)})`,
  );
  lines.push("");
  if (Object.keys(m.exitReasons).length) {
    lines.push("### Razones de cierre");
    lines.push("");
    for (const [r, n] of Object.entries(m.exitReasons)) lines.push(`- ${r}: ${n}`);
    lines.push("");
  }
  if (Object.keys(m.bySymbol).length) {
    lines.push("### Por símbolo (trades cerrados)");
    lines.push("");
    lines.push("| Símbolo | Trades | P&L | Winrate |");
    lines.push("|---|---|---|---|");
    for (const [sym, v] of Object.entries(m.bySymbol).sort((a, b) => b[1].pnl - a[1].pnl)) {
      lines.push(
        `| ${sym} | ${v.n} | ${dollar(v.pnl)} | ${(v.winrate * 100).toFixed(0)}% |`,
      );
    }
    lines.push("");
  }
  if (Object.keys(m.bySymbolSignals).length) {
    lines.push("### Señales emitidas por el Analyst (por símbolo)");
    lines.push("");
    for (const [sym, n] of Object.entries(m.bySymbolSignals).sort((a, b) => b[1] - a[1])) {
      lines.push(`- ${sym}: ${n}`);
    }
    lines.push("");
  }
  lines.push("## Costo LLM");
  lines.push("");
  lines.push(`- Total:   $${m.totalCostUsd.toFixed(4)}`);
  lines.push(`- Analyst: $${m.totalAnalystCostUsd.toFixed(4)}`);
  lines.push(`- Risk:    $${m.totalRiskCostUsd.toFixed(4)}`);
  return lines.join("\n");
}

export async function finalizePendingRuns(): Promise<number> {
  const now = new Date();
  const pending = await prisma.evaluationRun.findMany({
    where: { status: "running", endsAt: { lte: now } },
  });
  if (pending.length === 0) return 0;

  for (const run of pending) {
    try {
      const metrics = await computeRunMetrics(
        run.portfolioId,
        run.startedAt,
        now,
        Number(run.startEquity),
      );
      const reportMd = renderRunReport(metrics, run.label);
      await prisma.evaluationRun.update({
        where: { id: run.id },
        data: {
          status: "completed",
          finalizedAt: now,
          endEquity: metrics.endEquity,
          reportMd,
          metrics: metrics as unknown as object,
        },
      });
      logger.info(
        { runId: run.id, pnlUsdt: metrics.pnlUsdt, trades: metrics.tradesClosed },
        "run.finalized",
      );
    } catch (err) {
      logger.error({ err, runId: run.id }, "run.finalize.failed");
    }
  }
  return pending.length;
}
