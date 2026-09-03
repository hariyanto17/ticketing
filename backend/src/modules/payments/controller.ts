import { Request, Response } from "express";
import { midtransNotificationSchema } from "./validation";
import * as midtransService from "./midtransService";
import { responseHandler } from "../../utils/responseHandler";
import { AppError } from "../../utils/errorHandler";
import { prisma } from "../../utils/prisma";

export const midtransNotificationController = async (req: Request, res: Response) => {
  const result = midtransNotificationSchema.safeParse(req.body);
  if (!result.success) {
    throw new AppError(
      "BAD_REQUEST",
      result.error.issues.map((i) => i.message).join(", ")
    );
  }

  const output = await midtransService.handleMidtransNotification(result.data);
  return responseHandler.ok(res, output, output.message);
};

export const createQrisPaymentController = async (req: Request, res: Response) => {
  const { orderId } = req.params;
  if (!orderId) {
    throw new AppError("BAD_REQUEST", "orderId is required");
  }

  const result = await midtransService.createQrisCharge(orderId);
  return responseHandler.ok(res, result, "Midtrans QRIS payment created successfully");
};

export const createSnapTransactionController = async (req: Request, res: Response) => {
  const { orderId } = req.params;
  if (!orderId) {
    throw new AppError("BAD_REQUEST", "orderId is required");
  }

  const result = await midtransService.createSnapTransaction(orderId);
  return responseHandler.ok(res, result, "Midtrans Snap token generated successfully");
};

export const getPaymentStatusController = async (req: Request, res: Response) => {
  const { orderId } = req.params;
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: {
      payments: true,
      tickets: true,
    },
  });

  if (!order) throw new AppError("NOT_FOUND", "Order not found");

  const latestPayment = order.payments[order.payments.length - 1];
  let qrUrl = "";
  let qrString = "";
  let expiredAt = latestPayment?.expiredAt ? latestPayment.expiredAt.toISOString() : undefined;

  if (latestPayment?.rawResponse) {
    const raw = latestPayment.rawResponse as any;
    qrUrl = raw.actions?.find((a: any) => a.name === "generate-qr-code")?.url || latestPayment.redirectUrl || "";
    qrString = raw.qr_string || "";
  }

  return responseHandler.ok(
    res,
    {
      orderId: order.id,
      orderNumber: order.orderNumber,
      orderStatus: order.orderStatus,
      paymentStatus: order.paymentStatus,
      payments: order.payments,
      tickets: order.tickets,
      qrUrl,
      qrString,
      expiredAt,
    },
    "Payment status retrieved"
  );
};
