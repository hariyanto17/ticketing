import { prisma } from "../../utils/prisma";
import { AppError } from "../../utils/errorHandler";
import { emitSeatUpdate } from "../../utils/socket";
import { invalidateScheduleSeatCache } from "../../utils/redis";

export const holdSeats = async (scheduleId: string, seatIds: string[], minutes = 10) => {
  const now = new Date();
  const reservedUntil = new Date(now.getTime() + minutes * 60 * 1000);

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

  await invalidateScheduleSeatCache(scheduleId);
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

  await invalidateScheduleSeatCache(scheduleId);
  emitSeatUpdate("seats_released", { showtimeId: scheduleId, seatIds });

  return true;
};

