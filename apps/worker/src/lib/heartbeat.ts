import { prisma } from "@cryptopilot/db";
import { logger } from "./logger.js";
import { getActivePortfolio } from "./portfolio.js";

const STARTED_AT = new Date();
let cycleCount = 0;

export async function heartbeatStart(mode: string): Promise<void> {
  const portfolio = await getActivePortfolio();
  if (!portfolio) return;
  await prisma.workerHeartbeat.upsert({
    where: { portfolioId: portfolio.id },
    create: {
      portfolioId: portfolio.id,
      status: "running",
      mode,
      startedAt: STARTED_AT,
      cycleCount: 0,
    },
    update: {
      status: "running",
      mode,
      startedAt: STARTED_AT,
      cycleCount: 0,
      lastError: null,
    },
  });
}

export async function heartbeatCycle(opts: {
  mode: string;
  lastCycleMs: number;
  error?: string | null;
}): Promise<void> {
  const portfolio = await getActivePortfolio();
  if (!portfolio) return;
  cycleCount += 1;
  await prisma.workerHeartbeat.upsert({
    where: { portfolioId: portfolio.id },
    create: {
      portfolioId: portfolio.id,
      status: opts.error ? "error" : "running",
      mode: opts.mode,
      startedAt: STARTED_AT,
      cycleCount,
      lastCycleAt: new Date(),
      lastCycleMs: opts.lastCycleMs,
      lastError: opts.error ?? null,
    },
    update: {
      status: opts.error ? "error" : "running",
      mode: opts.mode,
      cycleCount,
      lastCycleAt: new Date(),
      lastCycleMs: opts.lastCycleMs,
      lastError: opts.error ?? null,
    },
  });
}

export async function snapshotEquity(): Promise<void> {
  const portfolio = await getActivePortfolio();
  if (!portfolio) return;
  try {
    const openCount = await prisma.trade.count({
      where: { portfolioId: portfolio.id, status: "OPEN" },
    });
    await prisma.equitySnapshot.create({
      data: {
        portfolioId: portfolio.id,
        equity: portfolio.currentEquity,
        openCount,
      },
    });
  } catch (err) {
    logger.warn({ err }, "equity.snapshot.failed");
  }
}
