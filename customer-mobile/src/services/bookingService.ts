import { request } from "./api";
import { CreateBookingRequest, CreateBookingResponse, Order } from "../types/booking";
import { bookingApi } from "../lib/api/bookingApi";
import { store } from "../lib/store/store";

export const bookingService = {
  async holdSeats(scheduleId: string, seatIds: string[]): Promise<{ reservedUntil: string }> {
    const result = await store.dispatch(
      bookingApi.endpoints.holdSeats.initiate({ scheduleId, seatIds })
    );
    if ("data" in result && result.data) {
      return result.data;
    }
    return request<{ reservedUntil: string }>(`/bookings/schedules/${scheduleId}/hold`, {
      method: "POST",
      body: JSON.stringify({ seatIds }),
    });
  },

  async releaseSeats(scheduleId: string, seatIds: string[]): Promise<null> {
    const result = await store.dispatch(
      bookingApi.endpoints.releaseSeats.initiate({ scheduleId, seatIds })
    );
    if ("data" in result) {
      return result.data ?? null;
    }
    return request<null>(`/bookings/schedules/${scheduleId}/release`, {
      method: "POST",
      body: JSON.stringify({ seatIds }),
    });
  },

  async createBooking(data: CreateBookingRequest): Promise<CreateBookingResponse> {
    const result = await store.dispatch(
      bookingApi.endpoints.createBooking.initiate(data)
    );
    if ("data" in result && result.data) {
      return result.data;
    }
    return request<CreateBookingResponse>("/bookings", {
      method: "POST",
      body: JSON.stringify(data),
    });
  },

  async lookupBookings(query: string): Promise<Order[]> {
    const result = await store.dispatch(
      bookingApi.endpoints.lookupBookings.initiate(query, { subscribe: false, forceRefetch: true })
    );
    if (result.data) {
      return result.data;
    }
    return request<Order[]>(`/bookings/lookup?query=${encodeURIComponent(query)}`);
  },
};
