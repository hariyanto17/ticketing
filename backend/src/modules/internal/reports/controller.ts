import { Request, Response } from "express";
import { validateReportQuery } from "./validation";
import * as reportService from "./service";
import { responseHandler } from "../../../utils/responseHandler";

export const getMoviePerformanceHandler = async (req: Request, res: Response) => {
  const query = validateReportQuery(req.query);
  const result = await reportService.getMoviePerformanceReport(query);
  return responseHandler.ok(res, result.data, "Movie performance report retrieved successfully", {
    summary: result.summary,
    pagination: result.pagination,
    period: { startDate: query.startDate, endDate: query.endDate },
  });
};

export const getShowtimePerformanceHandler = async (req: Request, res: Response) => {
  const query = validateReportQuery(req.query);
  const result = await reportService.getShowtimePerformanceReport(query);
  return responseHandler.ok(res, result.data, "Showtime performance report retrieved successfully", {
    summary: result.summary,
    pagination: result.pagination,
    period: { startDate: query.startDate, endDate: query.endDate },
  });
};
