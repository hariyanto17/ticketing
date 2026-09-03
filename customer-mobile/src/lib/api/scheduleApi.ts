import { baseApi } from "./baseApi";
import { Showtime, ShowtimeSeat } from "../../types/schedule";

export interface GetSchedulesParams {
  movieId?: string;
  studioId?: string;
  startDate?: string;
}

export const scheduleApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getSchedules: builder.query<Showtime[], GetSchedulesParams | void>({
      query: (params) => {
        const query = new URLSearchParams();
        if (params?.movieId) query.append("movieId", params.movieId);
        if (params?.studioId) query.append("studioId", params.studioId);
        if (params?.startDate) query.append("startDate", params.startDate);

        const queryString = query.toString();
        return {
          url: `/bookings/schedules${queryString ? `?${queryString}` : ""}`,
        };
      },
      providesTags: (result) =>
        result
          ? [
              ...result.map(({ id }) => ({ type: "Schedule" as const, id })),
              { type: "Schedule", id: "LIST" },
            ]
          : [{ type: "Schedule", id: "LIST" }],
    }),

    getScheduleSeats: builder.query<ShowtimeSeat[], string>({
      query: (scheduleId) => `/bookings/schedules/${scheduleId}/seats`,
      providesTags: (result, error, scheduleId) => [
        { type: "Seat", id: scheduleId },
      ],
    }),
  }),
});

export const {
  useGetSchedulesQuery,
  useLazyGetSchedulesQuery,
  useGetScheduleSeatsQuery,
  useLazyGetScheduleSeatsQuery,
} = scheduleApi;
