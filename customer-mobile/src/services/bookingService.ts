import { request } from "./api";
import { CreateBookingRequest, CreateBookingResponse, Order } from "../types/booking";

export const bookingService = {
  async holdSeats(scheduleId: string, seatIds: string[]): Promise<{ reservedUntil: string }> {
    return request<{ reservedUntil: string }>(`/bookings/schedules/${scheduleId}/hold`, {
      method: "POST",
      body: JSON.stringify({ seatIds }),
    });
  },

  async releaseSeats(scheduleId: string, seatIds: string[]): Promise<null> {
    return request<null>(`/bookings/schedules/${scheduleId}/release`, {
      method: "POST",
      body: JSON.stringify({ seatIds }),
    });
  },

  async createBooking(data: CreateBookingRequest): Promise<CreateBookingResponse> {
    return request<CreateBookingResponse>("/bookings", {
      method: "POST",
      body: JSON.stringify(data),
    });
  },

  async lookupBookings(query: string): Promise<Order[]> {
    return request<Order[]>(`/bookings/lookup?query=${encodeURIComponent(query)}`);
  },
};
