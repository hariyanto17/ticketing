import { Request, Response } from "express";
import * as service from "./service";
import { responseHandler } from "../../utils/responseHandler";
import { generateFilmSalesExcel } from "./excelGenerator";

export const getReportsController = async (req: Request, res: Response) => {
  const reports = await service.getOperationalReports();
  return responseHandler.ok(res, reports, "Operational reports retrieved successfully");
};

export const getFilmShowingDatesController = async (req: Request, res: Response) => {
  const movieId = req.query.movieId as string;
  const dates = await service.getFilmShowingDates(movieId);
  return responseHandler.ok(res, dates, "Showing dates retrieved successfully");
};

export const getFilmSalesReportController = async (req: Request, res: Response) => {
  const movieId = req.query.movieId as string;
  const showingDate = req.query.showingDate as string;
  const branchId = (req.user as any)?.branchId;
  const report = await service.getFilmSalesReport(movieId, showingDate, branchId);
  return responseHandler.ok(res, report, "Film sales report retrieved successfully");
};

export const getFilmSalesMoviesController = async (req: Request, res: Response) => {
  const branchId = (req.user as any)?.branchId;
  const movies = await service.getScheduledMovies(branchId);
  return responseHandler.ok(res, movies, "Scheduled movies retrieved successfully");
};

export const exportFilmSalesExcelController = async (req: Request, res: Response) => {
  const movieId = req.query.movieId as string;
  const showingDate = req.query.showingDate as string;
  const branchId = (req.user as any)?.branchId;
  const report = await service.getFilmSalesReport(movieId, showingDate, branchId);

  const buffer = await generateFilmSalesExcel(report);

  const sanitizedTitle = report.movie.title.replace(/[^a-zA-Z0-9]/g, " ").trim().replace(/\s+/g, " ");
  const filename = `Film Sales Report - ${sanitizedTitle} - ${showingDate}.xlsx`;

  res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
  res.setHeader("Content-Disposition", `attachment; filename="${encodeURIComponent(filename)}"`);
  return res.send(buffer);
};

