import { prisma } from "../../utils/prisma";
import { AppError } from "../../utils/errorHandler";
import { CreateScheduleParsed, UpdateScheduleParsed } from "./validation";
import { getCache, setCache, invalidateScheduleCache } from "../../utils/redis";
import { checkScheduleOverlap } from "./scheduleCopy";

export { copySchedules } from "./scheduleCopy";
export { holdSeats, releaseSeats } from "./scheduleSeatManager";

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

export const createSchedule = async (input: CreateScheduleParsed) => {
  // Fetch movie to get duration
  const movie = await prisma.movie.findUnique({
    where: { id: input.movieId },
  });
  if (!movie) throw new AppError("NOT_FOUND", "Movie not found");

  const studio = await prisma.studio.findUnique({
    where: { id: input.studioId },
  });
  if (!studio) throw new AppError("NOT_FOUND", "Studio not found");

  const startTime = new Date(input.startTime);
  let endTime: Date | null = null;
  if (movie.durationMinutes) {
    endTime = new Date(startTime.getTime() + movie.durationMinutes * 60 * 1000);
  }

  // Overlap check
  const isOverlapping = await checkScheduleOverlap(input.studioId, startTime, endTime);
  if (isOverlapping) {
    throw new AppError(
      "CONFLICT",
      "Schedule overlaps with another existing schedule in this studio"
    );
  }

  const businessDate = new Date(startTime);
  businessDate.setHours(0, 0, 0, 0);

  const schedule = await prisma.showtime.create({
    data: {
      movieId: input.movieId,
      studioId: input.studioId,
      businessDate,
      startTime,
      endTime,
      ticketPrice: input.ticketPrice,
      status: input.status || "DRAFT",
    },
    include: {
      movie: true,
      studio: true,
    },
  });

  await invalidateScheduleCache();

  return schedule;
};

export const updateSchedule = async (id: string, input: UpdateScheduleParsed) => {
  const existing = await prisma.showtime.findUnique({
    where: { id },
    include: { movie: true },
  });
  if (!existing) throw new AppError("NOT_FOUND", "Schedule not found");

  const movieId = input.movieId || existing.movieId;
  const studioId = input.studioId || existing.studioId;

  let movie = existing.movie;
  if (input.movieId && input.movieId !== existing.movieId) {
    const foundMovie = await prisma.movie.findUnique({
      where: { id: input.movieId },
    });
    if (!foundMovie) throw new AppError("NOT_FOUND", "Movie not found");
    movie = foundMovie;
  }

  const startTime = input.startTime ? new Date(input.startTime) : existing.startTime;
  let endTime = existing.endTime;

  if (input.startTime || (input.movieId && input.movieId !== existing.movieId)) {
    if (movie.durationMinutes) {
      endTime = new Date(startTime.getTime() + movie.durationMinutes * 60 * 1000);
    }
  }

  // Overlap check (excluding self)
  const isOverlapping = await checkScheduleOverlap(studioId, startTime, endTime, id);
  if (isOverlapping) {
    throw new AppError(
      "CONFLICT",
      "Schedule overlaps with another existing schedule in this studio"
    );
  }

  let businessDate = existing.businessDate;
  if (input.startTime) {
    businessDate = new Date(startTime);
    businessDate.setHours(0, 0, 0, 0);
  }

  const schedule = await prisma.showtime.update({
    where: { id },
    data: {
      ...(input.movieId && { movieId: input.movieId }),
      ...(input.studioId && { studioId: input.studioId }),
      ...(input.startTime && { startTime, businessDate }),
      ...(endTime && { endTime }),
      ...(input.ticketPrice !== undefined && { ticketPrice: input.ticketPrice }),
      ...(input.status && { status: input.status }),
    },
    include: {
      movie: true,
      studio: true,
    },
  });

  await invalidateScheduleCache();

  return schedule;
};

export const deleteSchedule = async (id: string) => {
  const existing = await prisma.showtime.findUnique({
    where: { id },
    include: {
      orders: true,
    },
  });
  if (!existing) throw new AppError("NOT_FOUND", "Schedule not found");

  if (existing.orders.length > 0) {
    throw new AppError(
      "BAD_REQUEST",
      "Cannot delete schedule because tickets or orders have already been issued"
    );
  }

  await prisma.showtimeSeat.deleteMany({
    where: { showtimeId: id },
  });

  await prisma.showtime.delete({
    where: { id },
  });

  await invalidateScheduleCache();

  return true;
};

export const getScheduleSeats = async (scheduleId: string, isAdmin = false) => {
  const schedule = await prisma.showtime.findUnique({
    where: { id: scheduleId },
    include: { studio: true },
  });
  if (!schedule) throw new AppError("NOT_FOUND", "Schedule not found");

  // Fetch all physical seats in studio
  const studioSeats = await prisma.seat.findMany({
    where: { studioId: schedule.studioId },
  });

  const seatInclude: any = {
    seat: true,
    ...(isAdmin && {
      ticket: {
        include: {
          order: {
            select: {
              channel: true,
              bookingNumber: true,
              cashierId: true,
              orderNumber: true,
            },
          },
        },
      },
    }),
  };

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
