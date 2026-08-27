import { api } from "./api";
import { Movie } from "./movieApi";
import { Schedule, ShowtimeSeat } from "./studioApi";
import { Order, Ticket } from "./orderApi";

export interface BookingResponse {
  order: Order;
  tickets: Ticket[];
}

export const bookingApi = api.injectEndpoints({
  endpoints: (builder) => ({
    getPublicMovies: builder.query<{ success: boolean; data: Movie[] }, { status?: string; startDate?: string; hasSchedule?: boolean } | void>({
      query: (params) => {
        const queryParams = new URLSearchParams();
        if (params?.status) queryParams.append("status", params.status);
        if (params?.startDate) queryParams.append("startDate", params.startDate);
        if (params?.hasSchedule !== undefined) queryParams.append("hasSchedule", String(params.hasSchedule));
        const queryStr = queryParams.toString() ? `?${queryParams.toString()}` : "";
        return `/bookings/movies${queryStr}`;
      },
    }),
    getPublicMovieById: builder.query<{ success: boolean; data: Movie }, string>({
      query: (id) => `/bookings/movies/${id}`,
    }),
    getPublicSchedules: builder.query<{ success: boolean; data: Schedule[] }, { movieId?: string; startDate?: string } | void>({
      query: (params) => {
        const queryParams = new URLSearchParams();
        if (params?.movieId) queryParams.append("movieId", params.movieId);
        if (params?.startDate) queryParams.append("startDate", params.startDate);
        const queryStr = queryParams.toString() ? `?${queryParams.toString()}` : "";
        return `/bookings/schedules${queryStr}`;
      },
      providesTags: ["Schedule"],
    }),
    getPublicSeats: builder.query<{ success: boolean; data: ShowtimeSeat[] }, string>({
      query: (scheduleId) => `/bookings/schedules/${scheduleId}/seats`,
      providesTags: ["Seat"],
    }),
    holdPublicSeats: builder.mutation<{ success: boolean }, { scheduleId: string; seatIds: string[] }>({
      query: ({ scheduleId, seatIds }) => ({
        url: `/bookings/schedules/${scheduleId}/hold`,
        method: "POST",
        body: { seatIds },
      }),
      invalidatesTags: ["Seat"],
    }),
    releasePublicSeats: builder.mutation<{ success: boolean }, { scheduleId: string; seatIds: string[] }>({
      query: ({ scheduleId, seatIds }) => ({
        url: `/bookings/schedules/${scheduleId}/release`,
        method: "POST",
        body: { seatIds },
      }),
      invalidatesTags: ["Seat"],
    }),
    createBooking: builder.mutation<BookingResponse, { scheduleId: string; seatIds: string[]; customerName: string; customerPhone: string; customerEmail?: string }>({
      query: (body) => ({
        url: "/bookings",
        method: "POST",
        body,
      }),
      transformResponse: (response: any) => response.data,
      invalidatesTags: ["Seat", "Schedule"],
    }),
    lookupBooking: builder.query<Order[], string>({
      query: (queryVal) => `/bookings/lookup?query=${queryVal}`,
      transformResponse: (response: any) => response.data,
    }),

    // Admin endpoints
    getAdminBookings: builder.query<Order[], void>({
      query: () => "/bookings/admin/list",
      transformResponse: (response: any) => response.data,
      providesTags: ["Schedule"],
    }),
    confirmBookingPayment: builder.mutation<Order, string>({
      query: (id) => ({
        url: `/bookings/admin/${id}/payment`,
        method: "PUT",
      }),
      transformResponse: (response: any) => response.data,
      invalidatesTags: ["Schedule"],
    }),
    cancelBooking: builder.mutation<Order, string>({
      query: (id) => ({
        url: `/bookings/admin/${id}/cancel`,
        method: "PUT",
      }),
      transformResponse: (response: any) => response.data,
      invalidatesTags: ["Schedule"],
    }),
  }),
});

export const {
  useGetPublicMoviesQuery,
  useGetPublicMovieByIdQuery,
  useGetPublicSchedulesQuery,
  useGetPublicSeatsQuery,
  useHoldPublicSeatsMutation,
  useReleasePublicSeatsMutation,
  useCreateBookingMutation,
  useLookupBookingQuery,
  useLazyLookupBookingQuery,
  useGetAdminBookingsQuery,
  useConfirmBookingPaymentMutation,
  useCancelBookingMutation,
} = bookingApi;
