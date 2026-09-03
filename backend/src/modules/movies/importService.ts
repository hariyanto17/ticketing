import { z } from "zod";
import { prisma } from "../../utils/prisma";
import { AppError } from "../../utils/errorHandler";
import { ImportMoviesParsed } from "./validation";

const SOURCE = "21CINEPLEX";
const IMPORT_PRODUCTION_HOUSE = "Imported from 21 Cineplex";

const externalMovieSchema = z.object({
  parent_movie_id: z.string().min(1),
  title: z.string().min(1),
  duration: z.number().int().nonnegative().optional().nullable(),
  genre: z.string().optional().nullable(),
  age_limit: z.number().optional().nullable(),
  rating: z.string().optional().nullable(),
  synopsis: z.string().optional().nullable(),
  movie_image: z.string().url().optional().nullable(),
  trailer: z.string().url().optional().nullable(),
  distributor: z.string().optional().nullable(),
  producer: z.string().optional().nullable(),
  date_show: z.string().optional().nullable(),
  published_date: z.string().optional().nullable(),
}).passthrough();

const externalEnvelopeSchema = z.object({
  status: z.string(),
  data: z.object({
    is_success: z.boolean(),
    value: z.object({
      status: z.number(),
      content: z.array(z.unknown()),
    }),
  }),
});

type ExternalMovie = z.infer<typeof externalMovieSchema>;
type MovieSnapshot = {
  title: string;
  synopsis: string | null;
  durationMinutes: number | null;
  releaseDate: string | null;
  censorshipRating: string;
  poster: string | null;
  trailerUrl: string | null;
  genreNames: string[];
  productionHouseName: string;
  externalDistributorId: string | null;
};

type ImportedMovieStatus = "COMING_SOON" | "DRAFT";

export interface ImportSummary {
  total: number;
  created: number;
  updated: number;
  skipped: number;
  failed: number;
  failures: { externalMovieId?: string; title?: string; reason: string }[];
}

const parseDate = (value?: string | null) => {
  if (!value) return null;
  const normalized = /^\d{2}-\d{2}-\d{4}$/.test(value)
    ? value.split("-").reverse().join("-")
    : value.slice(0, 10);
  const date = new Date(`${normalized}T00:00:00.000Z`);
  return Number.isNaN(date.getTime()) ? null : date;
};

const normalizeName = (value: string) => value.trim().replace(/\s+/g, " ").toLowerCase();

const splitGenres = (value?: string | null) =>
  (value || "")
    .split(",")
    .map((genre) => genre.trim().replace(/\s+/g, " "))
    .filter(Boolean)
    .filter((genre, index, genres) => genres.findIndex((item) => normalizeName(item) === normalizeName(genre)) === index);

const getEndpoint = (type: "NOW_PLAYING" | "UPCOMING", cityId: string) => {
  const params = new URLSearchParams({ type: type === "NOW_PLAYING" ? "now-playing" : "upcoming" });
  if (type === "NOW_PLAYING") params.set("city_id", cityId);
  return `https://m.21cineplex.com/api/movies?${params.toString()}`;
};

const fetchMovies = async (type: "NOW_PLAYING" | "UPCOMING", cityId: string) => {
  const response = await fetch(getEndpoint(type, cityId), { signal: AbortSignal.timeout(15000) });
  if (!response.ok) throw new AppError("BAD_REQUEST", `21 Cineplex returned HTTP ${response.status}`);
  const json: unknown = await response.json();
  const parsed = externalEnvelopeSchema.safeParse(json);
  if (!parsed.success || !parsed.data.data.is_success || parsed.data.data.value.status !== 0) {
    throw new AppError("BAD_REQUEST", "21 Cineplex returned an invalid movie response");
  }
  return parsed.data.data.value.content;
};

const ensureProductionHouse = async (name: string) => {
  const existing = await prisma.productionHouse.findFirst({ where: { name: { equals: name, mode: "insensitive" } } });
  return existing || prisma.productionHouse.create({ data: { name } });
};

const ensureDistributor = async (externalDistributorId: string | null) => {
  if (!externalDistributorId) return null;
  const existing = await prisma.distributor.findUnique({ where: { externalDistributorId } });
  return existing || prisma.distributor.create({
    data: {
      name: `21 Cineplex Distributor ${externalDistributorId}`,
      externalDistributorId,
    },
  });
};

const toSnapshot = (movie: ExternalMovie, genreNames: string[], releaseDate: Date | null, productionHouseName: string): MovieSnapshot => ({
  title: movie.title.trim(),
  synopsis: movie.synopsis?.trim() || null,
  durationMinutes: movie.duration ?? null,
  releaseDate: releaseDate?.toISOString() || null,
  censorshipRating: movie.rating && movie.rating !== "-" ? movie.rating : "SU",
  poster: movie.movie_image || null,
  trailerUrl: movie.trailer || null,
  genreNames,
  productionHouseName,
  externalDistributorId: movie.distributor || null,
});

const makeSlug = (title: string) => `${title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)+/g, "")}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

const importOne = async (rawMovie: unknown, status: ImportedMovieStatus) => {
  const parsed = externalMovieSchema.safeParse(rawMovie);
  if (!parsed.success) throw new Error(parsed.error.issues.map((issue) => issue.message).join(", "));
  const movie = parsed.data;
  const genreNames = splitGenres(movie.genre);
  if (genreNames.length === 0) throw new Error("Movie has no valid genre");

  const releaseDate = parseDate(movie.date_show || movie.published_date);
  const productionHouseName = movie.producer?.trim() || IMPORT_PRODUCTION_HOUSE;
  const snapshot = toSnapshot(movie, genreNames, releaseDate, productionHouseName);

  const previous = await prisma.movie.findFirst({
    where: {
      OR: [
        { externalMovieId: movie.parent_movie_id },
        { title: { equals: snapshot.title, mode: "insensitive" } },
      ],
    },
  });

  // Jika data sudah ada di database, tidak perlu di-update (skip)
  if (previous) {
    return { action: "skipped" as const, movie: previous };
  }

  const productionHouse = await ensureProductionHouse(productionHouseName);
  const distributor = await ensureDistributor(movie.distributor || null);

  const genres = await Promise.all(
    genreNames.map(async (name) => {
      const existing = await prisma.genre.findFirst({ where: { name: { equals: name, mode: "insensitive" } } });
      return existing || prisma.genre.create({ data: { name } });
    })
  );

  const created = await prisma.movie.create({
    data: {
      title: snapshot.title,
      synopsis: snapshot.synopsis,
      durationMinutes: snapshot.durationMinutes,
      releaseDate,
      censorshipRating: snapshot.censorshipRating,
      poster: snapshot.poster,
      trailerUrl: snapshot.trailerUrl,
      status, // "DRAFT" untuk NOW_PLAYING, "COMING_SOON" untuk UPCOMING
      slug: makeSlug(snapshot.title),
      productionHouseId: productionHouse.id,
      distributorId: distributor?.id || null,
      source: SOURCE,
      externalMovieId: movie.parent_movie_id,
      externalDistributorId: snapshot.externalDistributorId,
      externalSnapshot: snapshot,
      genres: { create: genres.map((genre) => ({ genreId: genre.id })) },
    },
  });

  return { action: "created" as const, movie: created };
};

export const importMovies = async (input: ImportMoviesParsed): Promise<ImportSummary> => {
  const types = input.type === "BOTH" ? ["UPCOMING", "NOW_PLAYING"] : [input.type];
  const summary: ImportSummary = { total: 0, created: 0, updated: 0, skipped: 0, failed: 0, failures: [] };
  for (const type of types) {
    let records: unknown[];
    try {
      records = await fetchMovies(type as "NOW_PLAYING" | "UPCOMING", input.cityId);
    } catch (error) {
      summary.failures.push({ reason: error instanceof Error ? error.message : "External API request failed" });
      summary.failed += 1;
      continue;
    }
    summary.total += records.length;
    for (const record of records) {
      try {
        const result = await importOne(record, type === "NOW_PLAYING" ? "DRAFT" : "COMING_SOON");
        summary[result.action] += 1;
      } catch (error) {
        const raw = record as { parent_movie_id?: string; title?: string };
        summary.failed += 1;
        summary.failures.push({ externalMovieId: raw.parent_movie_id, title: raw.title, reason: error instanceof Error ? error.message : "Movie import failed" });
      }
    }
  }
  return summary;
};