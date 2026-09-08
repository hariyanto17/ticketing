import { api } from "./api";

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

export interface PaymentStatusResponse {
  orderId: string;
  orderNumber: string;
  orderStatus: "PENDING" | "PAID" | "CANCELLED" | "REFUNDED";
  paymentStatus: "PENDING" | "PAID" | "FAILED" | "REFUNDED";
  payments: any[];
  tickets: any[];
  qrUrl?: string;
  qrString?: string;
  expiredAt?: string;
}

export const paymentApi = api.injectEndpoints({
  endpoints: (builder) => ({
    createQrisPayment: builder.mutation<QrisPaymentResponse, string>({
      query: (orderId) => ({
        url: `/payments/qris/${orderId}`,
        method: "POST",
      }),
      transformResponse: (res: any) => res.data,
      invalidatesTags: (result, error, orderId) => [{ type: "Payment" as const, id: orderId }],
    }),

    getPaymentStatus: builder.query<PaymentStatusResponse, string>({
      query: (orderId) => `/payments/status/${orderId}`,
      transformResponse: (res: any) => res.data,
      providesTags: (result, error, orderId) => [{ type: "Payment" as const, id: orderId }],
    }),

    simulateQrisSuccess: builder.mutation<{ success: boolean; message: string }, string>({
      query: (orderId) => ({
        url: `/payments/qris/simulate-success/${orderId}`,
        method: "POST",
      }),
      transformResponse: (res: any) => res.data,
      invalidatesTags: (result, error, orderId) => [
        { type: "Payment" as const, id: orderId },
        "Seat",
        "Schedule",
      ],
    }),
  }),
});

export const {
  useCreateQrisPaymentMutation,
  useGetPaymentStatusQuery,
  useLazyGetPaymentStatusQuery,
  useSimulateQrisSuccessMutation,
} = paymentApi;
