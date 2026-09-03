import { baseApi } from "./baseApi";
import { Payment } from "../../types/booking";

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

export const paymentApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    createSnapToken: builder.mutation<SnapTransactionResponse, string>({
      query: (orderId) => ({
        url: `/payments/midtrans/snap/${orderId}`,
        method: "POST",
      }),
      invalidatesTags: (result, error, orderId) => [{ type: "Payment", id: orderId }],
    }),

    getPaymentStatus: builder.query<PaymentStatusResponse, string>({
      query: (orderId) => `/payments/status/${orderId}`,
      providesTags: (result, error, orderId) => [{ type: "Payment", id: orderId }],
    }),
  }),
});

export const {
  useCreateSnapTokenMutation,
  useGetPaymentStatusQuery,
  useLazyGetPaymentStatusQuery,
} = paymentApi;
