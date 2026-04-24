import { prisma } from "@cryptopilot/db";

export type HeartbeatHealth = "online" | "stale" | "error" | "offline" | "unknown";

export function classifyHeartbeat(hb: {
  status: string;
  lastCycleAt: Date | null;
} | null, cycleIntervalMs = 180_000): HeartbeatHealth {
  if (!hb || !hb.lastCycleAt) return "unknown";
  const ageMs = Date.now() - new Date(hb.lastCycleAt).getTime();
  const staleAfter = cycleIntervalMs * 3;
  const offlineAfter = cycleIntervalMs * 10;
  if (ageMs > offlineAfter) return "offline";
  if (hb.status === "error") return "error";
  if (ageMs > staleAfter) return "stale";
  return "online";
}

export async function getActivePortfolio() {
  const mode = (process.env.MODE ?? "PAPER") as "PAPER" | "TESTNET" | "LIVE";
  return prisma.portfolio.findFirst({
    where: { mode },
    include: { guardrails: true },
    orderBy: { createdAt: "asc" },
  });
}

function startOfTodayUtc(): Date {
  const d = new Date();
  d.setUTCHours(0, 0, 0, 0);
  return d;
}

export async function getDashboard() {
  const portfolio = await getActivePortfolio();
  if (!portfolio) return null;

  const today = startOfTodayUtc();
  const tomorrow = new Date(today);
  tomorrow.setUTCDate(tomorrow.getUTCDate() + 1);

  const [openTrades, closedToday, pnlAgg, feesAgg, openCount, lastLogs, heartbeat, equitySeries] = await Promise.all([
    prisma.trade.findMany({
      where: { portfolioId: portfolio.id, status: "OPEN" },
      orderBy: { openedAt: "desc" },
      take: 10,
    }),
    prisma.trade.count({
      where: {
        portfolioId: portfolio.id,
        status: "CLOSED",
        closedAt: { gte: today, lt: tomorrow },
      },
    }),
    prisma.movement.aggregate({
      where: {
        portfolioId: portfolio.id,
        kind: "TRADE_PNL",
        ts: { gte: today, lt: tomorrow },
      },
      _sum: { amountUsdt: true },
    }),
    prisma.movement.aggregate({
      where: {
        portfolioId: portfolio.id,
        kind: "FEE",
        ts: { gte: today, lt: tomorrow },
      },
      _sum: { amountUsdt: true },
    }),
    prisma.trade.count({ where: { portfolioId: portfolio.id, status: "OPEN" } }),
    prisma.agentLog.findMany({
      where: { portfolioId: portfolio.id },
      orderBy: { ts: "desc" },
      take: 10,
    }),
    prisma.workerHeartbeat.findUnique({ where: { portfolioId: portfolio.id } }),
    prisma.equitySnapshot.findMany({
      where: { portfolioId: portfolio.id, ts: { gte: new Date(Date.now() - 7 * 24 * 3600_000) } },
      orderBy: { ts: "asc" },
      select: { ts: true, equity: true, openCount: true },
      take: 2000,
    }),
  ]);

  return {
    portfolio,
    openTrades,
    openCount,
    todayPnlUsdt: Number(pnlAgg._sum.amountUsdt ?? 0),
    todayFeesUsdt: Number(feesAgg._sum.amountUsdt ?? 0),
    tradesClosedToday: closedToday,
    lastLogs,
    heartbeat,
    heartbeatHealth: classifyHeartbeat(heartbeat),
    equitySeries: equitySeries.map((s) => ({
      ts: s.ts.toISOString(),
      equity: Number(s.equity),
      openCount: s.openCount,
    })),
  };
}

export async function listTrades(limit = 100) {
  const portfolio = await getActivePortfolio();
  if (!portfolio) return [];
  return prisma.trade.findMany({
    where: { portfolioId: portfolio.id },
    orderBy: { openedAt: "desc" },
    take: limit,
  });
}

export async function listAgentLogs(limit = 100) {
  const portfolio = await getActivePortfolio();
  if (!portfolio) return [];
  return prisma.agentLog.findMany({
    where: { portfolioId: portfolio.id },
    orderBy: { ts: "desc" },
    take: limit,
  });
}

export async function listDailyReports(limit = 30) {
  const portfolio = await getActivePortfolio();
  if (!portfolio) return [];
  return prisma.dailyReport.findMany({
    where: { portfolioId: portfolio.id },
    orderBy: { date: "desc" },
    take: limit,
  });
}
