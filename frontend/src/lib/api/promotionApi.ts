import { api } from "./api";

export interface ApiResponse<T> {
  statusCode: number;
  message: string;
  data: T;
  meta?: any;
}

export interface PromotionMovie {
  promotionId: string;
  movieId: string;
  movie: {
    id: string;
    title: string;
    poster?: string | null;
  };
}

export interface Promotion {
  id: string;
  branchId?: string | null;
  name: string;
  code?: string | null;
  promoType: "BUY_X_GET_Y" | "PERCENTAGE";
  discountPercent?: number | null;
  maxDiscount?: number | null;
  buyQty?: number | null;
  getQty?: number | null;
  quota: number;
  usedQuota: number;
  minTickets: number;
  maxUsagePerOrder?: number | null;
  startDate: string;
  endDate: string;
  isActive: boolean;
  status: string;
  createdAt: string;
  updatedAt: string;
  branch?: {
    id: string;
    name: string;
    code: string;
  } | null;
  movies?: PromotionMovie[];
}

export interface CreatePromotionPayload {
  name: string;
  code?: string | null;
  promoType: "BUY_X_GET_Y" | "PERCENTAGE";
  discountPercent?: number | null;
  maxDiscount?: number | null;
  buyQty?: number | null;
  getQty?: number | null;
  quota: number;
  minTickets?: number;
  maxUsagePerOrder?: number | null;
  startDate: string;
  endDate: string;
  isActive?: boolean;
  branchId?: string | null;
  movieIds?: string[];
}

export interface UpdatePromotionPayload extends Partial<CreatePromotionPayload> {}

export interface PromoCalculationResult {
  promotionId: string;
  promoName: string;
  promoType: string;
  subtotal: number;
  discountAmount: number;
  finalAmount: number;
  freeTicketsCount: number;
  usedQuotaIncrement: number;
  details: {
    ticketPrice: number;
    ticketCount: number;
    description: string;
  };
}

export const promotionApi = api.injectEndpoints({
  endpoints: (builder) => ({
    getPromotions: builder.query<
      ApiResponse<Promotion[]>,
      { page?: number; limit?: number; search?: string; promoType?: string; isActive?: boolean | string; branchId?: string; movieId?: string } | void
    >({
      query: (params) => ({
        url: "/promotions",
        params: params || undefined,
      }),
      providesTags: ["Promotion"],
    }),
    getActivePromotions: builder.query<ApiResponse<Promotion[]>, { branchId?: string; movieId?: string } | void>({
      query: (params) => ({
        url: "/promotions/active",
        params: params || undefined,
      }),
      providesTags: ["Promotion"],
    }),
    getPromotionById: builder.query<ApiResponse<Promotion>, string>({
      query: (id) => `/promotions/${id}`,
      providesTags: ["Promotion"],
    }),
    createPromotion: builder.mutation<ApiResponse<Promotion>, CreatePromotionPayload>({
      query: (body) => ({
        url: "/promotions",
        method: "POST",
        body,
      }),
      invalidatesTags: ["Promotion"],
    }),
    updatePromotion: builder.mutation<ApiResponse<Promotion>, { id: string; data: UpdatePromotionPayload }>({
      query: ({ id, data }) => ({
        url: `/promotions/${id}`,
        method: "PUT",
        body: data,
      }),
      invalidatesTags: ["Promotion"],
    }),
    deletePromotion: builder.mutation<ApiResponse<null>, string>({
      query: (id) => ({
        url: `/promotions/${id}`,
        method: "DELETE",
      }),
      invalidatesTags: ["Promotion"],
    }),
    calculatePromoPreview: builder.mutation<
      ApiResponse<PromoCalculationResult>,
      { promotionId: string; ticketCount: number; ticketPrice: number; movieId?: string }
    >({
      query: (body) => ({
        url: "/promotions/calculate",
        method: "POST",
        body,
      }),
    }),
  }),
});

export const {
  useGetPromotionsQuery,
  useGetActivePromotionsQuery,
  useGetPromotionByIdQuery,
  useCreatePromotionMutation,
  useUpdatePromotionMutation,
  useDeletePromotionMutation,
  useCalculatePromoPreviewMutation,
} = promotionApi;
