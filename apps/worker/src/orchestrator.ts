import { setTimeout as sleep } from "node:timers/promises";
import { logger } from "./lib/logger.js";
import { runAnalyst } from "./agents/analyst.js";
import { runRiskManager, type RiskVerdict } from "./agents/risk-manager.js";
import { runTrader } from "./agents/trader.js";
import { runAccountant } from "./agents/accountant.js";
import { isKillSwitchActive } from "./guardrails.js";
import { runPrefilter } from "./lib/prefilter.js";
import { logAgentCall } from "./lib/agent-log.js";
import { getActivePortfolio } from "./lib/portfolio.js";

const CYCLE_INTERVAL_MS = Number(process.env.CYCLE_INTERVAL_MS ?? 180_000);

export async function startOrchestrator() {
  logger.info({ intervalMs: CYCLE_INTERVAL_MS }, "orchestrator.start");

  while (true) {
    try {
      await runCycle();
    } catch (err) {
      logger.error({ err }, "cycle.failed");
    }
    await sleep(CYCLE_INTERVAL_MS);
  }
}

export async function runCycle() {
  if (await isKillSwitchActive()) {
    logger.warn("kill-switch active — skipping cycle");
    return;
  }

  const pre = await runPrefilter();
  if (!pre.shouldRunAnalyst) {
    logger.info({ summary: pre.summary }, "prefilter.skip");
    const portfolio = await getActivePortfolio();
    await logAgentCall({
      portfolioId: portfolio?.id ?? null,
      role: "ORCHESTRATOR",
      phase: "SCAN",
      toolName: "prefilter",
      input: { symbols: pre.snapshots.map((s) => s.symbol) },
      output: { skipped: true, summary: pre.summary, snapshots: pre.snapshots },
      reasoningMd: `Prefilter: ${pre.summary}`,
      level: "info",
    });
    return;
  }

  logger.info({ candidates: pre.candidates, summary: pre.summary }, "prefilter.trigger");

  const signals = await runAnalyst();
  if (signals.length === 0) {
    logger.debug("analyst: no signals");
    return;
  }

  const preCheck: RiskVerdict = await runRiskManager({ phase: "pre-cycle" });
  if (!preCheck.allow) {
    logger.info({ reason: preCheck.reason }, "risk.pre-cycle.blocked");
    return;
  }

  const proposal = await runTrader({ signals, riskConstraints: preCheck.constraints });
  if (!proposal) return;

  const postCheck = await runRiskManager({ phase: "pre-execution", proposal });
  if (!postCheck.allow) {
    logger.info({ reason: postCheck.reason, proposal }, "risk.pre-execution.blocked");
    return;
  }

  const executed = await runTrader.execute(proposal);
  if (!executed) return;
  await runAccountant.recordTrade(executed);
}
