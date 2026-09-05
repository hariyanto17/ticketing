import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react";
import { clearCredentials } from "@/lib/store/authSlice";

export const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || (
  typeof window !== "undefined"
    ? `${window.location.protocol}//${window.location.hostname}:5011/api`
    : "http://127.0.0.1:5011/api"
);

export const SOCKET_BASE_URL = process.env.NEXT_PUBLIC_SOCKET_URL || (
  typeof window !== "undefined"
    ? `${window.location.protocol}//${window.location.hostname}:5011`
    : "http://127.0.0.1:5011"
);

export const api = createApi({
  reducerPath: "api",
  baseQuery: async (args, apiContext, extraOptions) => {
    const result = await fetchBaseQuery({
      baseUrl: API_BASE_URL,
      credentials: "include",
      prepareHeaders: (headers) => {
        const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;
        if (token) {
          headers.set("authorization", `Bearer ${token}`);
        }
        return headers;
      },
    })(args, apiContext, extraOptions);

    if (result.error?.status === 401) {
      apiContext.dispatch(clearCredentials());
    }

    return result;
  },
  tagTypes: [
    "User",
    "Movie",
    "Genre",
    "ProductionHouse",
    "Distributor",
    "Studio",
    "Seat",
    "Schedule",
    "CashDrawer",
    "DailyClosing",
    "Setting",
    "Report",
  ],
  endpoints: () => ({}),
});
