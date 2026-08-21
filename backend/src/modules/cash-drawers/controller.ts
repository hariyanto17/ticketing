import { Request, Response } from "express";
import { openDrawerSchema, closeDrawerSchema } from "./validation";
import * as service from "./service";
import { responseHandler } from "../../utils/responseHandler";
import { AppError } from "../../utils/errorHandler";
import { logActivity } from "../../utils/activityLogger";

export const getActiveDrawerController = async (req: Request, res: Response) => {
  if (!req.user) throw new AppError("UNAUTHORIZED", "User not authenticated");
  const drawer = await service.getActiveDrawer(req.user.id);
  return responseHandler.ok(res, drawer, "Active drawer session retrieved");
};

export const openDrawerController = async (req: Request, res: Response) => {
  if (!req.user) throw new AppError("UNAUTHORIZED", "User not authenticated");

  const result = openDrawerSchema.safeParse(req.body);
  if (!result.success) {
    throw new AppError("BAD_REQUEST", result.error.issues.map((i) => i.message).join(", "));
  }

  const drawer = await service.openCashDrawer(req.user.id, result.data.openingBalance);

  await logActivity({
    userId: req.user.id,
    module: "CASH-DRAWER",
    action: "OPEN",
    newData: drawer,
  });

  return responseHandler.created(res, drawer, "Cash drawer session opened");
};

export const closeDrawerController = async (req: Request, res: Response) => {
  if (!req.user) throw new AppError("UNAUTHORIZED", "User not authenticated");

  const result = closeDrawerSchema.safeParse(req.body);
  if (!result.success) {
    throw new AppError("BAD_REQUEST", result.error.issues.map((i) => i.message).join(", "));
  }

  const drawer = await service.closeCashDrawer(req.user.id, result.data.actualBalance);

  await logActivity({
    userId: req.user.id,
    module: "CASH-DRAWER",
    action: "CLOSE",
    newData: drawer,
  });

  return responseHandler.ok(res, drawer, "Cash drawer session closed successfully");
};

export const getDrawersHistoryController = async (req: Request, res: Response) => {
  const drawers = await service.getDrawersHistory();
  return responseHandler.ok(res, drawers, "Drawers history retrieved successfully");
};
