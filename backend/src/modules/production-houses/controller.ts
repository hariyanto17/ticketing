import { Request, Response } from "express";
import { createPHSchema, updatePHSchema } from "./validation";
import * as phService from "./service";
import { responseHandler } from "../../utils/responseHandler";
import { AppError } from "../../utils/errorHandler";
import { logActivity } from "../../utils/activityLogger";

export const getPHsController = async (req: Request, res: Response) => {
  const phs = await phService.getAllPHs();
  return responseHandler.ok(res, phs, "Production houses retrieved");
};

export const getPHByIdController = async (req: Request, res: Response) => {
  const ph = await phService.getPHById(req.params.id);
  return responseHandler.ok(res, ph, "Production house retrieved");
};

export const createPHController = async (req: Request, res: Response) => {
  const result = createPHSchema.safeParse(req.body);
  if (!result.success) {
    throw new AppError("BAD_REQUEST", result.error.issues.map((i) => i.message).join(", "));
  }

  const ph = await phService.createPH(result.data);
  if (req.user) {
    await logActivity({
      userId: req.user.id,
      module: "PRODUCTION_HOUSE",
      action: "CREATE",
      newData: ph,
    });
  }

  return responseHandler.created(res, ph, "Production house created");
};

export const updatePHController = async (req: Request, res: Response) => {
  const result = updatePHSchema.safeParse(req.body);
  if (!result.success) {
    throw new AppError("BAD_REQUEST", result.error.issues.map((i) => i.message).join(", "));
  }

  const oldPh = await phService.getPHById(req.params.id);
  const ph = await phService.updatePH(req.params.id, result.data);

  if (req.user) {
    await logActivity({
      userId: req.user.id,
      module: "PRODUCTION_HOUSE",
      action: "UPDATE",
      oldData: oldPh,
      newData: ph,
    });
  }

  return responseHandler.ok(res, ph, "Production house updated");
};

export const deletePHController = async (req: Request, res: Response) => {
  const oldPh = await phService.getPHById(req.params.id);
  await phService.deletePH(req.params.id);

  if (req.user) {
    await logActivity({
      userId: req.user.id,
      module: "PRODUCTION_HOUSE",
      action: "DELETE",
      oldData: oldPh,
    });
  }

  return responseHandler.ok(res, null, "Production house deleted");
};
