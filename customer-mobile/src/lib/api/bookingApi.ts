import { baseApi } from "./baseApi";
import { CreateBookingRequest, CreateBookingResponse, Order } from "../../types/booking";

export interface HoldSeatsRequest {
  scheduleId: string;
  seatIds: string[];
}

export interface HoldSeatsResponse {
  reservedUntil: string;
}

export const bookingApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    holdSeats: builder.mutation<HoldSeatsResponse, HoldSeatsRequest>({
      query: ({ scheduleId, seatIds }) => ({
        url: `/bookings/schedules/${scheduleId}/hold`,
        method: "POST",
        body: { seatIds },
      }),
      invalidatesTags: (result, error, { scheduleId }) => [
        { type: "Seat", id: scheduleId },
      ],
    }),

    releaseSeats: builder.mutation<null, HoldSeatsRequest>({
      query: ({ scheduleId, seatIds }) => ({
        url: `/bookings/schedules/${scheduleId}/release`,
        method: "POST",
        body: { seatIds },
      }),
      invalidatesTags: (result, error, { scheduleId }) => [
        { type: "Seat", id: scheduleId },
      ],
    }),

    createBooking: builder.mutation<CreateBookingResponse, CreateBookingRequest>({
      query: (body) => ({
        url: "/bookings",
        method: "POST",
        body,
      }),
      invalidatesTags: ["Booking", "Seat"],
    }),

    lookupBookings: builder.query<Order[], string>({
      query: (query) => `/bookings/lookup?query=${encodeURIComponent(query)}`,
      providesTags: ["Booking"],
    }),
  }),
});

export const {
  useHoldSeatsMutation,
  useReleaseSeatsMutation,
  useCreateBookingMutation,
  useLookupBookingsQuery,
  useLazyLookupBookingsQuery,
} = bookingApi;
