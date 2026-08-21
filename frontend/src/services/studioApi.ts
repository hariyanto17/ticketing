import { api } from "./api";
import { Movie } from "./movieApi";

export interface Studio {
  id: string;
  branchId: string;
  name: string;
  code: string;
  capacity: number;
  layoutRows?: number;
  layoutColumns?: number;
  type: "REGULAR" | "PREMIERE" | "VIP";
  status: "ACTIVE" | "MAINTENANCE" | "CLOSED";
  branch?: { id: string; name: string };
}

export interface Seat {
  id?: string;
  studioId: string;
  row: string;
  column: number;
  seatNumber: number;
  seatLabel: string;
  seatType: "REGULAR" | "VIP" | "COUPLE" | "WHEELCHAIR";
  status: "ACTIVE" | "DISABLED";
}

export interface Schedule {
  id: string;
  movieId: string;
  studioId: string;
  businessDate: string;
  startTime: string;
  endTime: string | null;
  ticketPrice: number;
  status: "DRAFT" | "PUBLISHED" | "CLOSED";
  movie: { id: string; title: string; durationMinutes?: number | null; poster?: string | null };
  studio: { id: string; name: string; code: string };
}

interface ApiResponse<T> {
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

export const studioApi = api.injectEndpoints({
  endpoints: (builder) => ({
    // Studios
    getStudios: builder.query<ApiResponse<Studio[]>, { page?: number; limit?: number; search?: string; status?: string }>({
      query: (params) => ({
        url: "/studios",
        params,
      }),
      providesTags: ["Studio"],
    }),
    getStudioById: builder.query<ApiResponse<Studio>, string>({
      query: (id) => `/studios/${id}`,
      providesTags: (result, error, id) => [{ type: "Studio", id }],
    }),
    createStudio: builder.mutation<ApiResponse<Studio>, Partial<Studio>>({
      query: (body) => ({
        url: "/studios",
        method: "POST",
        body,
      }),
      invalidatesTags: ["Studio"],
    }),
    updateStudio: builder.mutation<ApiResponse<Studio>, { id: string; body: Partial<Studio> }>({
      query: ({ id, body }) => ({
        url: `/studios/${id}`,
        method: "PUT",
        body,
      }),
      invalidatesTags: (result, error, { id }) => ["Studio", { type: "Studio", id }],
    }),
    deleteStudio: builder.mutation<ApiResponse<void>, string>({
      query: (id) => ({
        url: `/studios/${id}`,
        method: "DELETE",
      }),
      invalidatesTags: ["Studio"],
    }),

    // Seats
    getSeats: builder.query<ApiResponse<Seat[]>, string>({
      query: (studioId) => `/seats?studioId=${studioId}`,
      providesTags: ["Seat"],
    }),
    saveLayout: builder.mutation<ApiResponse<any>, { studioId: string; seats: Seat[]; force?: boolean }>({
      query: (body) => ({
        url: "/seats/layout",
        method: "POST",
        body,
      }),
      invalidatesTags: ["Seat", "Studio"],
    }),
    copyLayout: builder.mutation<ApiResponse<{ studioId: string; sourceStudioId: string; seatCount: number; capacity: number }>, { destinationStudioId: string; sourceStudioId: string }>({
      query: ({ destinationStudioId, sourceStudioId }) => ({
        url: `/studios/${destinationStudioId}/copy-layout`,
        method: "POST",
        body: { sourceStudioId },
      }),
      invalidatesTags: ["Seat", "Studio"],
    }),
    validateRemoval: builder.query<ApiResponse<{ safe: boolean; blocked: { id: string; seatLabel: string }[] }>, { studioId: string; row?: string; column?: number }>({
      query: ({ studioId, row, column }) => ({
        url: "/seats/validate-removal",
        params: { studioId, row, column },
      }),
    }),

    // Schedules
    getSchedules: builder.query<ApiResponse<Schedule[]>, { movieId?: string; studioId?: string; status?: string }>({
      query: (params) => ({
        url: "/schedules",
        params,
      }),
      providesTags: ["Schedule"],
    }),
    getScheduleById: builder.query<ApiResponse<Schedule>, string>({
      query: (id) => `/schedules/${id}`,
      providesTags: (result, error, id) => [{ type: "Schedule", id }],
    }),
    createSchedule: builder.mutation<ApiResponse<Schedule>, Partial<Schedule>>({
      query: (body) => ({
        url: "/schedules",
        method: "POST",
        body,
      }),
      invalidatesTags: ["Schedule"],
    }),
    updateSchedule: builder.mutation<ApiResponse<Schedule>, { id: string; body: Partial<Schedule> }>({
      query: ({ id, body }) => ({
        url: `/schedules/${id}`,
        method: "PUT",
        body,
      }),
      invalidatesTags: (result, error, { id }) => ["Schedule", { type: "Schedule", id }],
    }),
    deleteSchedule: builder.mutation<ApiResponse<void>, string>({
      query: (id) => ({
        url: `/schedules/${id}`,
        method: "DELETE",
      }),
      invalidatesTags: ["Schedule"],
    }),

    // Schedule seat status and hold actions
    getScheduleSeats: builder.query<ApiResponse<ShowtimeSeat[]>, string>({
      query: (scheduleId) => `/schedules/${scheduleId}/seats`,
      providesTags: ["Seat"],
    }),
    holdSeats: builder.mutation<ApiResponse<{ reservedUntil: string }>, { scheduleId: string; seatIds: string[] }>({
      query: ({ scheduleId, ...body }) => ({
        url: `/schedules/${scheduleId}/hold`,
        method: "POST",
        body,
      }),
      invalidatesTags: ["Seat"],
    }),
    releaseSeats: builder.mutation<ApiResponse<void>, { scheduleId: string; seatIds: string[] }>({
      query: ({ scheduleId, ...body }) => ({
        url: `/schedules/${scheduleId}/release`,
        method: "POST",
        body,
      }),
      invalidatesTags: ["Seat"],
    }),
  }),
});

export interface ShowtimeSeat {
  id: string;
  showtimeId: string;
  seatId: string;
  status: "AVAILABLE" | "HOLD" | "SOLD" | "DISABLED";
  reservedUntil?: string | null;
  seat: {
    id: string;
    row: string;
    column: number;
    seatNumber: number;
    seatLabel: string;
    seatType: "REGULAR" | "VIP" | "COUPLE" | "WHEELCHAIR";
  };
}

export const {
  useGetStudiosQuery,
  useGetStudioByIdQuery,
  useCreateStudioMutation,
  useUpdateStudioMutation,
  useDeleteStudioMutation,
  useGetSeatsQuery,
  useSaveLayoutMutation,
  useCopyLayoutMutation,
  useValidateRemovalQuery,
  useLazyValidateRemovalQuery,
  useGetSchedulesQuery,
  useGetScheduleByIdQuery,
  useCreateScheduleMutation,
  useUpdateScheduleMutation,
  useDeleteScheduleMutation,
  useGetScheduleSeatsQuery,
  useHoldSeatsMutation,
  useReleaseSeatsMutation,
} = studioApi;
