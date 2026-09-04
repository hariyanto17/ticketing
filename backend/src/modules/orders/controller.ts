import { Request, Response } from "express";
import { checkoutSchema, refundSchema } from "./validation";
import * as orderService from "./service";
import { responseHandler } from "../../utils/responseHandler";
import { AppError } from "../../utils/errorHandler";
import { logActivity } from "../../utils/activityLogger";

export const getOrdersController = async (req: Request, res: Response) => {
  const { page, limit, search, cashierId, channel, startDate, endDate } = req.query;

  const roleUpper = (req.user?.role || "").toUpperCase();
  const usernameLower = (req.user?.username || "").toLowerCase();
  const isCashier =
    roleUpper.includes("CASHIER") ||
    usernameLower.includes("kasir") ||
    usernameLower.includes("cashier");

  // If user is a Cashier, restrict strictly to their own POS transactions
  const enforcedCashierId = isCashier ? req.user?.id : (cashierId as string);
  const enforcedChannel = isCashier ? "POS" : (channel as string);

  const result = await orderService.getAllOrders({
    page: page ? Number(page) : undefined,
    limit: limit ? Number(limit) : undefined,
    search: search as string,
    cashierId: enforcedCashierId,
    channel: enforcedChannel,
    startDate: startDate as string,
    endDate: endDate as string,
  });

  return responseHandler.ok(res, result.orders, "Orders retrieved successfully", result.meta);
};

export const getOrderByIdController = async (req: Request, res: Response) => {
  const roleUpper = (req.user?.role || "").toUpperCase();
  const usernameLower = (req.user?.username || "").toLowerCase();
  const isCashier =
    roleUpper.includes("CASHIER") ||
    usernameLower.includes("kasir") ||
    usernameLower.includes("cashier");

  const order = await orderService.getOrderById(req.params.id);

  if (isCashier && order.cashierId !== req.user?.id) {
    throw new AppError("FORBIDDEN", "You can only access your own cashier transactions");
  }

  return responseHandler.ok(res, order, "Order retrieved successfully");
};

export const checkoutOrderController = async (req: Request, res: Response) => {
  if (!req.user) {
    throw new AppError("UNAUTHORIZED", "User must be authenticated");
  }

  const result = checkoutSchema.safeParse(req.body);
  if (!result.success) {
    throw new AppError("BAD_REQUEST", result.error.issues.map((i) => i.message).join(", "));
  }

  const output = await orderService.createCheckoutOrder(req.user.id, req.user.branchId, result.data);

  await logActivity({
    userId: req.user.id,
    module: "ORDER",
    action: "CHECKOUT",
    newData: output.order,
  });

  return responseHandler.created(res, output, "Order checked out successfully");
};

export const voidOrderController = async (req: Request, res: Response) => {
  if (!req.user) throw new AppError("UNAUTHORIZED", "User must be authenticated");

  const roleUpper = (req.user?.role || "").toUpperCase();
  const usernameLower = (req.user?.username || "").toLowerCase();
  const isCashier =
    roleUpper.includes("CASHIER") ||
    usernameLower.includes("kasir") ||
    usernameLower.includes("cashier");

  const existingOrder = await orderService.getOrderById(req.params.id);
  if (isCashier && existingOrder.cashierId !== req.user.id) {
    throw new AppError("FORBIDDEN", "You can only void your own cashier transactions");
  }

  const order = await orderService.voidOrder(req.params.id);

  await logActivity({
    userId: req.user.id,
    module: "ORDER",
    action: "VOID",
    newData: order,
  });

  return responseHandler.ok(res, order, "Order transaction voided successfully");
};

export const refundTicketController = async (req: Request, res: Response) => {
  if (!req.user) throw new AppError("UNAUTHORIZED", "User must be authenticated");

  const result = refundSchema.safeParse(req.body);
  if (!result.success) {
    throw new AppError("BAD_REQUEST", result.error.issues.map((i) => i.message).join(", "));
  }

  const ticket = await orderService.refundTicket(req.params.ticketId, result.data.reason);

  await logActivity({
    userId: req.user.id,
    module: "TICKET",
    action: "REFUND",
    newData: ticket,
  });

  return responseHandler.ok(res, ticket, "Ticket refunded successfully");
};
