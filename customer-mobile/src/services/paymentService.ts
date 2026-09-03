import { request } from "./api";
import { Order, Payment } from "../types/booking";
import { paymentApi, SnapTransactionResponse, PaymentStatusResponse } from "../lib/api/paymentApi";
import { store } from "../lib/store/store";

export type { SnapTransactionResponse, PaymentStatusResponse };

export const paymentService = {
  async createSnapToken(orderId: string): Promise<SnapTransactionResponse> {
    const result = await store.dispatch(
      paymentApi.endpoints.createSnapToken.initiate(orderId)
    );
    if ("data" in result && result.data) {
      return result.data;
    }
    return request<SnapTransactionResponse>(`/payments/midtrans/snap/${orderId}`, {
      method: "POST",
    });
  },

  async getPaymentStatus(orderId: string): Promise<PaymentStatusResponse> {
    const result = await store.dispatch(
      paymentApi.endpoints.getPaymentStatus.initiate(orderId, { subscribe: false, forceRefetch: true })
    );
    if (result.data) {
      return result.data;
    }
    return request<PaymentStatusResponse>(`/payments/status/${orderId}`);
  },
};
