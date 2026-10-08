import { api } from "./api";

export interface User {
  id: string;
  username: string;
  name: string;
  email: string;
  role: string;
  isActive: boolean;
}

export interface LoginResponse {
  status: string;
  message: string;
  data: {
    user: User;
    token: string;
  };
}

export interface MeResponse {
  status: string;
  message: string;
  data: {
    user: User;
  };
}

import { setCredentials, clearCredentials } from "../store/authSlice";

export const authApi = api.injectEndpoints({
  endpoints: (builder) => ({
    login: builder.mutation<LoginResponse, any>({
      query: (credentials) => ({
        url: "/auth/login",
        method: "POST",
        body: credentials,
      }),
      invalidatesTags: ["User", "CashDrawer", "DailyClosing", "Order", "Report", "Setting"],
      async onQueryStarted(arg, { dispatch, queryFulfilled }) {
        try {
          const { data } = await queryFulfilled;
          dispatch(api.util.resetApiState());
          if (data?.data?.user && data?.data?.token) {
            dispatch(setCredentials({ user: data.data.user, token: data.data.token }));
          }
        } catch {}
      },
    }),
    logout: builder.mutation<{ status: string; message: string }, void>({
      query: () => ({
        url: "/auth/logout",
        method: "POST",
      }),
      invalidatesTags: ["User", "CashDrawer", "DailyClosing", "Order", "Report", "Setting"],
      async onQueryStarted(arg, { dispatch, queryFulfilled }) {
        try {
          await queryFulfilled;
        } finally {
          dispatch(clearCredentials());
          dispatch(api.util.resetApiState());
        }
      },
    }),
    me: builder.query<MeResponse, void>({
      query: () => "/auth/me",
      providesTags: ["User"],
    }),
    ssoLogin: builder.mutation<LoginResponse, { code: string }>({
      query: (body) => ({
        url: "/auth/sso",
        method: "POST",
        body,
      }),
      invalidatesTags: ["User", "CashDrawer", "DailyClosing", "Order", "Report", "Setting"],
      async onQueryStarted(arg, { dispatch, queryFulfilled }) {
        try {
          const { data } = await queryFulfilled;
          dispatch(api.util.resetApiState());
          if (data?.data?.user && data?.data?.token) {
            dispatch(setCredentials({ user: data.data.user, token: data.data.token }));
          }
        } catch {}
      },
    }),
  }),
});

export const { useLoginMutation, useLogoutMutation, useMeQuery, useSsoLoginMutation } = authApi;
