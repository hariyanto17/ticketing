import { Showtime, ShowtimeSeat } from "./schedule";

export interface Ticket {
  id: string;
  ticketNumber: string;
  orderId: string;
  showtimeSeatId: string;
  qrCode: string;
  status: "ACTIVE" | "PENDING" | "USED" | "CANCELLED";
  createdAt: string;
  showtimeSeat?: ShowtimeSeat;
}

export interface Payment {
  id: string;
  orderId: string;
  amount: number;
  status: "PENDING" | "PAID" | "FAILED" | "REFUNDED";
  paidAt?: string | null;
  provider?: string;
  paymentType?: string | null;
  providerTransactionId?: string | null;
  snapToken?: string | null;
  redirectUrl?: string | null;
  expiredAt?: string | null;
}

export interface Order {
  id: string;
  orderNumber: string;
  bookingNumber?: string | null;
  scheduleId: string;
  branchId: string;
  totalAmount: number;
  paymentMethod: string;
  paymentStatus: "PENDING" | "PAID" | "FAILED" | "REFUNDED";
  orderStatus: "PENDING" | "PAID" | "CANCELLED" | "REFUNDED";
  customerName?: string | null;
  customerPhone?: string | null;
  customerEmail?: string | null;
  createdAt: string;
  schedule?: Showtime;
  tickets?: Ticket[];
  payments?: Payment[];
}

export interface CreateBookingRequest {
  scheduleId: string;
  seatIds: string[];
  customerName: string;
  customerPhone: string;
  customerEmail?: string;
}

export interface CreateBookingResponse {
  order: Order;
  tickets: Ticket[];
  payment?: Payment;
}
