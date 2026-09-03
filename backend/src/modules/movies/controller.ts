import { Request, Response } from "express";
import { createMovieSchema, importMoviesSchema, updateMovieSchema } from "./validation";
import * as movieService from "./service";
import * as movieImportService from "./importService";
import { responseHandler } from "../../utils/responseHandler";
import { AppError } from "../../utils/errorHandler";
import { logActivity } from "../../utils/activityLogger";

export const getMoviesController = async (req: Request, res: Response) => {
  const { page, limit, search, status, genreId, sortBy, sortOrder, hasSchedule, scheduleStartDate, scheduleEndDate, startDate, endDate } = req.query;

  const result = await movieService.getAllMovies({
    page: page ? Number(page) : undefined,
    limit: limit ? Number(limit) : undefined,
    search: search as string,
    status: status as string,
    genreId: genreId as string,
    sortBy: sortBy as string,
    sortOrder: sortOrder as any,
    hasSchedule: hasSchedule === "true",
    scheduleStartDate: (scheduleStartDate || startDate) as string,
    scheduleEndDate: (scheduleEndDate || endDate) as string,
  });

  return responseHandler.ok(res, result.movies, "Movies retrieved", result.meta);
};

export const getNowShowingMoviesController = async (req: Request, res: Response) => {
  const { page, limit, search, genreId, sortBy, sortOrder } = req.query;

  const result = await movieService.getAllMovies({
    page: page ? Number(page) : undefined,
    limit: limit ? Number(limit) : undefined,
    search: search as string,
    status: "NOW_SHOWING",
    genreId: genreId as string,
    sortBy: sortBy as string,
    sortOrder: sortOrder as any,
  });

  return responseHandler.ok(res, result.movies, "Now showing movies retrieved", result.meta);
};

export const getComingSoonMoviesController = async (req: Request, res: Response) => {
  const { page, limit, search, genreId, sortBy, sortOrder } = req.query;

  const result = await movieService.getAllMovies({
    page: page ? Number(page) : undefined,
    limit: limit ? Number(limit) : undefined,
    search: search as string,
    status: "COMING_SOON",
    genreId: genreId as string,
    sortBy: sortBy as string,
    sortOrder: sortOrder as any,
  });

  return responseHandler.ok(res, result.movies, "Coming soon movies retrieved", result.meta);
};

export const getMovieByIdController = async (req: Request, res: Response) => {
  const movie = await movieService.getMovieById(req.params.id);
  return responseHandler.ok(res, movie, "Movie retrieved");
};

export const importMoviesController = async (req: Request, res: Response) => {
  const result = importMoviesSchema.safeParse(req.body);
  if (!result.success) {
    throw new AppError("BAD_REQUEST", result.error.issues.map((i) => i.message).join(", "));
  }

  const summary = await movieImportService.importMovies(result.data);
  if (req.user) {
    await logActivity({
      userId: req.user.id,
      module: "MOVIE",
      action: "IMPORT",
      newData: summary,
    });
  }

  return responseHandler.ok(res, summary, "Movie import completed");
};

export const createMovieController = async (req: Request, res: Response) => {
  const result = createMovieSchema.safeParse(req.body);
  if (!result.success) {
    throw new AppError("BAD_REQUEST", result.error.issues.map((i) => i.message).join(", "));
  }

  const movie = await movieService.createMovie(result.data);
  if (req.user) {
    await logActivity({
      userId: req.user.id,
      module: "MOVIE",
      action: "CREATE",
      newData: movie,
    });
  }

  return responseHandler.created(res, movie, "Movie created");
};

export const updateMovieController = async (req: Request, res: Response) => {
  const result = updateMovieSchema.safeParse(req.body);
  if (!result.success) {
    throw new AppError("BAD_REQUEST", result.error.issues.map((i) => i.message).join(", "));
  }

  const oldMovie = await movieService.getMovieById(req.params.id);
  const movie = await movieService.updateMovie(req.params.id, result.data);

  if (req.user) {
    await logActivity({
      userId: req.user.id,
      module: "MOVIE",
      action: "UPDATE",
      oldData: oldMovie,
      newData: movie,
    });
  }

  return responseHandler.ok(res, movie, "Movie updated");
};

export const deleteMovieController = async (req: Request, res: Response) => {
  const oldMovie = await movieService.getMovieById(req.params.id);
  await movieService.deleteMovieSoft(req.params.id);

  if (req.user) {
    await logActivity({
      userId: req.user.id,
      module: "MOVIE",
      action: "DELETE-SOFT",
      oldData: oldMovie,
    });
  }

  return responseHandler.ok(res, null, "Movie archived successfully");
};
