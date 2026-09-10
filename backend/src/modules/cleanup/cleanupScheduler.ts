import cron from "node-cron";
import { runDataCleanupJob } from "./cleanupService";

/**
 * Initializes daily cleanup cron job at 02:00 AM every day.
 * - Deletes movies with 0 schedules after 2 months (60 days) of creation
 * - Deletes schedules with 0 transactions after 1 month (30 days) of creation
 */
export const initCleanupScheduler = () => {
  // '0 2 * * *' = at 02:00 AM every day
  const cronExpression = process.env.CLEANUP_CRON_SCHEDULE || "0 2 * * *";
  const timezone = process.env.TZ || "Asia/Jakarta";

  const task = cron.schedule(
    cronExpression,
    async () => {
      try {
        await runDataCleanupJob();
      } catch (err) {
        console.error("[CleanupScheduler] Error during scheduled cleanup execution:", err);
      }
    },
    {
      timezone,
    }
  );

  console.log(`[CleanupScheduler] Initialized daily cleanup schedule at "${cronExpression}" (timezone: ${timezone})`);
  return task;
};
