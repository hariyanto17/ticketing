import { z } from "zod";

export const createMovieSchema = z.object({
  title: z.string().min(1, "Title is required").max(200),
  originalTitle: z.string().max(200).optional().nullable(),
  synopsis: z.string().optional().nullable(),
  durationMinutes: z.number().int().positive("Duration must be positive").optional().nullable(),
  releaseDate: z.string().transform((str) => str ? new Date(str) : null).optional().nullable(),
  endDate: z.string().transform((str) => str ? new Date(str) : null).optional().nullable(),
  censorshipRating: z.string().min(1, "Censorship rating is required"),
  language: z.string().optional().nullable(),
  subtitle: z.string().optional().nullable(),
  poster: z.string().optional().nullable(),
  trailerUrl: z.string().url("Invalid trailer URL").optional().or(z.literal("")).nullable(),
  status: z.enum(["DRAFT", "COMING_SOON", "NOW_SHOWING", "ENDED", "ARCHIVED"]).default("DRAFT"),
  productionHouseId: z.string().uuid("Production House is required"),
  distributorId: z.string().uuid("Distributor is required").optional().nullable(),
  genreIds: z.array(z.string().uuid("Invalid Genre ID")).min(1, "At least one genre is required"),
});

export const updateMovieSchema = z.object({
  title: z.string().min(1, "Title is required").max(200).optional(),
  originalTitle: z.string().max(200).optional().nullable(),
  synopsis: z.string().optional().nullable(),
  durationMinutes: z.number().int().positive("Duration must be positive").optional().nullable(),
  releaseDate: z.string().transform((str) => str ? new Date(str) : null).optional().nullable(),
  endDate: z.string().transform((str) => str ? new Date(str) : null).optional().nullable(),
  censorshipRating: z.string().min(1, "Censorship rating is required").optional(),
  language: z.string().optional().nullable(),
  subtitle: z.string().optional().nullable(),
  poster: z.string().optional().nullable(),
  trailerUrl: z.string().url("Invalid trailer URL").optional().or(z.literal("")).nullable(),
  status: z.enum(["DRAFT", "COMING_SOON", "NOW_SHOWING", "ENDED", "ARCHIVED"]).optional(),
  productionHouseId: z.string().uuid("Production House is required").optional(),
  distributorId: z.string().uuid("Distributor is required").optional().nullable(),
  genreIds: z.array(z.string().uuid("Invalid Genre ID")).optional(),
});

export const importMoviesSchema = z.object({
  source: z.literal("21CINEPLEX"),
  type: z.enum(["NOW_PLAYING", "UPCOMING", "BOTH"]),
  cityId: z.string().min(1).default("72"),
});

export type CreateMovieInput = z.input<typeof createMovieSchema>;
export type UpdateMovieInput = z.input<typeof updateMovieSchema>;
export type ImportMoviesInput = z.input<typeof importMoviesSchema>;
export type CreateMovieParsed = z.output<typeof createMovieSchema>;
export type UpdateMovieParsed = z.output<typeof updateMovieSchema>;
export type ImportMoviesParsed = z.output<typeof importMoviesSchema>;
