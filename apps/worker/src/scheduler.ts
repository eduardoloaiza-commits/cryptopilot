import cron from "node-cron";
import { logger } from "./lib/logger.js";
import { runAccountant } from "./agents/accountant.js";
import { runSlTpSweep } from "./lib/sweep.js";
import { finalizePendingRuns } from "./lib/evaluation-run.js";

export function startScheduler() {
  const dailyCron = process.env.DAILY_REPORT_CRON ?? "59 23 * * *";
  const tz = process.env.DAILY_REPORT_TZ ?? "America/Santiago";
  const sweepCron = process.env.SWEEP_CRON ?? "*/1 * * * *";

  cron.schedule(
    dailyCron,
    async () => {
      logger.info("scheduler.dailyReport");
      try {
        await runAccountant.generateDailyReport();
      } catch (err) {
        logger.error({ err }, "dailyReport.failed");
      }
    },
    { timezone: tz },
  );

  cron.schedule(sweepCron, async () => {
    try {
      const res = await runSlTpSweep();
      if (res.closed > 0 || res.checked > 0) {
        logger.info(res, "scheduler.sweep");
      }
    } catch (err) {
      logger.error({ err }, "sweep.failed");
    }
    try {
      const n = await finalizePendingRuns();
      if (n > 0) logger.info({ finalized: n }, "runs.finalized");
    } catch (err) {
      logger.error({ err }, "runs.finalize.failed");
    }
  });

  logger.info({ dailyCron, tz, sweepCron }, "scheduler.started");
}
