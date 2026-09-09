import cron from "node-cron";
import { importMovies } from "./importService";

/**
 * Runs the automated movie import job.
 */
export const runMovieImportJob = async () => {
  const timestamp = new Date().toISOString();
  console.log(`[MovieScheduler ${timestamp}] Starting scheduled movie import (21Cineplex BOTH)...`);

  try {
    const summary = await importMovies({
      source: "21CINEPLEX",
      type: "BOTH",
      cityId: process.env.DEFAULT_IMPORT_CITY_ID || "10",
    });

    console.log(
      `[MovieScheduler ${new Date().toISOString()}] Import completed successfully: ` +
      `Total: ${summary.total}, Created: ${summary.created}, Updated: ${summary.updated}, Skipped: ${summary.skipped}, Failed: ${summary.failed}`
    );

    if (summary.failures.length > 0) {
      console.warn(`[MovieScheduler] Failures encountered:`, summary.failures);
    }

    return summary;
  } catch (error) {
    console.error(`[MovieScheduler ${new Date().toISOString()}] Error during scheduled movie import:`, error);
    return null;
  }
};

/**
 * Initializes daily movie import cron job at 10:00 AM (10:00) every day.
 */
export const initMovieScheduler = () => {
  // '0 10 * * *' = at 10:00 AM every day
  const cronExpression = "0 10 * * *";
  const timezone = process.env.TZ || "Asia/Jakarta";

  const task = cron.schedule(
    cronExpression,
    async () => {
      await runMovieImportJob();
    },
    {
      timezone,
    }
  );

  console.log(`[MovieScheduler] Initialized daily movie import schedule at 10:00 AM (timezone: ${timezone})`);
  return task;
};
