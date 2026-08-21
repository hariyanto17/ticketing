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

export const authApi = api.injectEndpoints({
  endpoints: (builder) => ({
    login: builder.mutation<LoginResponse, any>({
      query: (credentials) => ({
        url: "/auth/login",
        method: "POST",
        body: credentials,
      }),
    }),
    logout: builder.mutation<{ status: string; message: string }, void>({
      query: () => ({
        url: "/auth/logout",
        method: "POST",
      }),
    }),
    me: builder.query<MeResponse, void>({
      query: () => "/auth/me",
    }),
  }),
});

export const { useLoginMutation, useLogoutMutation, useMeQuery } = authApi;
