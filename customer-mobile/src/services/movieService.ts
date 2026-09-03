import { request } from "./api";
import { Movie } from "../types/movie";
import { movieApi, GetMoviesParams } from "../lib/api/movieApi";
import { store } from "../lib/store/store";

export const movieService = {
  async getMovies(params?: GetMoviesParams): Promise<Movie[]> {
    const result = await store.dispatch(
      movieApi.endpoints.getMovies.initiate(params, { subscribe: false, forceRefetch: true })
    );
    if (result.data) {
      return result.data;
    }
    // Fallback to direct HTTP request
    const query = new URLSearchParams();
    if (params?.status) query.append("status", params.status);
    if (params?.search) query.append("search", params.search);
    if (params?.hasSchedule !== undefined) query.append("hasSchedule", String(params.hasSchedule));

    const endpoint = `/bookings/movies${query.toString() ? `?${query.toString()}` : ""}`;
    return request<Movie[]>(endpoint);
  },

  async getNowShowingMovies(search?: string): Promise<Movie[]> {
    const result = await store.dispatch(
      movieApi.endpoints.getNowShowingMovies.initiate(search ? { search } : undefined, {
        subscribe: false,
        forceRefetch: true,
      })
    );
    if (result.data) {
      return result.data;
    }
    const query = search ? `?search=${encodeURIComponent(search)}` : "";
    return request<Movie[]>(`/bookings/movies/now-showing${query}`);
  },

  async getComingSoonMovies(search?: string): Promise<Movie[]> {
    const result = await store.dispatch(
      movieApi.endpoints.getComingSoonMovies.initiate(search ? { search } : undefined, {
        subscribe: false,
        forceRefetch: true,
      })
    );
    if (result.data) {
      return result.data;
    }
    const query = search ? `?search=${encodeURIComponent(search)}` : "";
    return request<Movie[]>(`/bookings/movies/coming-soon${query}`);
  },

  async getMovieById(id: string): Promise<Movie> {
    const result = await store.dispatch(
      movieApi.endpoints.getMovieById.initiate(id, { subscribe: false, forceRefetch: true })
    );
    if (result.data) {
      return result.data;
    }
    return request<Movie>(`/bookings/movies/${id}`);
  },
};
