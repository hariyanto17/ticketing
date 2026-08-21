import { api } from "./api";

export interface Genre {
  id: string;
  name: string;
  description?: string | null;
  isActive: boolean;
}

export interface ProductionHouse {
  id: string;
  name: string;
  contactPerson?: string | null;
  phone?: string | null;
  email?: string | null;
  address?: string | null;
  isActive: boolean;
}

export interface Distributor {
  id: string;
  name: string;
  contactPerson?: string | null;
  phone?: string | null;
  email?: string | null;
  address?: string | null;
  isActive: boolean;
}

export interface Movie {
  id: string;
  title: string;
  originalTitle?: string | null;
  synopsis?: string | null;
  durationMinutes?: number | null;
  releaseDate?: string | null;
  endDate?: string | null;
  censorshipRating: string;
  language?: string | null;
  subtitle?: string | null;
  poster?: string | null;
  trailerUrl?: string | null;
  status: "DRAFT" | "COMING_SOON" | "NOW_SHOWING" | "ENDED" | "ARCHIVED";
  productionHouseId: string;
  distributorId?: string | null;
  productionHouse: ProductionHouse;
  distributor?: Distributor | null;
  genres: { genre: Genre }[];
  createdAt: string;
}

export interface ApiResponse<T> {
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

export interface MovieImportSummary {
  total: number;
  created: number;
  updated: number;
  skipped: number;
  failed: number;
  failures: { externalMovieId?: string; title?: string; reason: string }[];
}

export const movieApi = api.injectEndpoints({
  endpoints: (builder) => ({
    // Movies
    getMovies: builder.query<ApiResponse<Movie[]>, { page?: number; limit?: number; search?: string; status?: string; genreId?: string; hasSchedule?: boolean }>({
      query: (params) => ({
        url: "/movies",
        params,
      }),
      providesTags: ["Movie"],
    }),
    getMovieById: builder.query<ApiResponse<Movie>, string>({
      query: (id) => `/movies/${id}`,
      providesTags: (result, error, id) => [{ type: "Movie", id }],
    }),
    createMovie: builder.mutation<ApiResponse<Movie>, Partial<Movie> & { genreIds: string[] }>({
      query: (body) => ({
        url: "/movies",
        method: "POST",
        body,
      }),
      invalidatesTags: ["Movie"],
    }),
    updateMovie: builder.mutation<ApiResponse<Movie>, { id: string; body: Partial<Movie> & { genreIds?: string[] } }>({
      query: ({ id, body }) => ({
        url: `/movies/${id}`,
        method: "PUT",
        body,
      }),
      invalidatesTags: (result, error, { id }) => ["Movie", { type: "Movie", id }],
    }),
    deleteMovie: builder.mutation<ApiResponse<void>, string>({
      query: (id) => ({
        url: `/movies/${id}`,
        method: "DELETE",
      }),
      invalidatesTags: ["Movie"],
    }),
    importMovies: builder.mutation<ApiResponse<MovieImportSummary>, { source: "21CINEPLEX"; type: "NOW_PLAYING" | "UPCOMING" | "BOTH"; cityId: string }>({
      query: (body) => ({
        url: "/movies/import",
        method: "POST",
        body,
      }),
      invalidatesTags: ["Movie", "Genre", "ProductionHouse"],
    }),

    // Genres
    getGenres: builder.query<ApiResponse<Genre[]>, void>({
      query: () => "/genres",
      providesTags: ["Genre"],
    }),
    createGenre: builder.mutation<ApiResponse<Genre>, Partial<Genre>>({
      query: (body) => ({
        url: "/genres",
        method: "POST",
        body,
      }),
      invalidatesTags: ["Genre"],
    }),
    updateGenre: builder.mutation<ApiResponse<Genre>, { id: string; body: Partial<Genre> }>({
      query: ({ id, body }) => ({
        url: `/genres/${id}`,
        method: "PUT",
        body,
      }),
      invalidatesTags: ["Genre"],
    }),
    deleteGenre: builder.mutation<ApiResponse<void>, string>({
      query: (id) => ({
        url: `/genres/${id}`,
        method: "DELETE",
      }),
      invalidatesTags: ["Genre"],
    }),

    // Production Houses
    getPHs: builder.query<ApiResponse<ProductionHouse[]>, void>({
      query: () => "/production-houses",
      providesTags: ["ProductionHouse"],
    }),
    createPH: builder.mutation<ApiResponse<ProductionHouse>, Partial<ProductionHouse>>({
      query: (body) => ({
        url: "/production-houses",
        method: "POST",
        body,
      }),
      invalidatesTags: ["ProductionHouse"],
    }),
    updatePH: builder.mutation<ApiResponse<ProductionHouse>, { id: string; body: Partial<ProductionHouse> }>({
      query: ({ id, body }) => ({
        url: `/production-houses/${id}`,
        method: "PUT",
        body,
      }),
      invalidatesTags: ["ProductionHouse"],
    }),
    deletePH: builder.mutation<ApiResponse<void>, string>({
      query: (id) => ({
        url: `/production-houses/${id}`,
        method: "DELETE",
      }),
      invalidatesTags: ["ProductionHouse"],
    }),

    // Distributors
    getDistributors: builder.query<ApiResponse<Distributor[]>, void>({
      query: () => "/distributors",
      providesTags: ["Distributor"],
    }),
    createDistributor: builder.mutation<ApiResponse<Distributor>, Partial<Distributor>>({
      query: (body) => ({
        url: "/distributors",
        method: "POST",
        body,
      }),
      invalidatesTags: ["Distributor"],
    }),
    updateDistributor: builder.mutation<ApiResponse<Distributor>, { id: string; body: Partial<Distributor> }>({
      query: ({ id, body }) => ({
        url: `/distributors/${id}`,
        method: "PUT",
        body,
      }),
      invalidatesTags: ["Distributor"],
    }),
    deleteDistributor: builder.mutation<ApiResponse<void>, string>({
      query: (id) => ({
        url: `/distributors/${id}`,
        method: "DELETE",
      }),
      invalidatesTags: ["Distributor"],
    }),
  }),
});

export const {
  useGetMoviesQuery,
  useGetMovieByIdQuery,
  useCreateMovieMutation,
  useUpdateMovieMutation,
  useDeleteMovieMutation,
  useImportMoviesMutation,
  useGetGenresQuery,
  useCreateGenreMutation,
  useUpdateGenreMutation,
  useDeleteGenreMutation,
  useGetPHsQuery,
  useCreatePHMutation,
  useUpdatePHMutation,
  useDeletePHMutation,
  useGetDistributorsQuery,
  useCreateDistributorMutation,
  useUpdateDistributorMutation,
  useDeleteDistributorMutation,
} = movieApi;
