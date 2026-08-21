import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react";
import { clearCredentials } from "@/store/authSlice";

// For local development, requests should go to our backend PORT 5011
const BASE_URL = typeof window !== "undefined" 
  ? `http://${window.location.hostname}:5011/api` 
  : "http://127.0.0.1:5011/api";

export const api = createApi({
  reducerPath: "api",
  baseQuery: async (args, apiContext, extraOptions) => {
    const result = await fetchBaseQuery({
      baseUrl: BASE_URL,
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
    "Report"
  ],
  endpoints: () => ({}),
});
