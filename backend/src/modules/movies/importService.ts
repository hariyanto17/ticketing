import { z } from "zod";
import { prisma } from "../../utils/prisma";
import { AppError } from "../../utils/errorHandler";
import { ImportMoviesParsed } from "./validation";

const SOURCE = "21CINEPLEX";
const IMPORT_PRODUCTION_HOUSE = "-";
const DEFAULT_CITY_ID = "72";
const HTTP_HEADERS = {
  "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
  "Accept": "application/json",
};

const externalMovieSchema = z.object({
  parent_movie_id: z.coerce.string().min(1),
  movie_id: z.coerce.string().optional().nullable(),
  title: z.string().min(1),
  duration: z.coerce.number().int().nonnegative().optional().nullable(),
  genre: z.string().optional().nullable(),
  age_limit: z.coerce.number().optional().nullable(),
  rating: z.string().optional().nullable(),
  synopsis: z.string().optional().nullable(),
  movie_image: z.string().optional().nullable(),
  trailer: z.string().optional().nullable(),
  distributor: z.string().optional().nullable(),
  producer: z.string().optional().nullable(),
  director: z.string().optional().nullable(),
  writer: z.string().optional().nullable(),
  player: z.string().optional().nullable(),
  date_show: z.string().optional().nullable(),
  published_date: z.string().optional().nullable(),
}).passthrough();

const externalMovieDetailSchema = z.object({
  master_id: z.coerce.string().optional().nullable(),
  movie_id: z.coerce.string().optional().nullable(),
  parent_movie_id: z.coerce.string().optional().nullable(),
  title: z.string().optional().nullable(),
  short_title: z.string().optional().nullable(),
  duration: z.coerce.number().int().nonnegative().optional().nullable(),
  genre: z.string().optional().nullable(),
  age_limit: z.coerce.number().optional().nullable(),
  rating: z.string().optional().nullable(),
  description: z.string().optional().nullable(),
  synopsis: z.string().optional().nullable(),
  movie_image: z.string().optional().nullable(),
  movie_trailer: z.string().optional().nullable(),
  trailer: z.string().optional().nullable(),
  distributor: z.string().optional().nullable(),
  producer: z.string().optional().nullable(),
  director: z.string().optional().nullable(),
  writer: z.string().optional().nullable(),
  player: z.string().optional().nullable(),
  published_date: z.string().optional().nullable(),
  date_show: z.string().optional().nullable(),
  sales_date: z.string().optional().nullable(),
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

const externalDetailEnvelopeSchema = z.object({
  status: z.string(),
  data: z.object({
    is_success: z.boolean(),
    value: z.object({
      status: z.number(),
      content: z.unknown(),
    }),
  }),
});

type ExternalMovie = z.infer<typeof externalMovieSchema>;
type ExternalMovieDetail = z.infer<typeof externalMovieDetailSchema>;

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
  distributorName: string | null;
  director: string | null;
  writer: string | null;
  producer: string | null;
  cast: string | null;
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
  if (!value || typeof value !== "string" || !value.trim()) return null;
  const trimmed = value.trim();
  const normalized = /^\d{2}-\d{2}-\d{4}$/.test(trimmed)
    ? trimmed.split("-").reverse().join("-")
    : trimmed.slice(0, 10);
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

const getEndpoint = (type: "NOW_PLAYING" | "UPCOMING", cityId: string = DEFAULT_CITY_ID) => {
  const targetCityId = cityId || DEFAULT_CITY_ID;
  const params = new URLSearchParams({ type: type === "NOW_PLAYING" ? "now-playing" : "upcoming" });
  if (type === "NOW_PLAYING") params.set("city_id", targetCityId);
  return `https://m.21cineplex.com/api/movies?${params.toString()}`;
};

const fetchMovies = async (type: "NOW_PLAYING" | "UPCOMING", cityId: string = DEFAULT_CITY_ID) => {
  const response = await fetch(getEndpoint(type, cityId), {
    headers: HTTP_HEADERS,
    signal: AbortSignal.timeout(15000),
  });
  if (!response.ok) throw new AppError("BAD_REQUEST", `21 Cineplex returned HTTP ${response.status}`);
  const json: unknown = await response.json();
  const parsed = externalEnvelopeSchema.safeParse(json);
  if (!parsed.success || !parsed.data.data.is_success || parsed.data.data.value.status !== 0) {
    throw new AppError("BAD_REQUEST", "21 Cineplex returned an invalid movie response");
  }
  return parsed.data.data.value.content;
};

const fetchMovieDetail = async (movieId: string): Promise<ExternalMovieDetail | null> => {
  if (!movieId || !movieId.trim()) return null;
  try {
    const url = `https://m.21cineplex.com/api/movies?type=getDetail&id=${encodeURIComponent(movieId.trim())}`;
    const response = await fetch(url, {
      headers: HTTP_HEADERS,
      signal: AbortSignal.timeout(15000),
    });
    if (!response.ok) return null;
    const json: unknown = await response.json();
    const parsed = externalDetailEnvelopeSchema.safeParse(json);
    if (!parsed.success || !parsed.data.data.is_success || parsed.data.data.value.status !== 0) {
      return null;
    }
    const detailParsed = externalMovieDetailSchema.safeParse(parsed.data.data.value.content);
    return detailParsed.success ? detailParsed.data : null;
  } catch {
    return null;
  }
};

const ensureProductionHouse = async (name: string) => {
  const existing = await prisma.productionHouse.findFirst({ where: { name: { equals: name, mode: "insensitive" } } });
  return existing || prisma.productionHouse.create({ data: { name } });
};

const ensureDistributor = async (
  nameOrDistributor: string | null,
  externalId?: string | null,
  previousDistributorId?: string | null
) => {
  const cleanedName = nameOrDistributor?.trim() || "";
  const cleanedExternalId = externalId?.trim() || null;

  if (!cleanedName || cleanedName === "-") {
    if (cleanedExternalId) {
      const existing = await prisma.distributor.findFirst({
        where: {
          OR: [
            { externalDistributorId: cleanedExternalId },
            { name: { equals: `21 Cineplex Distributor ${cleanedExternalId}`, mode: "insensitive" } },
          ],
        },
      });
      return existing || prisma.distributor.create({
        data: {
          name: `21 Cineplex Distributor ${cleanedExternalId}`,
          externalDistributorId: cleanedExternalId,
        },
      });
    }
    return null;
  }

  const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(cleanedName);
  const isDummyName = isUuid || cleanedName.toLowerCase().startsWith("21 cineplex distributor");

  // Jika nama asli (misal: "Falcon Pictures")
  if (!isDummyName) {
    // 1. Cek apakah distributor dengan nama asli ini sudah ada di database
    const existingByName = await prisma.distributor.findFirst({
      where: { name: { equals: cleanedName, mode: "insensitive" } },
    });

    // 2. Cek apakah ada record distributor dummy lama (berdasarkan previousDistributorId atau externalDistributorId)
    const dummyRecord = previousDistributorId
      ? await prisma.distributor.findUnique({ where: { id: previousDistributorId } })
      : (cleanedExternalId ? await prisma.distributor.findFirst({ where: { externalDistributorId: cleanedExternalId } }) : null);

    const isRecordDummy = dummyRecord && (
      dummyRecord.name.toLowerCase().includes("21 cineplex distributor") ||
      /^[0-9a-f-]{36}$/i.test(dummyRecord.name.trim())
    );

    if (existingByName) {
      if (cleanedExternalId && !existingByName.externalDistributorId) {
        await prisma.distributor.update({
          where: { id: existingByName.id },
          data: { externalDistributorId: cleanedExternalId },
        });
      }
      // Bersihkan dummyRecord jika tidak terpakai lagi
      if (dummyRecord && isRecordDummy && dummyRecord.id !== existingByName.id) {
        const countOther = await prisma.movie.count({ where: { distributorId: dummyRecord.id } });
        if (countOther <= 1) {
          await prisma.distributor.delete({ where: { id: dummyRecord.id } }).catch(() => {});
        }
      }
      return existingByName;
    }

    // Jika belum ada distributor dengan nama asli, tetapi ada record dummy lama:
    // UPDATE record dummy lama menjadi nama distributor asli (misal "Falcon Pictures")
    if (dummyRecord && isRecordDummy) {
      return prisma.distributor.update({
        where: { id: dummyRecord.id },
        data: {
          name: cleanedName,
          externalDistributorId: cleanedExternalId || dummyRecord.externalDistributorId,
        },
      });
    }

    // Buat baru jika belum ada
    return prisma.distributor.create({
      data: {
        name: cleanedName,
        externalDistributorId: cleanedExternalId || null,
      },
    });
  }

  // Jika nama adalah dummy atau UUID
  const targetExtId = cleanedExternalId || (isUuid ? cleanedName : null);
  if (targetExtId) {
    const existing = await prisma.distributor.findFirst({
      where: {
        OR: [
          { externalDistributorId: targetExtId },
          { name: { equals: `21 Cineplex Distributor ${targetExtId}`, mode: "insensitive" } },
        ],
      },
    });
    return existing || prisma.distributor.create({
      data: {
        name: `21 Cineplex Distributor ${targetExtId}`,
        externalDistributorId: targetExtId,
      },
    });
  }

  return null;
};

const toSnapshot = (
  movie: ExternalMovie,
  detail: ExternalMovieDetail | null,
  genreNames: string[],
  releaseDate: Date | null,
  productionHouseName: string
): MovieSnapshot => {
  const duration = (detail?.duration && detail.duration > 0)
    ? detail.duration
    : (movie.duration && movie.duration > 0)
    ? movie.duration
    : null;

  const rawRating = (detail?.rating && detail.rating !== "-")
    ? detail.rating
    : (movie.rating && movie.rating !== "-")
    ? movie.rating
    : "SU";

  const rawSynopsis = detail?.description?.trim() || detail?.synopsis?.trim() || movie.synopsis?.trim() || null;
  const rawPoster = detail?.movie_image?.trim() || movie.movie_image?.trim() || null;
  const rawTrailer = detail?.movie_trailer?.trim() || detail?.trailer?.trim() || movie.trailer?.trim() || null;
  const rawDistributorName = detail?.distributor?.trim() || null;

  return {
    title: (detail?.title || movie.title).trim(),
    synopsis: rawSynopsis,
    durationMinutes: duration,
    releaseDate: releaseDate?.toISOString() || null,
    censorshipRating: rawRating.trim() || "SU",
    poster: rawPoster,
    trailerUrl: rawTrailer,
    genreNames,
    productionHouseName,
    externalDistributorId: movie.distributor?.trim() || null,
    distributorName: rawDistributorName,
    director: detail?.director?.trim() || movie.director?.trim() || null,
    writer: detail?.writer?.trim() || movie.writer?.trim() || null,
    producer: detail?.producer?.trim() || movie.producer?.trim() || null,
    cast: detail?.player?.trim() || movie.player?.trim() || null,
  };
};

const makeSlug = (title: string) => `${title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)+/g, "")}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

const importOne = async (rawMovie: unknown, status: ImportedMovieStatus) => {
  const parsed = externalMovieSchema.safeParse(rawMovie);
  if (!parsed.success) throw new Error(parsed.error.issues.map((issue) => issue.message).join(", "));
  const movie = parsed.data;

  // Enrich with getDetail API
  const detail = await fetchMovieDetail(movie.parent_movie_id || movie.movie_id || "");

  const rawGenre = detail?.genre || movie.genre;
  const genreNames = splitGenres(rawGenre);
  const finalGenreNames = genreNames.length > 0 ? genreNames : ["General"];

  const rawDate = detail?.published_date || detail?.date_show || movie.date_show || movie.published_date;
  const releaseDate = parseDate(rawDate);
  const productionHouseName = IMPORT_PRODUCTION_HOUSE;
  const snapshot = toSnapshot(movie, detail, finalGenreNames, releaseDate, productionHouseName);

  const previous = await prisma.movie.findFirst({
    where: {
      OR: [
        { externalMovieId: movie.parent_movie_id },
        { title: { equals: snapshot.title, mode: "insensitive" } },
      ],
    },
  });

  const distributor = await ensureDistributor(
    snapshot.distributorName,
    snapshot.externalDistributorId,
    previous?.distributorId
  );

  // Jika data sudah ada di database, update informasi terkini
  if (previous) {
    const updated = await prisma.movie.update({
      where: { id: previous.id },
      data: {
        synopsis: snapshot.synopsis || previous.synopsis,
        durationMinutes: snapshot.durationMinutes || previous.durationMinutes,
        releaseDate: releaseDate || previous.releaseDate,
        censorshipRating: snapshot.censorshipRating || previous.censorshipRating,
        poster: snapshot.poster || previous.poster,
        trailerUrl: snapshot.trailerUrl || previous.trailerUrl,
        cast: snapshot.cast || previous.cast,
        director: snapshot.director || previous.director,
        writer: snapshot.writer || previous.writer,
        producer: snapshot.producer || previous.producer,
        distributorId: distributor?.id || previous.distributorId,
        externalMovieId: previous.externalMovieId || movie.parent_movie_id,
        externalDistributorId: snapshot.externalDistributorId || previous.externalDistributorId,
        externalSnapshot: snapshot,
        ...(previous.status === "COMING_SOON" && status === "DRAFT" ? { status: "DRAFT" } : {}),
      },
    });
    return { action: "updated" as const, movie: updated };
  }

  const productionHouse = await ensureProductionHouse(productionHouseName);

  const genres = await Promise.all(
    finalGenreNames.map(async (name) => {
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
      director: snapshot.director,
      writer: snapshot.writer,
      producer: snapshot.producer,
      cast: snapshot.cast,
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
  const cityId = input.cityId || DEFAULT_CITY_ID;
  const types = input.type === "BOTH" ? ["UPCOMING", "NOW_PLAYING"] : [input.type];
  const summary: ImportSummary = { total: 0, created: 0, updated: 0, skipped: 0, failed: 0, failures: [] };
  for (const type of types) {
    let records: unknown[];
    try {
      records = await fetchMovies(type as "NOW_PLAYING" | "UPCOMING", cityId);
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