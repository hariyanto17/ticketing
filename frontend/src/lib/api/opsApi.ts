import { api } from "./api";

export interface CashDrawer {
  id: string;
  openingBalance: number;
  closingBalance?: number;
  expectedBalance?: number;
  actualBalance?: number;
  difference?: number;
  openedById: string;
  closedById?: string;
  openedAt: string;
  closedAt?: string;
  status: "OPEN" | "CLOSED";
  openedBy?: { id: string; name: string };
  closedBy?: { id: string; name: string };
}

export interface DailyClosing {
  id: string;
  businessDate: string;
  totalTicketsSold: number;
  totalRevenue: number;
  cashRevenue: number;
  qrisRevenue: number;
  posRevenue?: number;
  onlineRevenue?: number;
  totalRefunds: number;
  totalTransactions: number;
  closedById: string;
  closedAt: string;
  closedBy?: { id: string; name: string };
}

export interface ClosingSummary {
  isAlreadyClosed: boolean;
  totalTicketsSold: number;
  totalRevenue: number;
  cashRevenue: number;
  qrisRevenue: number;
  posRevenue?: number;
  posCashRevenue?: number;
  posQrisRevenue?: number;
  posTicketsSold?: number;
  posTransactions?: number;
  onlineRevenue?: number;
  onlineQrisRevenue?: number;
  onlineTicketsSold?: number;
  onlineTransactions?: number;
  totalRefunds: number;
  totalTransactions: number;
}

export interface SystemSettings {
  cinemaName: string;
  logo: string;
  address: string;
  phone: string;
  email: string;
  ticketPrefix: string;
  footerMessage: string;
  termsAndConditions: string;
  taxPercentage: string;
  taxEnabled: string;
  paperWidth: string;
  printLogo: string;
  printQrCode: string;
  businessDate: string;
  timezone: string;
  currency: string;
}

export interface ReportData {
  dailySales: Array<{ date: string; ticketCount: number; revenue: number; cash: number; qris: number; refund: number }>;
  cashierReport: Array<{ cashierName: string; ticketsSold: number; revenue: number }>;
  movieReport: Array<{ movieTitle: string; ticketsSold: number }>;
  scheduleReport: Array<{ scheduleId: string; movieTitle: string; studioCode: string; startTime: string; seatsSold: number; revenue: number }>;
}

export const opsApi = api.injectEndpoints({
  endpoints: (builder) => ({
    getActiveDrawer: builder.query<CashDrawer | null, void>({
      query: () => "/cash-drawers/active",
      transformResponse: (response: any) => response.data,
      providesTags: ["CashDrawer"],
    }),
    openDrawer: builder.mutation<CashDrawer, { openingBalance: number }>({
      query: (body) => ({
        url: "/cash-drawers/open",
        method: "POST",
        body,
      }),
      transformResponse: (response: any) => response.data,
      invalidatesTags: ["CashDrawer"],
    }),
    closeDrawer: builder.mutation<CashDrawer, { actualBalance: number }>({
      query: (body) => ({
        url: "/cash-drawers/close",
        method: "POST",
        body,
      }),
      transformResponse: (response: any) => response.data,
      invalidatesTags: ["CashDrawer"],
    }),
    getDrawersHistory: builder.query<CashDrawer[], void>({
      query: () => "/cash-drawers/history",
      transformResponse: (response: any) => response.data,
      providesTags: ["CashDrawer"],
    }),

    getClosingSummary: builder.query<ClosingSummary, string>({
      query: (date) => `/daily-closings/summary?businessDate=${date}`,
      transformResponse: (response: any) => response.data,
      providesTags: ["DailyClosing"],
    }),
    createClosing: builder.mutation<DailyClosing, { businessDate: string }>({
      query: (body) => ({
        url: "/daily-closings",
        method: "POST",
        body,
      }),
      transformResponse: (response: any) => response.data,
      invalidatesTags: ["DailyClosing"],
    }),
    getClosingsHistory: builder.query<DailyClosing[], void>({
      query: () => "/daily-closings/history",
      transformResponse: (response: any) => response.data,
      providesTags: ["DailyClosing"],
    }),

    getSettings: builder.query<SystemSettings, void>({
      query: () => "/settings",
      transformResponse: (response: any) => response.data,
      providesTags: ["Setting"],
    }),
    updateSettings: builder.mutation<SystemSettings, Partial<SystemSettings>>({
      query: (body) => ({
        url: "/settings",
        method: "PUT",
        body,
      }),
      transformResponse: (response: any) => response.data,
      invalidatesTags: ["Setting"],
    }),

    getReports: builder.query<ReportData, void>({
      query: () => "/reports",
      transformResponse: (response: any) => response.data,
      providesTags: ["Report"],
    }),

    voidOrder: builder.mutation<any, string>({
      query: (id) => ({
        url: `/orders/${id}/void`,
        method: "POST",
      }),
      transformResponse: (response: any) => response.data,
      invalidatesTags: ["Schedule", "Report"],
    }),
    refundTicket: builder.mutation<any, { ticketId: string; reason: string }>({
      query: ({ ticketId, reason }) => ({
        url: `/orders/tickets/${ticketId}/refund`,
        method: "POST",
        body: { reason },
      }),
      transformResponse: (response: any) => response.data,
      invalidatesTags: ["Schedule", "Report"],
    }),
    reprintTicket: builder.mutation<any, { ticketId: string; reason: string }>({
      query: ({ ticketId, reason }) => ({
        url: `/tickets/${ticketId}/reprint`,
        method: "POST",
        body: { reason },
      }),
      transformResponse: (response: any) => response.data,
    }),
  }),
});

export const {
  useGetActiveDrawerQuery,
  useOpenDrawerMutation,
  useCloseDrawerMutation,
  useGetDrawersHistoryQuery,
  useGetClosingSummaryQuery,
  useCreateClosingMutation,
  useGetClosingsHistoryQuery,
  useGetSettingsQuery,
  useUpdateSettingsMutation,
  useGetReportsQuery,
  useVoidOrderMutation,
  useRefundTicketMutation,
  useReprintTicketMutation,
} = opsApi;
