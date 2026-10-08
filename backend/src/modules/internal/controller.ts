import { Request, Response } from "express";
import { AppError } from "../../utils/errorHandler";
import { responseHandler } from "../../utils/responseHandler";
import * as internalService from "./service";
import { midtransNotificationSchema } from "../payments/validation";
import * as midtransService from "../payments/midtransService";

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

export const handlePlatformPaymentNotificationHandler = async (req: Request, res: Response) => {
  const payload = req.body;
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    throw new AppError("BAD_REQUEST", "Payment notification payload must be an object");
  }

  const targetId = payload.targetOrderId || payload.externalOrderId;

  if (!targetId) {
    throw new AppError("BAD_REQUEST", "targetOrderId or externalOrderId is required");
  }

  const order = await internalService.findOrderByIdentifier(targetId);
  if (!order) {
    throw new AppError("NOT_FOUND", `Order not found for identifier: ${targetId}`);
  }

  const status = (payload.status || "").toUpperCase();

  if (status === "SETTLEMENT") {
    const notification = midtransNotificationSchema.safeParse(payload.rawPayload);
    if (!notification.success) {
      throw new AppError("BAD_REQUEST", "A valid signed Midtrans notification is required");
    }

    if (
      notification.data.order_id !== order.orderNumber &&
      notification.data.order_id !== order.bookingNumber
    ) {
      throw new AppError("BAD_REQUEST", "Payment notification does not match the target order");
    }
    if (notification.data.transaction_status.toUpperCase() !== status) {
      throw new AppError("BAD_REQUEST", "Payment notification status does not match the signed Midtrans status");
    }

    const result = await midtransService.handleMidtransNotification(notification.data);
    return responseHandler.ok(
      res,
      { orderId: order.id, orderNumber: order.orderNumber, status: result.status },
      result.message
    );
  }

  if (["CANCELLED", "EXPIRED", "FAILED", "EXPIRE", "CANCEL"].includes(status)) {
    if (order.orderStatus === "PENDING") {
      await internalService.cancelOrderBooking(order.id);
    }

    return responseHandler.ok(
      res,
      { orderId: order.id, orderNumber: order.orderNumber, status: "CANCELLED" },
      "Booking cancelled and seats released"
    );
  }

  return responseHandler.ok(
    res,
    { orderId: order.id, orderNumber: order.orderNumber, status: order.orderStatus },
    `Notification received with status ${status}`
  );
};
