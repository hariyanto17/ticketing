import { api } from "./api";

export interface Role {
  id: string;
  name: string;
  description?: string;
}

export interface Branch {
  id: string;
  name: string;
  code: string;
}

export interface UserDetail {
  id: string;
  username: string;
  name: string;
  email: string;
  phone: string | null;
  roleId: string;
  branchId: string;
  isActive: boolean;
  status: string;
  createdAt: string;
  role: Role;
  branch: Branch;
}

export interface ApiResponse<T> {
  status: string;
  message: string;
  data: T;
}

export const userApi = api.injectEndpoints({
  endpoints: (builder) => ({
    getUsers: builder.query<ApiResponse<UserDetail[]>, void>({
      query: () => "/users",
      providesTags: ["User"],
    }),
    getUserById: builder.query<ApiResponse<UserDetail>, string>({
      query: (id) => `/users/${id}`,
      providesTags: (result, error, id) => [{ type: "User", id }],
    }),
    createUser: builder.mutation<ApiResponse<UserDetail>, Partial<UserDetail> & { password?: string }>({
      query: (body) => ({
        url: "/users",
        method: "POST",
        body,
      }),
      invalidatesTags: ["User"],
    }),
    updateUser: builder.mutation<ApiResponse<UserDetail>, { id: string; body: Partial<UserDetail> & { password?: string } }>({
      query: ({ id, body }) => ({
        url: `/users/${id}`,
        method: "PUT",
        body,
      }),
      invalidatesTags: (result, error, { id }) => ["User", { type: "User", id }],
    }),
    deleteUser: builder.mutation<ApiResponse<void>, string>({
      query: (id) => ({
        url: `/users/${id}`,
        method: "DELETE",
      }),
      invalidatesTags: ["User"],
    }),
    getRoles: builder.query<ApiResponse<Role[]>, void>({
      query: () => "/roles",
    }),
    getBranches: builder.query<ApiResponse<Branch[]>, void>({
      query: () => "/branches",
    }),
  }),
});

export const {
  useGetUsersQuery,
  useGetUserByIdQuery,
  useCreateUserMutation,
  useUpdateUserMutation,
  useDeleteUserMutation,
  useGetRolesQuery,
  useGetBranchesQuery,
} = userApi;
