import { request } from "./api";
import { Showtime, ShowtimeSeat } from "../types/schedule";
import { scheduleApi, GetSchedulesParams } from "../lib/api/scheduleApi";
import { store } from "../lib/store/store";

export const scheduleService = {
  async getSchedules(params?: GetSchedulesParams): Promise<Showtime[]> {
    const result = await store.dispatch(
      scheduleApi.endpoints.getSchedules.initiate(params, { subscribe: false, forceRefetch: true })
    );
    if (result.data) {
      return result.data;
    }
    const query = new URLSearchParams();
    if (params?.movieId) query.append("movieId", params.movieId);
    if (params?.studioId) query.append("studioId", params.studioId);
    if (params?.startDate) query.append("startDate", params.startDate);

    const endpoint = `/bookings/schedules${query.toString() ? `?${query.toString()}` : ""}`;
    return request<Showtime[]>(endpoint);
  },

  async getScheduleSeats(scheduleId: string): Promise<ShowtimeSeat[]> {
    const result = await store.dispatch(
      scheduleApi.endpoints.getScheduleSeats.initiate(scheduleId, { subscribe: false, forceRefetch: true })
    );
    if (result.data) {
      return result.data;
    }
    return request<ShowtimeSeat[]>(`/bookings/schedules/${scheduleId}/seats`);
  },
};
