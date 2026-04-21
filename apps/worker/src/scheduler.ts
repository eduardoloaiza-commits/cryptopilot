import cron from "node-cron";
import { logger } from "./lib/logger.js";
import { runAccountant } from "./agents/accountant.js";
import { runRiskManager } from "./agents/risk-manager.js";

export function startScheduler() {
  const dailyCron = process.env.DAILY_REPORT_CRON ?? "59 23 * * *";
  const tz = process.env.DAILY_REPORT_TZ ?? "America/Santiago";

  cron.schedule(dailyCron, async () => {
    logger.info("Running daily report");
    await runAccountant.generateDailyReport();
  }, { timezone: tz });

  cron.schedule("*/15 * * * *", async () => {
    logger.info("Running SL/TP sweep");
    await runRiskManager({ phase: "sl-tp-sweep" });
  });

  logger.info({ dailyCron, tz }, "Scheduler started");
}
