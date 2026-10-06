import { api } from "./api";

export interface CashDrawer {
  id: string;
  openingBalance: number;
  closingBalance?: number;
  expectedBalance?: number;
  actualBalance?: number;
  difference?: number;
  notes?: string | null;
  totalCashSales?: number;
  totalQrisSales?: number;
  totalDebitSales?: number;
  totalCreditSales?: number;
  totalOtherSales?: number;
  totalSales?: number;
  totalTransactions?: number;
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
  debitRevenue?: number;
  creditRevenue?: number;
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
  debitRevenue?: number;
  creditRevenue?: number;
  posRevenue?: number;
  posCashRevenue?: number;
  posQrisRevenue?: number;
  posDebitRevenue?: number;
  posCreditRevenue?: number;
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
    closeDrawer: builder.mutation<CashDrawer, { actualBalance: number; notes?: string | null }>({
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
    getFilmSalesMovies: builder.query<any[], void>({
      query: () => "/reports/film-sales/movies",
      transformResponse: (response: any) => response.data,
      providesTags: ["Report", "Schedule"],
    }),
    getFilmShowingDates: builder.query<string[], string>({
      query: (movieId) => ({
        url: "/reports/film-sales/showing-dates",
        params: { movieId },
      }),
      transformResponse: (response: any) => response.data,
    }),
    getFilmSalesReport: builder.query<FilmSalesReportData, { movieId: string; showingDate: string }>({
      query: ({ movieId, showingDate }) => ({
        url: "/reports/film-sales",
        params: { movieId, showingDate },
      }),
      transformResponse: (response: any) => response.data,
      providesTags: ["Report"],
    }),
    getMovieAnalytics: builder.query<
      MovieAnalyticsData,
      { days?: number; endDate?: string; startDate?: string } | void
    >({
      query: (params) => ({
        url: "/reports/movie-analytics",
        params: params || { days: 7 },
      }),
      transformResponse: (response: any) => response.data,
      providesTags: ["Report"],
    }),
  }),
});

export interface ShowtimeSalesItem {
  index: number;
  scheduleId: string;
  time: string;
  startTime: string;
  studioName: string;
  studioCode: string;
  seatGrade: string;
  ticketPrice: number;
  paidTickets: number;
  freeTickets: number;
  sales: number;
}

export interface FilmSalesReportData {
  reportTitle: string;
  distributor: string;
  cinema: string;
  site: string;
  showingDate: string;
  movie: {
    id: string;
    title: string;
    format: string;
    censorshipRating: string;
    durationMinutes?: number | null;
  };
  showtimes: ShowtimeSalesItem[];
  totals: {
    paidTickets: number;
    freeTickets: number;
    sales: number;
  };
}

export interface MovieAnalyticsDailyItem {
  date: string;
  dayName: string;
  dayShort: string;
  displayDate: string;
  tickets: number;
  revenue: number;
  showtimesCount: number;
}

export type MomentumDirection = "UP" | "SLIGHT_UP" | "STABLE" | "SLIGHT_DOWN" | "DOWN" | "NONE";
export type MomentumLabel = "Naik" | "Cenderung Naik" | "Stabil" | "Cenderung Turun" | "Turun" | "Tidak tersedia";

export interface MovieStudioBreakdownItem {
  studioId: string;
  studioName: string;
  studioCode: string;
  shows: number;
  tickets: number;
  capacity: number;
  occupancy: number;
  revenue: number;
  ticketsPerShow: number;
  revenuePerShow: number;
}

export interface MovieAnalyticsMovieItem {
  id: string;
  title: string;
  poster: string | null;
  censorshipRating: string;
  durationMinutes: number | null;
  genres: string[];
  totalTickets: number;
  totalRevenue: number;
  totalShowtimes: number;
  totalCapacity: number;
  occupancy: number;
  ticketsPerShow: number;
  revenuePerShow: number;
  averageTicketPrice: number;
  revenueShare: number;
  ticketShare: number;
  peakHour: string;
  bestStudio: string;
  momentum: {
    direction: MomentumDirection;
    label: MomentumLabel;
    growthPercentage: number;
    currentTickets: number;
    previousTickets: number;
  };
  recommendation: {
    action: "INCREASE" | "MAINTAIN" | "REDUCE" | "MONITOR";
    label: string;
    reason: string;
  };
  healthScore: {
    score: number;
    status: "STRONG" | "NORMAL" | "WEAK" | "CRITICAL";
    label: string;
  };
  studiosBreakdown: MovieStudioBreakdownItem[];
  daily: MovieAnalyticsDailyItem[];
}

export interface GenreAnalyticsItem {
  id: string;
  name: string;
  moviesCount: number;
  movieTitles: string[];
  totalTickets: number;
  totalRevenue: number;
  totalShowtimes: number;
  totalCapacity: number;
  occupancy: number;
  ticketsPerShow: number;
  revenuePerShow: number;
  revenueShare: number;
  ticketShare: number;
  momentum: {
    direction: MomentumDirection;
    label: MomentumLabel;
    growthPercentage: number;
    currentTickets: number;
    previousTickets: number;
  };
  daily: MovieAnalyticsDailyItem[];
}

export interface StudioPerformanceItem {
  studioId: string;
  studioName: string;
  studioCode: string;
  capacity: number;
  totalShowtimes: number;
  totalTickets: number;
  totalCapacity: number;
  totalRevenue: number;
  averageTicketsPerShow: number;
  averageRevenuePerShow: number;
  occupancyRate: number;
  revenueShare: number;
}

export interface TimeSlotPerformanceItem {
  slotKey: string;
  label: string;
  timeRange: string;
  totalTickets: number;
  totalRevenue: number;
  showtimesCount: number;
  totalCapacity: number;
  occupancy: number;
  averageTicketsPerShow: number;
  revenuePerShow: number;
  revenueShare: number;
  isPeak: boolean;
}

export interface ShowtimeHeatmapCell {
  dayOfWeek: number;
  dayName: string;
  dayShort: string;
  timeSlot: string;
  slotKey: string;
  showsCount: number;
  tickets: number;
  capacity: number;
  occupancy: number;
  revenue: number;
  ticketsPerShow: number;
  revenuePerShow: number;
}

export interface IndividualShowAnalyticsItem {
  showtimeId: string;
  movieId: string;
  movieTitle: string;
  date: string;
  displayDate: string;
  time: string;
  studioId: string;
  studioName: string;
  tickets: number;
  capacity: number;
  occupancy: number;
  revenue: number;
}

export interface DayOfWeekAnalyticsItem {
  dayOfWeek: number;
  dayName: string;
  dayShort: string;
  shows: number;
  tickets: number;
  capacity: number;
  occupancy: number;
  revenue: number;
  ticketsPerShow: number;
  revenuePerShow: number;
}

export interface WeekdayWeekendComparison {
  weekday: {
    shows: number;
    tickets: number;
    capacity: number;
    occupancy: number;
    revenue: number;
    ticketsPerShow: number;
    revenuePerShow: number;
  };
  weekend: {
    shows: number;
    tickets: number;
    capacity: number;
    occupancy: number;
    revenue: number;
    ticketsPerShow: number;
    revenuePerShow: number;
  };
  weekendLiftPercentage: number;
}

export interface MovieAnalyticsData {
  period: {
    startDate: string;
    endDate: string;
    days: number;
    timezone: string;
    previousStartDate: string;
    previousEndDate: string;
  };
  summary: {
    totalRevenue: number;
    totalTickets: number;
    totalShowtimes: number;
    totalCapacity: number;
    averageOccupancy: number;
    activeMoviesCount: number;
    averageTicketsPerShow: number;
    averageRevenuePerShow: number;
    averageTicketsPerDay: number;
    averageRevenuePerDay: number;
    topMovie: {
      id: string;
      title: string;
      poster: string | null;
      revenue: number;
      tickets: number;
      occupancy: number;
      recommendation: string;
    } | null;
    topGenre: {
      name: string;
      revenue: number;
      tickets: number;
      moviesCount: number;
      revenueShare: number;
    } | null;
    highestSalesDay: {
      date: string;
      dayName: string;
      revenue: number;
      tickets: number;
    } | null;
    peakTimeSlot: {
      label: string;
      timeRange: string;
      revenue: number;
      tickets: number;
      occupancy: number;
    } | null;
  };
  dailyTotals: Array<{
    date: string;
    dayName: string;
    dayShort: string;
    displayDate: string;
    totalTickets: number;
    totalRevenue: number;
    totalShowtimes: number;
    totalCapacity: number;
    occupancy: number;
    movieBreakdown: Array<{
      movieId: string;
      title: string;
      tickets: number;
      revenue: number;
    }>;
  }>;
  movies: MovieAnalyticsMovieItem[];
  genres: GenreAnalyticsItem[];
  studioPerformance: StudioPerformanceItem[];
  timeSlotPerformance: TimeSlotPerformanceItem[];
  showtimeHeatmap: ShowtimeHeatmapCell[];
  bestShows: IndividualShowAnalyticsItem[];
  underperformingShows: IndividualShowAnalyticsItem[];
  dayOfWeekAnalytics: DayOfWeekAnalyticsItem[];
  weekdayWeekendComparison: WeekdayWeekendComparison;
}



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
  useGetFilmSalesMoviesQuery,
  useGetFilmShowingDatesQuery,
  useGetFilmSalesReportQuery,
  useLazyGetFilmSalesReportQuery,
  useGetMovieAnalyticsQuery,
  useVoidOrderMutation,
  useRefundTicketMutation,
  useReprintTicketMutation,
} = opsApi;


