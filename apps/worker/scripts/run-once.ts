import dotenv from "dotenv";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const REPO_ROOT = path.resolve(path.dirname(__filename), "..", "..", "..");
dotenv.config({ path: path.join(REPO_ROOT, ".env.local"), quiet: true });

import { ensurePortfolio } from "../src/lib/portfolio.js";
import { runAnalyst } from "../src/agents/analyst.js";
import { runRiskManager } from "../src/agents/risk-manager.js";
import { runTrader } from "../src/agents/trader.js";
import { runAccountant } from "../src/agents/accountant.js";
import { isKillSwitchActive } from "../src/guardrails.js";
import { logger } from "../src/lib/logger.js";

async function main() {
  logger.info({ mode: process.env.MODE }, "run-once: starting single cycle");
  const portfolio = await ensurePortfolio();
  logger.info({ portfolioId: portfolio.id, equity: portfolio.currentEquity.toString() }, "portfolio.ready");

  if (await isKillSwitchActive()) {
    logger.warn("kill-switch active — aborting");
    return;
  }

  const signals = await runAnalyst();
  logger.info({ count: signals.length }, "signals.received");
  if (signals.length === 0) {
    logger.info("no signals → cycle done");
    return;
  }

  const preCheck = await runRiskManager({ phase: "pre-cycle" });
  logger.info({ verdict: preCheck }, "pre-cycle verdict");
  if (!preCheck.allow) return;

  const proposal = await runTrader({ signals, riskConstraints: preCheck.constraints });
  if (!proposal) {
    logger.info("trader: no proposal");
    return;
  }

  const postCheck = await runRiskManager({ phase: "pre-execution", proposal });
  logger.info({ verdict: postCheck }, "pre-execution verdict");
  if (!postCheck.allow) return;

  const executed = await runTrader.execute(proposal);
  if (!executed) {
    logger.warn("execute returned null");
    return;
  }
  await runAccountant.recordTrade(executed);
  logger.info({ tradeId: executed.tradeId }, "cycle: done");
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => process.exit(0));
