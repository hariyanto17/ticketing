import { Request, Response } from "express";
import * as service from "./service";
import { responseHandler } from "../../utils/responseHandler";
import { AppError } from "../../utils/errorHandler";
import { logActivity } from "../../utils/activityLogger";

export const getSettingsController = async (req: Request, res: Response) => {
  const settings = await service.getSettings();
  return responseHandler.ok(res, settings, "Settings loaded successfully");
};

export const updateSettingsController = async (req: Request, res: Response) => {
  if (!req.user) throw new AppError("UNAUTHORIZED", "User not authenticated");

  const oldSettings = await service.getSettings();
  const settings = await service.updateSettings(req.body);

  await logActivity({
    userId: req.user.id,
    module: "SETTINGS",
    action: "UPDATE",
    oldData: oldSettings,
    newData: settings,
  });

  return responseHandler.ok(res, settings, "Settings updated successfully");
};
