import { Request, Response } from "express";
import { AppError } from "../../utils/errorHandler";
import { responseHandler } from "../../utils/responseHandler";
import * as internalService from "./service";

export const getOperationalSummaryHandler = async (req: Request, res: Response) => {
  const dateStr = req.query.date ? req.query.date.toString() : new Date().toISOString().split("T")[0];
  const summary = await internalService.getOperationalSummary(dateStr);
  return responseHandler.ok(res, summary, "Ticketing operational summary retrieved successfully");
};

export const getAnalyticsDataHandler = async (req: Request, res: Response) => {
  const { startDate, endDate } = req.query;
  if (!startDate || !endDate) {
    throw new AppError("BAD_REQUEST", "startDate and endDate are required");
  }

  const start = new Date(startDate.toString());
  const end = new Date(endDate.toString());

  if (isNaN(start.getTime()) || isNaN(end.getTime())) {
    throw new AppError("BAD_REQUEST", "Invalid date format");
  }

  const analytics = await internalService.getAnalyticsData(startDate.toString(), endDate.toString());
  return responseHandler.ok(res, analytics, "Ticketing analytics data retrieved successfully");
};

export const getActivityListHandler = async (req: Request, res: Response) => {
  const activities = await internalService.getActivityList();
  return responseHandler.ok(res, activities, "Ticketing activity retrieved successfully");
};

export const getTransactionsListHandler = async (req: Request, res: Response) => {
  const page = Math.max(1, parseInt(req.query.page?.toString() || "1", 10));
  const limit = Math.min(100, Math.max(1, parseInt(req.query.limit?.toString() || "20", 10)));
  const status = req.query.status ? req.query.status.toString() : undefined;
  const date = req.query.date ? req.query.date.toString() : undefined;
  const search = req.query.search ? req.query.search.toString() : undefined;

  const result = await internalService.getTransactionsList({
    page,
    limit,
    status,
    date,
    search,
  });

  return responseHandler.ok(res, result, "Ticketing transactions retrieved successfully");
};
