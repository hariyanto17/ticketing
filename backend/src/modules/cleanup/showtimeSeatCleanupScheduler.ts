import cron from "node-cron";
import { deleteExpiredAvailableShowtimeSeats } from "./cleanupService";

export const initShowtimeSeatCleanupScheduler = () => {
  const cronExpression = "0 1 * * *";
  const timezone = process.env.TZ || "Asia/Jakarta";

  const task = cron.schedule(
    cronExpression,
    async () => {
      try {
        await deleteExpiredAvailableShowtimeSeats();
      } catch (err) {
        console.error("[ShowtimeSeatCleanupScheduler] Error during scheduled cleanup execution:", err);
      }
    },
    { timezone }
  );

  console.log(
    `[ShowtimeSeatCleanupScheduler] Initialized daily cleanup at 01:00 (timezone: ${timezone})`
  );
  return task;
};
