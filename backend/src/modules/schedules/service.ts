import { prisma } from "../../utils/prisma";
import { AppError } from "../../utils/errorHandler";
import { CreateScheduleParsed, UpdateScheduleParsed, CopySchedulesParsed } from "./validation";
import { getCache, setCache, invalidateScheduleCache } from "../../utils/redis";

export const getAllSchedules = async (query: {
  movieId?: string;
  studioId?: string;
  status?: string;
  startDate?: string;
  endDate?: string;
  minDate?: string;
}) => {
  const cacheKey = `cache:schedules:${JSON.stringify(query)}`;
  const cached = await getCache<any[]>(cacheKey);
  if (cached) {
    return cached;
  }

  const where: any = {};
  if (query.movieId) where.movieId = query.movieId;
  if (query.studioId) where.studioId = query.studioId;
  if (query.status) where.status = query.status;

  const min = query.startDate || query.minDate;
  if (min) {
    const minD = new Date(min);
    minD.setHours(0, 0, 0, 0);
    where.businessDate = { gte: minD };
  }

  if (query.endDate) {
    const maxD = new Date(query.endDate);
    maxD.setHours(23, 59, 59, 999);
    where.businessDate = {
      ...(where.businessDate || {}),
      lte: maxD,
    };
  }

  const schedules = await prisma.showtime.findMany({
    where,
    include: {
      movie: { select: { id: true, title: true, durationMinutes: true, poster: true, censorshipRating: true } },
      studio: { select: { id: true, name: true, code: true, type: true } },
    },
    orderBy: { startTime: "asc" },
  });

  // Cache for 3 minutes (180s)
  await setCache(cacheKey, schedules, 180);

  return schedules;
};

export const getScheduleById = async (id: string) => {
  const cacheKey = `cache:schedule:${id}`;
  const cached = await getCache<any>(cacheKey);
  if (cached) {
    return cached;
  }

  const schedule = await prisma.showtime.findUnique({
    where: { id },
    include: {
      movie: true,
      studio: true,
    },
  });
  if (!schedule) throw new AppError("NOT_FOUND", "Schedule not found");

  await setCache(cacheKey, schedule, 180);

  return schedule;
};

// Check for overlaps in the same studio
const checkOverlap = async (
  studioId: string,
  startTime: Date,
  endTime: Date | null,
  excludeId?: string
) => {
  if (!endTime) return false;

  const overlap = await prisma.showtime.findFirst({
    where: {
      studioId,
      ...(excludeId && { id: { not: excludeId } }),
      endTime: { not: null, gt: startTime },
      // Proposed Start is before Existing End AND Proposed End is after Existing Start
      startTime: { lt: endTime },
    },
  });

  return !!overlap;
};

export const createSchedule = async (input: CreateScheduleParsed) => {
  // Fetch movie to get duration
  const movie = await prisma.movie.findUnique({ where: { id: input.movieId } });
  if (!movie) throw new AppError("NOT_FOUND", "Movie not found");

  // Calculate end time conditionally
  let endTime: Date | null = null;
  if (movie.durationMinutes) {
    const startTimeMs = input.startTime.getTime();
    endTime = new Date(startTimeMs + movie.durationMinutes * 60 * 1000);
  }

  // Fetch settings to get timezone
  const settingsRecords = await prisma.setting.findMany();
  const timezone = settingsRecords.find((s) => s.key === "timezone")?.value || "Asia/Jakarta";

  // Derive business date from startTime in target timezone
  const localDateStr = new Intl.DateTimeFormat("sv-SE", { timeZone: timezone }).format(input.startTime);
  const businessDate = new Date(localDateStr);

  // Check overlap
  const isOverlapping = await checkOverlap(input.studioId, input.startTime, endTime);
  if (isOverlapping) {
    throw new AppError(
      "BAD_REQUEST",
      "Scheduling conflict: There is already a movie scheduled in this studio during this time."
    );
  }

  const created = await prisma.showtime.create({
    data: {
      movieId: input.movieId,
      studioId: input.studioId,
      businessDate,
      startTime: input.startTime,
      endTime,
      ticketPrice: input.ticketPrice,
      status: input.status,
    },
  });

  await invalidateScheduleCache(created.id);
  return created;
};

export const updateSchedule = async (id: string, input: UpdateScheduleParsed) => {
  const schedule = await getScheduleById(id);

  const movieId = input.movieId || schedule.movieId;
  const studioId = input.studioId || schedule.studioId;
  const startTime = input.startTime || schedule.startTime;

  // Fetch movie to calculate endTime
  const movie = await prisma.movie.findUnique({ where: { id: movieId } });
  if (!movie) throw new AppError("NOT_FOUND", "Movie not found");

  let endTime: Date | null = null;
  if (movie.durationMinutes) {
    const startTimeMs = startTime.getTime();
    endTime = new Date(startTimeMs + movie.durationMinutes * 60 * 1000);
  }

  // Fetch settings to get timezone
  const settingsRecords = await prisma.setting.findMany();
  const timezone = settingsRecords.find((s) => s.key === "timezone")?.value || "Asia/Jakarta";

  // Derive business date from startTime in target timezone
  const localDateStr = new Intl.DateTimeFormat("sv-SE", { timeZone: timezone }).format(startTime);
  const businessDate = new Date(localDateStr);

  // Check overlap
  const isOverlapping = await checkOverlap(studioId, startTime, endTime, id);
  if (isOverlapping) {
    throw new AppError(
      "BAD_REQUEST",
      "Scheduling conflict: There is already a movie scheduled in this studio during this time."
    );
  }

  const updated = await prisma.showtime.update({
    where: { id },
    data: {
      movieId,
      studioId,
      businessDate,
      startTime,
      endTime,
      ...(input.ticketPrice !== undefined && { ticketPrice: input.ticketPrice }),
      ...(input.status && { status: input.status }),
    },
  });

  await invalidateScheduleCache(id);
  return updated;
};

export const deleteSchedule = async (id: string) => {
  await getScheduleById(id);
  const deleted = await prisma.showtime.delete({ where: { id } });
  await invalidateScheduleCache(id);
  return deleted;
};

export const getScheduleSeats = async (scheduleId: string) => {
  const schedule = await prisma.showtime.findUnique({
    where: { id: scheduleId },
  });
  if (!schedule) throw new AppError("NOT_FOUND", "Schedule not found");

  const now = new Date();

  // Clear guest bookings expired holds
  try {
    await (require("../bookings/service").cleanupExpiredBookings)();
  } catch (e) {}

  // Clear expired holds for this schedule
  await prisma.showtimeSeat.updateMany({
    where: {
      showtimeId: scheduleId,
      status: "HOLD",
      reservedUntil: { lt: now },
    },
    data: {
      status: "AVAILABLE",
      reservedUntil: null,
    },
  });

  const seatInclude = {
    seat: true,
    ticket: {
      select: {
        id: true,
        ticketNumber: true,
        order: {
          select: {
            id: true,
            channel: true,
            orderNumber: true,
            bookingNumber: true,
            cashierId: true,
          },
        },
      },
    },
  };

  // Get all seats in the studio
  const studioSeats = await prisma.seat.findMany({
    where: { studioId: schedule.studioId },
  });

  // Get current showtime seat allocations
  let showtimeSeats = await prisma.showtimeSeat.findMany({
    where: { showtimeId: scheduleId },
    include: seatInclude,
  });

  // If showtimeSeats are missing (lazy creation), initialize them
  if (showtimeSeats.length < studioSeats.length) {
    const existingSeatIds = new Set(showtimeSeats.map((s) => s.seatId));
    const missingSeats = studioSeats.filter((s) => !existingSeatIds.has(s.id));

    if (missingSeats.length > 0) {
      await prisma.showtimeSeat.createMany({
        data: missingSeats.map((s) => ({
          showtimeId: scheduleId,
          seatId: s.id,
          status: s.status === "DISABLED" ? "DISABLED" : "AVAILABLE",
        })),
      });

      showtimeSeats = await prisma.showtimeSeat.findMany({
        where: { showtimeId: scheduleId },
        include: seatInclude,
      });
    }
  }

  const mappedSeats = showtimeSeats.map((s: any) => {
    let salesChannel: string | null = null;
    if (s.status === "SOLD") {
      const orderChannel = s.ticket?.order?.channel;
      if (orderChannel === "ONLINE" || orderChannel === "MOBILE" || Boolean(s.ticket?.order?.bookingNumber)) {
        salesChannel = "ONLINE";
      } else if (orderChannel === "POS" || Boolean(s.ticket?.order?.cashierId)) {
        salesChannel = "POS";
      } else if (orderChannel) {
        salesChannel = orderChannel;
      } else {
        salesChannel = "POS";
      }
    }

    return {
      ...s,
      salesChannel,
    };
  });

  // Sort seats row-column order for consistent display
  return mappedSeats.sort((a: any, b: any) => {
    if (a.seat.row !== b.seat.row) {
      return a.seat.row.localeCompare(b.seat.row);
    }
    return a.seat.column - b.seat.column;
  });
};

export const holdSeats = async (scheduleId: string, seatIds: string[], minutes = 10) => {
  const now = new Date();
  const reservedUntil = new Date(now.getTime() + minutes * 60 * 1000); // 10 minutes

  // Ensure seats exist for this schedule
  const studioSeats = await prisma.seat.findMany({
    where: { id: { in: seatIds } },
  });

  if (studioSeats.length !== seatIds.length) {
    throw new AppError("BAD_REQUEST", "One or more requested seat IDs do not exist");
  }

  // Ensure ShowtimeSeats records exist for this schedule
  const existingShowtimeSeats = await prisma.showtimeSeat.findMany({
    where: {
      showtimeId: scheduleId,
      seatId: { in: seatIds },
    },
  });

  if (existingShowtimeSeats.length < seatIds.length) {
    const existingIds = new Set(existingShowtimeSeats.map((s) => s.seatId));
    const missing = studioSeats.filter((s) => !existingIds.has(s.id));
    if (missing.length > 0) {
      await prisma.showtimeSeat.createMany({
        data: missing.map((s) => ({
          showtimeId: scheduleId,
          seatId: s.id,
          status: s.status === "DISABLED" ? "DISABLED" : "AVAILABLE",
        })),
        skipDuplicates: true,
      });
    }
  }

  // Atomic conditional update: only update seats that are AVAILABLE or expired HOLD
  const updateResult = await prisma.showtimeSeat.updateMany({
    where: {
      showtimeId: scheduleId,
      seatId: { in: seatIds },
      OR: [
        { status: "AVAILABLE" },
        {
          status: "HOLD",
          reservedUntil: { lt: now },
        },
      ],
    },
    data: {
      status: "HOLD",
      reservedUntil,
    },
  });

  // Verify all requested seats were successfully acquired
  if (updateResult.count !== seatIds.length) {
    // Rollback any seats partially acquired in this batch
    await prisma.showtimeSeat.updateMany({
      where: {
        showtimeId: scheduleId,
        seatId: { in: seatIds },
        status: "HOLD",
        reservedUntil,
      },
      data: {
        status: "AVAILABLE",
        reservedUntil: null,
      },
    });

    throw new AppError(
      "CONFLICT",
      "One or more selected seats are no longer available or already held by another session"
    );
  }

  const { emitSeatUpdate } = require("../../utils/socket");
  emitSeatUpdate("seats_held", { showtimeId: scheduleId, seatIds });

  return { reservedUntil };
};

export const releaseSeats = async (scheduleId: string, seatIds: string[]) => {
  await prisma.showtimeSeat.updateMany({
    where: {
      showtimeId: scheduleId,
      seatId: { in: seatIds },
      status: "HOLD",
    },
    data: {
      status: "AVAILABLE",
      reservedUntil: null,
    },
  });

  const { emitSeatUpdate } = require("../../utils/socket");
  emitSeatUpdate("seats_released", { showtimeId: scheduleId, seatIds });

  return true;
};

export const copySchedules = async (input: CopySchedulesParsed) => {
  // Fetch settings to get timezone
  const settingsRecords = await prisma.setting.findMany();
  const timezone = settingsRecords.find((s) => s.key === "timezone")?.value || "Asia/Jakarta";

  // Target Date string
  let targetDateStr = input.targetDate;
  if (!targetDateStr) {
    targetDateStr = new Intl.DateTimeFormat("sv-SE", { timeZone: timezone }).format(new Date());
  }

  // Source Date string
  let sourceDateStr = input.sourceDate;
  if (!sourceDateStr) {
    // Default to 1 day before targetDate
    const [y, m, d] = targetDateStr.split("-").map(Number);
    const targetDateObj = new Date(Date.UTC(y, m - 1, d));
    const prevDateObj = new Date(targetDateObj.getTime() - 24 * 60 * 60 * 1000);
    sourceDateStr = prevDateObj.toISOString().substring(0, 10);
  }

  const [sy, sm, sd] = sourceDateStr.split("-").map(Number);
  const [ty, tm, td] = targetDateStr.split("-").map(Number);

  const targetBusinessDate = new Date(targetDateStr);

  // Time difference in ms between source day and target day
  const sourceUtcMidnight = Date.UTC(sy, sm - 1, sd);
  const targetUtcMidnight = Date.UTC(ty, tm - 1, td);
  const timeOffsetMs = targetUtcMidnight - sourceUtcMidnight;

  // Query source schedules on source business date
  const sourceMin = new Date(sourceDateStr);
  sourceMin.setHours(0, 0, 0, 0);
  const sourceMax = new Date(sourceDateStr);
  sourceMax.setHours(23, 59, 59, 999);

  const sourceSchedules = await prisma.showtime.findMany({
    where: {
      businessDate: {
        gte: sourceMin,
        lte: sourceMax,
      },
    },
    include: {
      movie: true,
      studio: true,
    },
    orderBy: { startTime: "asc" },
  });

  if (sourceSchedules.length === 0) {
    return {
      sourceDate: sourceDateStr,
      targetDate: targetDateStr,
      totalFound: 0,
      created: 0,
      skipped: 0,
      createdSchedules: [],
      skippedReasons: [],
      message: `Tidak ada jadwal yang ditemukan pada tanggal ${sourceDateStr}`,
    };
  }

  const createdSchedules: any[] = [];
  const skippedReasons: { scheduleId: string; movieTitle: string; studioName: string; reason: string }[] = [];

  for (const src of sourceSchedules) {
    const newStartTime = new Date(src.startTime.getTime() + timeOffsetMs);
    let newEndTime: Date | null = null;
    if (src.movie.durationMinutes) {
      newEndTime = new Date(newStartTime.getTime() + src.movie.durationMinutes * 60 * 1000);
    } else if (src.endTime) {
      newEndTime = new Date(src.endTime.getTime() + timeOffsetMs);
    }

    // Check overlap on target date and studio
    const isOverlapping = await checkOverlap(src.studioId, newStartTime, newEndTime);
    if (isOverlapping) {
      skippedReasons.push({
        scheduleId: src.id,
        movieTitle: src.movie.title,
        studioName: src.studio.name,
        reason: `Jadwal bertabrakan dengan jadwal yang sudah ada di ${src.studio.name} pada jam tersebut`,
      });
      continue;
    }

    const newShowtime = await prisma.showtime.create({
      data: {
        movieId: src.movieId,
        studioId: src.studioId,
        ticketPriceId: src.ticketPriceId,
        businessDate: targetBusinessDate,
        startTime: newStartTime,
        endTime: newEndTime,
        ticketPrice: src.ticketPrice,
        status: input.status || src.status || "DRAFT",
      },
      include: {
        movie: { select: { id: true, title: true, durationMinutes: true, poster: true } },
        studio: { select: { id: true, name: true, code: true } },
      },
    });

    createdSchedules.push(newShowtime);
  }

  if (createdSchedules.length > 0) {
    await invalidateScheduleCache();
  }

  return {
    sourceDate: sourceDateStr,
    targetDate: targetDateStr,
    totalFound: sourceSchedules.length,
    created: createdSchedules.length,
    skipped: skippedReasons.length,
    createdSchedules,
    skippedReasons,
    message: `Berhasil membuat ${createdSchedules.length} jadwal untuk tanggal ${targetDateStr}`,
  };
};

