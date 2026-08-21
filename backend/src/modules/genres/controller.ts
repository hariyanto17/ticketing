import { Request, Response } from "express";
import { createGenreSchema, updateGenreSchema } from "./validation";
import * as genreService from "./service";
import { responseHandler } from "../../utils/responseHandler";
import { AppError } from "../../utils/errorHandler";
import { logActivity } from "../../utils/activityLogger";

export const getGenresController = async (req: Request, res: Response) => {
  const genres = await genreService.getAllGenres();
  return responseHandler.ok(res, genres, "Genres retrieved");
};

export const getGenreByIdController = async (req: Request, res: Response) => {
  const genre = await genreService.getGenreById(req.params.id);
  return responseHandler.ok(res, genre, "Genre retrieved");
};

export const createGenreController = async (req: Request, res: Response) => {
  const result = createGenreSchema.safeParse(req.body);
  if (!result.success) {
    throw new AppError("BAD_REQUEST", result.error.issues.map((i) => i.message).join(", "));
  }

  const genre = await genreService.createGenre(result.data);
  if (req.user) {
    await logActivity({
      userId: req.user.id,
      module: "GENRE",
      action: "CREATE",
      newData: genre,
    });
  }

  return responseHandler.created(res, genre, "Genre created");
};

export const updateGenreController = async (req: Request, res: Response) => {
  const result = updateGenreSchema.safeParse(req.body);
  if (!result.success) {
    throw new AppError("BAD_REQUEST", result.error.issues.map((i) => i.message).join(", "));
  }

  const oldGenre = await genreService.getGenreById(req.params.id);
  const genre = await genreService.updateGenre(req.params.id, result.data);

  if (req.user) {
    await logActivity({
      userId: req.user.id,
      module: "GENRE",
      action: "UPDATE",
      oldData: oldGenre,
      newData: genre,
    });
  }

  return responseHandler.ok(res, genre, "Genre updated");
};

export const deleteGenreController = async (req: Request, res: Response) => {
  const oldGenre = await genreService.getGenreById(req.params.id);
  await genreService.deleteGenre(req.params.id);

  if (req.user) {
    await logActivity({
      userId: req.user.id,
      module: "GENRE",
      action: "DELETE",
      oldData: oldGenre,
    });
  }

  return responseHandler.ok(res, null, "Genre deleted");
};
