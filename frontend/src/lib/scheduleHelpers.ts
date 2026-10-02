import { Schedule } from "@/services/studioApi";

export interface DingdongConflict {
  prevMovie: string;
  prevEndTimeStr: string;
}

/**
 * Calculates if there is an audio conflict between the dingdong announcement
 * (-15 minutes before showtime) and the previous showing in the same studio.
 */
export const getDingdongConflict = (
  schedule: Schedule,
  allSchedulesInStudio: Schedule[]
): DingdongConflict | null => {
  const currentStart = new Date(schedule.startTime).getTime();
  if (isNaN(currentStart)) return null;
  const currentDingdong = currentStart - 15 * 60 * 1000;

  for (const prev of allSchedulesInStudio) {
    if (prev.id === schedule.id) continue;
    const prevStart = new Date(prev.startTime).getTime();
    if (isNaN(prevStart) || prevStart >= currentStart) continue;

    let prevEnd = prev.endTime ? new Date(prev.endTime).getTime() : NaN;
    if (isNaN(prevEnd) && prev.movie?.durationMinutes) {
      prevEnd = prevStart + prev.movie.durationMinutes * 60 * 1000;
    }

    if (!isNaN(prevEnd) && currentDingdong < prevEnd && currentDingdong >= prevStart) {
      return {
        prevMovie: prev.movie?.title || "Film sebelumnya",
        prevEndTimeStr: new Date(prevEnd).toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
          hour12: false,
        }),
      };
    }
  }
  return null;
};

export const getDefaultScheduleStartTime = (): string => {
  const now = new Date();
  const targetDate = new Date(now);

  if (now.getHours() >= 21) {
    targetDate.setDate(targetDate.getDate() + 1);
    targetDate.setHours(10, 0, 0, 0);
  } else {
    const currentMinutes = now.getMinutes();
    if (currentMinutes > 30) {
      targetDate.setHours(now.getHours() + 1, 0, 0, 0);
    } else {
      targetDate.setMinutes(30, 0, 0);
    }
  }

  const year = targetDate.getFullYear();
  const month = String(targetDate.getMonth() + 1).padStart(2, "0");
  const day = String(targetDate.getDate()).padStart(2, "0");
  const hours = String(targetDate.getHours()).padStart(2, "0");
  const minutes = String(targetDate.getMinutes()).padStart(2, "0");

  return `${year}-${month}-${day}T${hours}:${minutes}`;
};
