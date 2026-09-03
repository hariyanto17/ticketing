import { prisma } from "../../utils/prisma";
import { AppError } from "../../utils/errorHandler";
import { CreateMovieParsed, UpdateMovieParsed } from "./validation";

interface GetMoviesQuery {
  page?: number;
  limit?: number;
  search?: string;
  status?: string;
  statusNot?: string | string[];
  genreId?: string;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
  hasSchedule?: boolean;
  scheduleStartDate?: string;
  scheduleEndDate?: string;
}

export const getAllMovies = async (query: GetMoviesQuery) => {
  const page = Number(query.page) || 1;
  const limit = Number(query.limit) || 10;
  const skip = (page - 1) * limit;

  const where: any = {};

  // Status filtering (handling positive match or negative exclusion)
  if (query.status) {
    where.status = query.status;
  } else if (query.statusNot) {
    const excluded = Array.isArray(query.statusNot) ? query.statusNot : [query.statusNot];
    where.status = { notIn: excluded };
  } else {
    where.status = { not: "ARCHIVED" };
  }

  if (query.search) {
    where.OR = [
      { title: { contains: query.search, mode: "insensitive" } },
      { originalTitle: { contains: query.search, mode: "insensitive" } },
    ];
  }

  if (query.genreId) {
    where.genres = {
      some: {
        genreId: query.genreId,
      },
    };
  }

  if (query.hasSchedule) {
    const minDate = query.scheduleStartDate ? new Date(query.scheduleStartDate) : new Date();
    minDate.setHours(0, 0, 0, 0);

    const showtimeWhere: any = {
      status: "PUBLISHED",
      OR: [
        { businessDate: { gte: minDate } },
        { startTime: { gte: minDate } },
      ],
    };

    if (query.scheduleEndDate) {
      const maxDate = new Date(query.scheduleEndDate);
      maxDate.setHours(23, 59, 59, 999);
      showtimeWhere.businessDate = { lte: maxDate, gte: minDate };
    }

    where.showtimes = {
      some: showtimeWhere,
    };
  }

  const orderBy: any = {};
  if (query.sortBy) {
    orderBy[query.sortBy] = query.sortOrder || "desc";
  } else {
    orderBy.createdAt = "desc";
  }

  const [movies, total] = await Promise.all([
    prisma.movie.findMany({
      where,
      include: {
        productionHouse: { select: { id: true, name: true } },
        distributor: { select: { id: true, name: true } },
        genres: { include: { genre: true } },
      },
      skip,
      take: limit,
      orderBy,
    }),
    prisma.movie.count({ where }),
  ]);

  return {
    movies,
    meta: {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    },
  };
};

export const getMovieById = async (id: string) => {
  const movie = await prisma.movie.findUnique({
    where: { id },
    include: {
      productionHouse: true,
      distributor: true,
      genres: { include: { genre: true } },
    },
  });

  if (!movie) throw new AppError("NOT_FOUND", "Movie not found");
  return movie;
};

export const createMovie = async (input: CreateMovieParsed) => {
  const slug = input.title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)+/g, "") + "-" + Date.now();

  const { genreIds, ...rest } = input;

  return prisma.movie.create({
    data: {
      ...rest,
      slug,
      genres: {
        create: genreIds.map((id) => ({
          genreId: id,
        })),
      },
    },
    include: {
      genres: { include: { genre: true } },
    },
  });
};

export const updateMovie = async (id: string, input: UpdateMovieParsed) => {
  await getMovieById(id);

  const { genreIds, ...rest } = input;

  // If changing genres, delete old linkages and create new ones
  if (genreIds) {
    await prisma.movieGenre.deleteMany({ where: { movieId: id } });
  }

  return prisma.movie.update({
    where: { id },
    data: {
      ...rest,
      ...(genreIds && {
        genres: {
          create: genreIds.map((gid) => ({
            genreId: gid,
          })),
        },
      }),
    },
    include: {
      genres: { include: { genre: true } },
    },
  });
};

export const deleteMovieSoft = async (id: string) => {
  await getMovieById(id);
  // Soft delete: sets status to ARCHIVED
  return prisma.movie.update({
    where: { id },
    data: { status: "ARCHIVED" },
  });
};
