import { prisma } from "../../utils/prisma";
import { delCacheByPattern, invalidateScheduleCache } from "../../utils/redis";

export interface CleanupResult {
  deletedMoviesCount: number;
  deletedMovies: Array<{ id: string; title: string; createdAt: Date }>;
  deletedSchedulesCount: number;
  deletedSchedules: Array<{ id: string; studioId: string; movieId: string; startTime: Date; createdAt: Date }>;
}

/**
 * Cleans up:
 * 1. Movies without any schedules after 2 months (60 days) of creation.
 * 2. Schedules without any orders/transactions after 1 month (30 days) of creation.
 */
export const runDataCleanupJob = async (): Promise<CleanupResult> => {
  const now = new Date();

  // 1. Calculate threshold dates
  const twoMonthsAgo = new Date(now);
  twoMonthsAgo.setDate(twoMonthsAgo.getDate() - 60);

  const oneMonthAgo = new Date(now);
  oneMonthAgo.setDate(oneMonthAgo.getDate() - 30);

  console.log(
    `[DataCleanup ${now.toISOString()}] Running cleanup job... ` +
    `Threshold Movies (no schedules): <= ${twoMonthsAgo.toISOString()}, ` +
    `Threshold Schedules (no transactions): <= ${oneMonthAgo.toISOString()}`
  );

  // 2. Find and delete schedules with no orders created > 1 month (30 days) ago
  const candidateSchedules = await prisma.showtime.findMany({
    where: {
      createdAt: { lte: oneMonthAgo },
      orders: { none: {} },
    },
    select: {
      id: true,
      studioId: true,
      movieId: true,
      startTime: true,
      createdAt: true,
    },
  });

  const deletedSchedules: Array<{ id: string; studioId: string; movieId: string; startTime: Date; createdAt: Date }> = [];

  for (const schedule of candidateSchedules) {
    try {
      // Delete associated showtime seats first
      await prisma.showtimeSeat.deleteMany({
        where: { showtimeId: schedule.id },
      });

      // Delete the showtime
      await prisma.showtime.delete({
        where: { id: schedule.id },
      });

      deletedSchedules.push(schedule);
    } catch (err) {
      console.error(`[DataCleanup] Failed to delete schedule ${schedule.id}:`, err);
    }
  }

  if (deletedSchedules.length > 0) {
    await invalidateScheduleCache();
  }

  // 3. Find and delete movies with no schedules created > 2 months (60 days) ago
  const candidateMovies = await prisma.movie.findMany({
    where: {
      createdAt: { lte: twoMonthsAgo },
      showtimes: { none: {} },
    },
    select: {
      id: true,
      title: true,
      createdAt: true,
    },
  });

  const deletedMovies: Array<{ id: string; title: string; createdAt: Date }> = [];

  for (const movie of candidateMovies) {
    try {
      // Remove genre associations
      await prisma.movieGenre.deleteMany({
        where: { movieId: movie.id },
      });

      // Delete the movie
      await prisma.movie.delete({
        where: { id: movie.id },
      });

      deletedMovies.push(movie);
    } catch (err) {
      console.error(`[DataCleanup] Failed to delete movie ${movie.title} (${movie.id}):`, err);
    }
  }

  if (deletedMovies.length > 0) {
    await delCacheByPattern("cache:movies:*");
  }

  console.log(
    `[DataCleanup ${new Date().toISOString()}] Cleanup finished: ` +
    `Deleted ${deletedMovies.length} movies without schedules (>2 months old), ` +
    `Deleted ${deletedSchedules.length} schedules without transactions (>1 month old).`
  );

  return {
    deletedMoviesCount: deletedMovies.length,
    deletedMovies,
    deletedSchedulesCount: deletedSchedules.length,
    deletedSchedules,
  };
};
