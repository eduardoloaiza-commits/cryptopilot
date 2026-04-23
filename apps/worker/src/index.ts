import dotenv from "dotenv";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const SRC_DIR = path.dirname(__filename);
const REPO_ROOT = path.resolve(SRC_DIR, "..", "..", "..");
dotenv.config({ path: path.join(REPO_ROOT, ".env.local"), quiet: true });
dotenv.config({ path: path.join(REPO_ROOT, ".env"), quiet: true });

import { logger } from "./lib/logger.js";
import { startOrchestrator } from "./orchestrator.js";
import { startScheduler } from "./scheduler.js";
import { ensurePortfolio } from "./lib/portfolio.js";

async function main() {
  logger.info({ mode: process.env.MODE }, "CryptoPilot worker starting");

  const portfolio = await ensurePortfolio();
  logger.info(
    { portfolioId: portfolio.id, equity: portfolio.currentEquity.toString() },
    "portfolio.ready",
  );

  startScheduler();
  await startOrchestrator();
}

main().catch((err) => {
  logger.fatal({ err }, "Worker crashed");
  process.exit(1);
});
