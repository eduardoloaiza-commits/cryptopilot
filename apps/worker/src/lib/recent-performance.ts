import { prisma } from "@cryptopilot/db";
import { getActivePortfolio } from "./portfolio.js";

export interface RecentPerf {
  closedLastN: number;
  winners: number;
  losers: number;
  winrate: number; // 0..1
  avgWinnerUsdt: number;
  avgLoserUsdt: number;
  sumPnlUsdt: number;
  lostSymbols: string[]; // símbolos con pérdida neta reciente
  wonSymbols: string[];
  openCount: number;
  dailyPnlUsdt: number;
  summary: string; // human-readable summary for the prompt
}

const EMPTY: RecentPerf = {
  closedLastN: 0,
  winners: 0,
  losers: 0,
  winrate: 0,
  avgWinnerUsdt: 0,
  avgLoserUsdt: 0,
  sumPnlUsdt: 0,
  lostSymbols: [],
  wonSymbols: [],
  openCount: 0,
  dailyPnlUsdt: 0,
  summary: "Sin histórico aún — ciclo inicial, mantén threshold alto (≥0.70).",
};

export async function getRecentPerformance(n = 10): Promise<RecentPerf> {
  const portfolio = await getActivePortfolio();
  if (!portfolio) return EMPTY;

  const closed = await prisma.trade.findMany({
    where: { portfolioId: portfolio.id, status: "CLOSED" },
    orderBy: { closedAt: "desc" },
    take: n,
  });

  const openCount = await prisma.trade.count({
    where: { portfolioId: portfolio.id, status: "OPEN" },
  });

  const todayStart = new Date();
  todayStart.setUTCHours(0, 0, 0, 0);
  const dailyAgg = await prisma.movement.aggregate({
    where: {
      portfolioId: portfolio.id,
      kind: "TRADE_PNL",
      ts: { gte: todayStart },
    },
    _sum: { amountUsdt: true },
  });

  if (closed.length === 0) {
    return {
      ...EMPTY,
      openCount,
      dailyPnlUsdt: Number(dailyAgg._sum.amountUsdt ?? 0),
      summary: `Sin trades cerrados aún. Abiertas: ${openCount}. Mantén threshold ≥ 0.70.`,
    };
  }

  let winners = 0;
  let losers = 0;
  let sum = 0;
  let sumWin = 0;
  let sumLose = 0;
  const bySymbol: Record<string, number> = {};
  for (const t of closed) {
    const pnl = Number(t.pnlUsdt ?? 0);
    sum += pnl;
    bySymbol[t.symbol] = (bySymbol[t.symbol] ?? 0) + pnl;
    if (pnl > 0) {
      winners += 1;
      sumWin += pnl;
    } else if (pnl < 0) {
      losers += 1;
      sumLose += pnl;
    }
  }
  const lostSymbols = Object.entries(bySymbol)
    .filter(([, p]) => p < 0)
    .map(([s]) => s);
  const wonSymbols = Object.entries(bySymbol)
    .filter(([, p]) => p > 0)
    .map(([s]) => s);
  const winrate = closed.length ? winners / closed.length : 0;
  const avgWinner = winners ? sumWin / winners : 0;
  const avgLoser = losers ? sumLose / losers : 0;

  const parts: string[] = [];
  parts.push(
    `Últimos ${closed.length} trades cerrados: ${winners}W / ${losers}L (winrate ${(winrate * 100).toFixed(0)}%), P&L acumulado $${sum.toFixed(2)}.`,
  );
  parts.push(
    `R:R realizado — avg winner $${avgWinner.toFixed(3)}, avg loser $${avgLoser.toFixed(3)} (ratio ${avgLoser === 0 ? "n/a" : Math.abs(avgWinner / avgLoser).toFixed(2)}).`,
  );
  if (lostSymbols.length > 0) parts.push(`Símbolos con pérdida neta reciente: ${lostSymbols.join(", ")} — reduce agresividad ahí.`);
  if (wonSymbols.length > 0) parts.push(`Símbolos con ganancia neta reciente: ${wonSymbols.join(", ")}.`);
  parts.push(`Posiciones abiertas ahora: ${openCount}. P&L del día actual: $${Number(dailyAgg._sum.amountUsdt ?? 0).toFixed(2)}.`);
  if (winrate < 0.4) {
    parts.push(
      `⚠️ Winrate bajo (${(winrate * 100).toFixed(0)}%) — sube threshold de confianza a ≥0.70 y exige 3/3 timeframes alineados antes de emitir señal.`,
    );
  }

  return {
    closedLastN: closed.length,
    winners,
    losers,
    winrate,
    avgWinnerUsdt: avgWinner,
    avgLoserUsdt: avgLoser,
    sumPnlUsdt: sum,
    lostSymbols,
    wonSymbols,
    openCount,
    dailyPnlUsdt: Number(dailyAgg._sum.amountUsdt ?? 0),
    summary: parts.join(" "),
  };
}
