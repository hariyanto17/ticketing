import { baseApi } from "./baseApi";
import { Payment } from "../../types/booking";

export interface QrisPaymentResponse {
  orderId: string;
  orderNumber: string;
  paymentId: string;
  status: "PENDING" | "PAID" | "FAILED";
  amount: number;
  qrUrl: string;
  qrString: string;
  expiredAt: string;
}

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
  qrUrl?: string;
  qrString?: string;
  expiredAt?: string;
}

export const paymentApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    // 1. Direct Midtrans Core API QRIS Payment (Primary Guest Flow)
    createQrisPayment: builder.mutation<QrisPaymentResponse, string>({
      query: (orderId) => ({
        url: `/payments/qris/${orderId}`,
        method: "POST",
      }),
      invalidatesTags: (result, error, orderId) => [{ type: "Payment", id: orderId }],
    }),

    // 2. Midtrans Snap Token Generation (Legacy/Admin)
    createSnapToken: builder.mutation<SnapTransactionResponse, string>({
      query: (orderId) => ({
        url: `/payments/midtrans/snap/${orderId}`,
        method: "POST",
      }),
      invalidatesTags: (result, error, orderId) => [{ type: "Payment", id: orderId }],
    }),

    // 3. Payment Status Check
    getPaymentStatus: builder.query<PaymentStatusResponse, string>({
      query: (orderId) => `/payments/status/${orderId}`,
      providesTags: (result, error, orderId) => [{ type: "Payment", id: orderId }],
    }),
  }),
});

export const {
  useCreateQrisPaymentMutation,
  useCreateSnapTokenMutation,
  useGetPaymentStatusQuery,
  useLazyGetPaymentStatusQuery,
} = paymentApi;
