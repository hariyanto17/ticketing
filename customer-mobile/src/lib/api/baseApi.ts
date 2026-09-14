import { BaseQueryFn, createApi, FetchArgs, fetchBaseQuery, FetchBaseQueryError } from "@reduxjs/toolkit/query/react";
import { API_BASE_URL } from "../../config/api";

const prepareHeaders = (headers: Headers) => {
  headers.set("Content-Type", "application/json");
  headers.set("Accept", "application/json");
  return headers;
};

const rawBaseQuery = fetchBaseQuery({
  baseUrl: API_BASE_URL,
  prepareHeaders,
});

const baseQueryWithUnwrap: BaseQueryFn<string | FetchArgs, unknown, FetchBaseQueryError> = async (
  args,
  api,
  extraOptions
) => {
  const result = await rawBaseQuery(args, api, extraOptions);

  // Automatically unwrap backend response envelope { success: true, message: "...", data: [...] }
  if (result.data && typeof result.data === "object" && "data" in result.data) {
    const rawData = result.data as any;
    const resData = rawData.data;
    if (rawData.meta !== undefined && rawData.meta !== null && typeof resData === "object" && resData !== null) {
      try {
        (resData as any).meta = rawData.meta;
      } catch (e) {}
    }
    return { ...result, data: resData };
  }

  return result;
};

export const baseApi = createApi({
  reducerPath: "api",
  baseQuery: baseQueryWithUnwrap,
  tagTypes: ["Movie", "Schedule", "Seat", "Booking", "Payment"],
  endpoints: () => ({}),
});
