import "dotenv/config";
import { logger } from "./lib/logger.js";
import { startOrchestrator } from "./orchestrator.js";
import { startScheduler } from "./scheduler.js";

async function main() {
  logger.info({ mode: process.env.MODE }, "CryptoPilot worker starting");

  startScheduler();
  await startOrchestrator();
}

main().catch((err) => {
  logger.fatal({ err }, "Worker crashed");
  process.exit(1);
});
