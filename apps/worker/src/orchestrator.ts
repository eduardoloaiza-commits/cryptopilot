import { setTimeout as sleep } from "node:timers/promises";
import { logger } from "./lib/logger.js";
import { runAnalyst } from "./agents/analyst.js";
import { runRiskManager, type RiskVerdict } from "./agents/risk-manager.js";
import { runTrader } from "./agents/trader.js";
import { runAccountant } from "./agents/accountant.js";
import { isKillSwitchActive } from "./guardrails.js";

const CYCLE_INTERVAL_MS = Number(process.env.CYCLE_INTERVAL_MS ?? 30_000);

export async function startOrchestrator() {
  logger.info({ intervalMs: CYCLE_INTERVAL_MS }, "Orchestrator loop starting");

  while (true) {
    try {
      await runCycle();
    } catch (err) {
      logger.error({ err }, "Cycle failed");
    }
    await sleep(CYCLE_INTERVAL_MS);
  }
}

async function runCycle() {
  if (await isKillSwitchActive()) {
    logger.warn("Kill-switch active — skipping cycle");
    return;
  }

  const signals = await runAnalyst();
  if (signals.length === 0) {
    logger.debug("No signals this cycle");
    return;
  }

  const preCheck: RiskVerdict = await runRiskManager({ phase: "pre-cycle" });
  if (!preCheck.allow) {
    logger.info({ reason: preCheck.reason }, "Risk manager blocked cycle");
    return;
  }

  const proposal = await runTrader({ signals, riskConstraints: preCheck.constraints });
  if (!proposal) return;

  const postCheck = await runRiskManager({ phase: "pre-execution", proposal });
  if (!postCheck.allow) {
    logger.info({ reason: postCheck.reason, proposal }, "Risk manager vetoed order");
    return;
  }

  const executed = await runTrader.execute(proposal);
  await runAccountant.recordTrade(executed);
}
