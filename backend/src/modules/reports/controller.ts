import { Request, Response } from "express";
import * as service from "./service";
import { responseHandler } from "../../utils/responseHandler";
import { generateFilmSalesExcel } from "./excelGenerator";
import { generateTransactionExcel } from "./transactionExcelGenerator";
import { getDateInTimezone } from "./transactionExcelGenerator";
import * as orderService from "../orders/service";
import { prisma } from "../../utils/prisma";

export const getReportsController = async (req: Request, res: Response) => {
  const reports = await service.getOperationalReports();
  return responseHandler.ok(res, reports, "Operational reports retrieved successfully");
};

export const exportTransactionExcelController = async (req: Request, res: Response) => {
  const { search, cashierId, channel, startDate, endDate } = req.query;
  const branchId = (req.user as any)?.branchId as string | undefined;
  const [settingsRecords, branch] = await Promise.all([
    prisma.setting.findMany({ where: { key: "timezone" } }),
    branchId ? prisma.branch.findUnique({ where: { id: branchId }, select: { timezone: true } }) : prisma.branch.findFirst({ select: { timezone: true } }),
  ]);
  const timezone = settingsRecords[0]?.value || branch?.timezone || process.env.TZ || "Asia/Makassar";
  const { orders } = await orderService.getAllOrders({
    page: 1,
    limit: 100000,
    search: search as string | undefined,
    cashierId: cashierId as string | undefined,
    channel: channel as string | undefined,
    startDate: startDate as string | undefined,
    endDate: endDate as string | undefined,
  });
  const transactions = orders
    .filter((order: any) => order.tickets.some((ticket: any) => ticket.status !== "CANCELLED"))
    .map((order: any, index: number) => {
    const activeTickets = (order.tickets || []).filter((ticket: any) => ticket.status !== "CANCELLED");
    const qty = activeTickets.length;
    const price = Number(order.schedule?.ticketPrice ?? activeTickets[0]?.price ?? 0);
    const discount = Number(order.discountAmount ?? 0);
    const promoSnapshot = order.promoSnapshot as Record<string, unknown> | null;
    const promotion = order.promotion;
    const isCard = ["DEBIT_CARD", "CREDIT_CARD"].includes(String(order.paymentMethod).toUpperCase());

    return {
      number: index + 1,
      createdBy: order.cashier?.name || order.customerName || "",
      accountName: order.cashier?.username || order.customerName || "",
      transactionDate: getDateInTimezone(new Date(order.createdAt), timezone),
      theater: order.schedule?.studio?.code || "",
      filmName: order.schedule?.movie?.title || "",
      invoiceCode: order.orderNumber || "",
      qty,
      price,
      discount,
      isCard,
      // The schema does not store a bank-card number; do not substitute payment transaction IDs.
      cardNumber: "",
      isPromo: String(promotion?.name || promotion?.code || promoSnapshot?.name || promoSnapshot?.code || "-"),
      freePass: activeTickets.some((ticket: any) => ticket.isFree) ? "Ya" : "Tidak",
      supplierDistributor: order.schedule?.movie?.distributor?.name || "",
    };
    });
  const buffer = await generateTransactionExcel(transactions);
  const requestedDate = startDate as string | undefined;
  const date = typeof requestedDate === "string" && /^\d{4}-\d{2}-\d{2}$/.test(requestedDate)
    ? requestedDate
    : getDateInTimezone(new Date(), timezone);
  res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
  res.setHeader("Content-Disposition", `attachment; filename="Transaction_Report_${date}.xlsx"`);
  return res.send(buffer);
};

export const getFilmShowingDatesController = async (req: Request, res: Response) => {
  const movieId = req.query.movieId as string;
  const branchId = (req.user as any)?.branchId;
  const dates = await service.getFilmShowingDates(movieId, branchId);
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

export const getMovieAnalyticsController = async (req: Request, res: Response) => {
  const days = req.query.days ? parseInt(req.query.days as string, 10) : 7;
  const endDate = req.query.endDate as string | undefined;
  const startDate = req.query.startDate as string | undefined;
  const branchId = (req.user as any)?.branchId;
  const analytics = await service.getMovieAnalytics(branchId, isNaN(days) ? 7 : days, endDate, startDate);
  return responseHandler.ok(res, analytics, "Movie analytics retrieved successfully");
};

