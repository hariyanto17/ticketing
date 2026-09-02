import { request } from "./api";
import { Showtime, ShowtimeSeat } from "../types/schedule";

export const scheduleService = {
  async getSchedules(params?: { movieId?: string; studioId?: string; startDate?: string }): Promise<Showtime[]> {
    const query = new URLSearchParams();
    if (params?.movieId) query.append("movieId", params.movieId);
    if (params?.studioId) query.append("studioId", params.studioId);
    if (params?.startDate) query.append("startDate", params.startDate);

    const endpoint = `/bookings/schedules${query.toString() ? `?${query.toString()}` : ""}`;
    return request<Showtime[]>(endpoint);
  },

  async getScheduleSeats(scheduleId: string): Promise<ShowtimeSeat[]> {
    return request<ShowtimeSeat[]>(`/bookings/schedules/${scheduleId}/seats`);
  },
};
