import { prisma } from "../../utils/prisma";
import { CopySchedulesParsed } from "./validation";
import { invalidateScheduleCache } from "../../utils/redis";

export const checkScheduleOverlap = async (
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
      startTime: { lt: endTime },
    },
  });

  return !!overlap;
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
    const isOverlapping = await checkScheduleOverlap(src.studioId, newStartTime, newEndTime);
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
