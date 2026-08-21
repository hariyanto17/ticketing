import { Request, Response } from "express";
import { createStudioSchema, updateStudioSchema } from "./validation";
import * as studioService from "./service";
import { responseHandler } from "../../utils/responseHandler";
import { AppError } from "../../utils/errorHandler";
import { logActivity } from "../../utils/activityLogger";

export const getStudiosController = async (req: Request, res: Response) => {
  const { page, limit, search, status } = req.query;

  const result = await studioService.getAllStudios({
    page: page ? Number(page) : undefined,
    limit: limit ? Number(limit) : undefined,
    search: search as string,
    status: status as string,
  });

  return responseHandler.ok(res, result.studios, "Studios retrieved", result.meta);
};

export const getStudioByIdController = async (req: Request, res: Response) => {
  const studio = await studioService.getStudioById(req.params.id);
  return responseHandler.ok(res, studio, "Studio retrieved");
};

export const createStudioController = async (req: Request, res: Response) => {
  const result = createStudioSchema.safeParse(req.body);
  if (!result.success) {
    throw new AppError("BAD_REQUEST", result.error.issues.map((i) => i.message).join(", "));
  }

  const studio = await studioService.createStudio(result.data);
  if (req.user) {
    await logActivity({
      userId: req.user.id,
      module: "STUDIO",
      action: "CREATE",
      newData: studio,
    });
  }

  return responseHandler.created(res, studio, "Studio created");
};

export const updateStudioController = async (req: Request, res: Response) => {
  const result = updateStudioSchema.safeParse(req.body);
  if (!result.success) {
    throw new AppError("BAD_REQUEST", result.error.issues.map((i) => i.message).join(", "));
  }

  const oldStudio = await studioService.getStudioById(req.params.id);
  const studio = await studioService.updateStudio(req.params.id, result.data);

  if (req.user) {
    await logActivity({
      userId: req.user.id,
      module: "STUDIO",
      action: "UPDATE",
      oldData: oldStudio,
      newData: studio,
    });
  }

  return responseHandler.ok(res, studio, "Studio updated");
};

export const deleteStudioController = async (req: Request, res: Response) => {
  const oldStudio = await studioService.getStudioById(req.params.id);
  await studioService.deleteStudioSoft(req.params.id);

  if (req.user) {
    await logActivity({
      userId: req.user.id,
      module: "STUDIO",
      action: "DELETE-SOFT",
      oldData: oldStudio,
    });
  }

  return responseHandler.ok(res, null, "Studio closed (soft-deleted) successfully");
};

export const copyLayoutController = async (req: Request, res: Response) => {
  const destinationStudioId = req.params.id;
  const { sourceStudioId } = req.body;

  if (!sourceStudioId) {
    throw new AppError("BAD_REQUEST", "sourceStudioId is required");
  }

  const result = await studioService.copyLayout(destinationStudioId, sourceStudioId);

  if (req.user) {
    await logActivity({
      userId: req.user.id,
      module: "STUDIO",
      action: "COPY-LAYOUT",
      newData: { destinationStudioId, sourceStudioId, seatCount: result.seatCount, capacity: result.capacity },
    });
  }

  return responseHandler.ok(res, result, "Layout copied successfully");
};
