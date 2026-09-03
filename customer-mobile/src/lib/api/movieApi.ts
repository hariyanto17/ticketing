import { baseApi } from "./baseApi";
import { Movie } from "../../types/movie";

export interface GetMoviesParams {
  status?: string;
  search?: string;
  hasSchedule?: boolean;
  page?: number;
  limit?: number;
}

export const movieApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getMovies: builder.query<Movie[], GetMoviesParams | void>({
      query: (params) => {
        const query = new URLSearchParams();
        if (params?.status) query.append("status", params.status);
        if (params?.search) query.append("search", params.search);
        if (params?.hasSchedule !== undefined) query.append("hasSchedule", String(params.hasSchedule));
        if (params?.page) query.append("page", String(params.page));
        if (params?.limit) query.append("limit", String(params.limit));

        const queryString = query.toString();
        return {
          url: `/bookings/movies${queryString ? `?${queryString}` : ""}`,
        };
      },
      providesTags: (result) =>
        result
          ? [
              ...result.map(({ id }) => ({ type: "Movie" as const, id })),
              { type: "Movie", id: "LIST" },
            ]
          : [{ type: "Movie", id: "LIST" }],
    }),

    // Dedicated endpoint for Now Showing movies
    getNowShowingMovies: builder.query<Movie[], { search?: string; page?: number; limit?: number } | void>({
      query: (params) => {
        const query = new URLSearchParams();
        if (params?.search) query.append("search", params.search);
        if (params?.page) query.append("page", String(params.page));
        if (params?.limit) query.append("limit", String(params.limit));

        const queryString = query.toString();
        return {
          url: `/bookings/movies/now-showing${queryString ? `?${queryString}` : ""}`,
        };
      },
      providesTags: (result) =>
        result
          ? [
              ...result.map(({ id }) => ({ type: "Movie" as const, id })),
              { type: "Movie", id: "NOW_SHOWING_LIST" },
            ]
          : [{ type: "Movie", id: "NOW_SHOWING_LIST" }],
    }),

    // Dedicated endpoint for Coming Soon movies
    getComingSoonMovies: builder.query<Movie[], { search?: string; page?: number; limit?: number } | void>({
      query: (params) => {
        const query = new URLSearchParams();
        if (params?.search) query.append("search", params.search);
        if (params?.page) query.append("page", String(params.page));
        if (params?.limit) query.append("limit", String(params.limit));

        const queryString = query.toString();
        return {
          url: `/bookings/movies/coming-soon${queryString ? `?${queryString}` : ""}`,
        };
      },
      providesTags: (result) =>
        result
          ? [
              ...result.map(({ id }) => ({ type: "Movie" as const, id })),
              { type: "Movie", id: "COMING_SOON_LIST" },
            ]
          : [{ type: "Movie", id: "COMING_SOON_LIST" }],
    }),

    getMovieById: builder.query<Movie, string>({
      query: (id) => `/bookings/movies/${id}`,
      providesTags: (result, error, id) => [{ type: "Movie", id }],
    }),
  }),
});

export const {
  useGetMoviesQuery,
  useLazyGetMoviesQuery,
  useGetNowShowingMoviesQuery,
  useLazyGetNowShowingMoviesQuery,
  useGetComingSoonMoviesQuery,
  useLazyGetComingSoonMoviesQuery,
  useGetMovieByIdQuery,
  useLazyGetMovieByIdQuery,
} = movieApi;
