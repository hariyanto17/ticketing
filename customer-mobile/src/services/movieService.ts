import { request } from "./api";
import { Movie } from "../types/movie";

export const movieService = {
  async getMovies(params?: { status?: string; search?: string; hasSchedule?: boolean }): Promise<Movie[]> {
    const query = new URLSearchParams();
    if (params?.status) query.append("status", params.status);
    if (params?.search) query.append("search", params.search);
    if (params?.hasSchedule !== undefined) query.append("hasSchedule", String(params.hasSchedule));

    const endpoint = `/bookings/movies${query.toString() ? `?${query.toString()}` : ""}`;
    return request<Movie[]>(endpoint);
  },

  async getMovieById(id: string): Promise<Movie> {
    return request<Movie>(`/bookings/movies/${id}`);
  },
};
