import { Request, Response } from "express";
import { createClosingSchema } from "./validation";
import * as service from "./service";
import { responseHandler } from "../../utils/responseHandler";
import { AppError } from "../../utils/errorHandler";
import { logActivity } from "../../utils/activityLogger";

export const getClosingSummaryController = async (req: Request, res: Response) => {
  const { businessDate } = req.query;
  if (!businessDate) {
    throw new AppError("BAD_REQUEST", "businessDate query parameter is required");
  }

  const summary = await service.getDailyClosingSummary(new Date(businessDate as string));
  return responseHandler.ok(res, summary, "Daily closing summary calculated");
};

export const createClosingController = async (req: Request, res: Response) => {
  if (!req.user) throw new AppError("UNAUTHORIZED", "User not authenticated");

  const result = createClosingSchema.safeParse(req.body);
  if (!result.success) {
    throw new AppError("BAD_REQUEST", result.error.issues.map((i) => i.message).join(", "));
  }

  const closing = await service.createDailyClosing(req.user.id, result.data.businessDate);

  await logActivity({
    userId: req.user.id,
    module: "DAILY-CLOSING",
    action: "CREATE",
    newData: closing,
  });

  return responseHandler.created(res, closing, "Daily closing record generated");
};

export const getClosingsHistoryController = async (req: Request, res: Response) => {
  const closings = await service.getClosingsHistory();
  return responseHandler.ok(res, closings, "Daily closings history retrieved");
};
