import { prisma } from "@cryptopilot/db";
import { getActivePortfolio } from "./lib/portfolio.js";
import { logger } from "./lib/logger.js";

/**
 * Kill-switch check — determinístico, fuera del prompt del agente.
 * Se invoca al inicio de cada ciclo del Orchestrator.
 */
export async function isKillSwitchActive(): Promise<boolean> {
  const portfolio = await getActivePortfolio();
  if (!portfolio) return false;
  const row = await prisma.guardrails.findUnique({
    where: { portfolioId: portfolio.id },
    select: { killSwitchTriggered: true, killSwitchReason: true },
  });
  if (row?.killSwitchTriggered) {
    logger.warn({ reason: row.killSwitchReason }, "kill-switch.active");
    return true;
  }
  return false;
}
