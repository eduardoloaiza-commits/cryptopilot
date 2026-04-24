import { prisma } from "@cryptopilot/db";
import { getActivePortfolio } from "./lib/portfolio.js";
import { logger } from "./lib/logger.js";

export type CycleGate =
  | { allow: true }
  | { allow: false; reason: "kill-switch" | "paused"; detail: string | null };

export async function cycleGate(): Promise<CycleGate> {
  const portfolio = await getActivePortfolio();
  if (!portfolio) return { allow: true };
  const row = await prisma.guardrails.findUnique({
    where: { portfolioId: portfolio.id },
    select: {
      killSwitchTriggered: true,
      killSwitchReason: true,
      paused: true,
      pausedReason: true,
    },
  });
  if (row?.killSwitchTriggered) {
    logger.warn({ reason: row.killSwitchReason }, "kill-switch.active");
    return { allow: false, reason: "kill-switch", detail: row.killSwitchReason };
  }
  if (row?.paused) {
    logger.info({ reason: row.pausedReason }, "worker.paused");
    return { allow: false, reason: "paused", detail: row.pausedReason };
  }
  return { allow: true };
}

/** Legacy helper — usar `cycleGate()` en código nuevo. */
export async function isKillSwitchActive(): Promise<boolean> {
  const g = await cycleGate();
  return !g.allow && g.reason === "kill-switch";
}
