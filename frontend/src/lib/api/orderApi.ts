import { api } from "./api";

export interface Order {
  id: string;
  orderNumber: string;
  bookingNumber?: string | null;
  cashierId?: string | null;
  scheduleId: string;
  branchId: string;
  totalAmount: number;
  paymentMethod: "CASH" | "QRIS";
  paymentStatus: "PENDING" | "PAID" | "FAILED" | "REFUNDED";
  orderStatus: "PENDING" | "PAID" | "CANCELLED" | "REFUNDED";
  customerName?: string | null;
  customerPhone?: string | null;
  customerEmail?: string | null;
  createdAt: string;
  cashier?: { id: string; name: string; username: string } | null;
  schedule: {
    id: string;
    startTime: string;
    businessDate: string;
    movie: { id: string; title: string };
    studio: { id: string; name: string; code: string };
  };
  tickets: Ticket[];
}

export interface Ticket {
  id: string;
  ticketNumber: string;
  orderId: string;
  showtimeSeatId: string;
  qrCode: string;
  status: "ACTIVE" | "USED" | "CANCELLED";
  createdAt: string;
  order?: Order;
  showtimeSeat?: {
    id: string;
    showtime: {
      id: string;
      startTime: string;
      businessDate: string;
      movie: { id: string; title: string };
      studio: { id: string; name: string; code: string };
    };
    seat: {
      id: string;
      row: string;
      column: number;
      seatNumber: number;
      seatLabel: string;
      seatType: string;
    };
  };
}

export interface CheckoutResult {
  order: Order;
  tickets: Ticket[];
}

export interface ApiResponse<T> {
  status: string;
  message: string;
  data: T;
  meta?: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

export const orderApi = api.injectEndpoints({
  endpoints: (builder) => ({
    getOrders: builder.query<ApiResponse<Order[]>, { page?: number; limit?: number; search?: string; cashierId?: string; startDate?: string; endDate?: string }>({
      query: (params) => ({
        url: "/orders",
        params,
      }),
      providesTags: ["Schedule", "Seat"],
    }),
    getOrderById: builder.query<ApiResponse<Order>, string>({
      query: (id) => `/orders/${id}`,
    }),
    checkoutOrder: builder.mutation<ApiResponse<CheckoutResult>, { scheduleId: string; seatIds: string[]; paymentMethod: "CASH" | "QRIS"; amountReceived?: number | null }>({
      query: (body) => ({
        url: "/orders/checkout",
        method: "POST",
        body,
      }),
      invalidatesTags: ["Seat", "Studio", "Schedule"],
    }),
    validateTicket: builder.mutation<ApiResponse<{ status: "VALID" | "USED" | "CANCELLED" | "NOT_FOUND"; ticket: Ticket | null }>, string>({
      query: (ticketNumber) => ({
        url: "/tickets/validate",
        method: "POST",
        body: { ticketNumber },
      }),
      invalidatesTags: ["Seat"],
    }),
  }),
});

export const {
  useGetOrdersQuery,
  useGetOrderByIdQuery,
  useCheckoutOrderMutation,
  useValidateTicketMutation,
} = orderApi;
