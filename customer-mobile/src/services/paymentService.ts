import { request } from "./api";
import { Order, Payment } from "../types/booking";

export interface SnapTransactionResponse {
  token: string;
  redirect_url: string;
  orderId: string;
  orderNumber: string;
  totalAmount: number;
}

export interface PaymentStatusResponse {
  orderId: string;
  orderNumber: string;
  orderStatus: "PENDING" | "PAID" | "CANCELLED" | "REFUNDED";
  paymentStatus: "PENDING" | "PAID" | "FAILED" | "REFUNDED";
  payments: Payment[];
  tickets: any[];
}

export const paymentService = {
  async createSnapToken(orderId: string): Promise<SnapTransactionResponse> {
    return request<SnapTransactionResponse>(`/payments/midtrans/snap/${orderId}`, {
      method: "POST",
    });
  },

  async getPaymentStatus(orderId: string): Promise<PaymentStatusResponse> {
    return request<PaymentStatusResponse>(`/payments/status/${orderId}`);
  },
};
