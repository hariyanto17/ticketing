import { prisma } from "../../utils/prisma";
import { AppError } from "../../utils/errorHandler";
import {
  MIDTRANS_SERVER_KEY,
  MIDTRANS_API_BASE_URL,
  PLATFORM_URL,
  PLATFORM_INTERNAL_API_KEY,
} from "../../config/constant";
import { confirmBookingPayment, cancelBooking } from "../bookings/service";
import { MidtransNotificationInput } from "./validation";
import { verifyMidtransSignature } from "./midtransHelpers";

export const handleMidtransNotification = async (payload: MidtransNotificationInput) => {
  // 1. Signature Verification
  const isSignatureValid = verifyMidtransSignature(payload);
  if (!isSignatureValid) {
    throw new AppError("UNAUTHORIZED", "Invalid Midtrans signature key");
  }

  // 2. Locate Internal Order
  const order = await prisma.order.findFirst({
    where: {
      OR: [
        { orderNumber: payload.order_id },
        { bookingNumber: payload.order_id },
      ],
    },
    include: {
      tickets: true,
      payments: true,
    },
  });

  if (!order) {
    throw new AppError("NOT_FOUND", `Order not found for Midtrans order_id: ${payload.order_id}`);
  }

  // 3. Verify Gross Amount Integrity
  const payloadAmount = Math.round(Number(payload.gross_amount));
  const orderAmount = Math.round(order.totalAmount);
  if (payloadAmount !== orderAmount) {
    throw new AppError(
      "BAD_REQUEST",
      `Gross amount mismatch: expected ${orderAmount}, received ${payloadAmount}`
    );
  }

  // 4. Handle Status Transitions
  const status = payload.transaction_status.toLowerCase();
  const fraudStatus = payload.fraud_status?.toLowerCase();

  // A. SUCCESS: Settlement OR Capture (Accept)
  if (status === "settlement" || (status === "capture" && fraudStatus === "accept")) {
    if (order.orderStatus === "PAID") {
      return {
        status: "ALREADY_PROCESSED",
        message: "Order has already been confirmed and paid",
        orderId: order.id,
      };
    }

    await confirmBookingPayment(order.id, {
      provider: "MIDTRANS",
      paymentType: payload.payment_type,
      providerTransactionId: payload.transaction_id,
      rawResponse: payload,
    });

    return {
      status: "SUCCESS",
      message: "Payment successfully confirmed and tickets issued",
      orderId: order.id,
    };
  }

  // B. FAILED / EXPIRED / CANCELLED / DENIED
  if (["expire", "cancel", "deny"].includes(status)) {
    if (order.orderStatus === "CANCELLED") {
      return {
        status: "ALREADY_CANCELLED",
        message: "Order has already been cancelled",
        orderId: order.id,
      };
    }

    await cancelBooking(order.id);

    // Update payment record audit trail
    await prisma.payment.updateMany({
      where: { orderId: order.id },
      data: {
        providerTransactionId: payload.transaction_id,
        rawResponse: payload,
      },
    });

    return {
      status: "CANCELLED",
      message: "Payment failed/expired and seats have been released",
      orderId: order.id,
    };
  }

  // C. PENDING
  if (status === "pending") {
    await prisma.payment.updateMany({
      where: { orderId: order.id, status: "PENDING" },
      data: {
        providerTransactionId: payload.transaction_id,
        paymentType: payload.payment_type,
        rawResponse: payload,
      },
    });

    return {
      status: "PENDING",
      message: "Payment is pending customer completion",
      orderId: order.id,
    };
  }

  return {
    status: "UNHANDLED",
    message: `Received status ${status}`,
    orderId: order.id,
  };
};

export const syncMidtransStatus = async (orderId: string) => {
  let order = await prisma.order.findUnique({
    where: { id: orderId },
    include: {
      payments: true,
      tickets: {
        include: {
          showtimeSeat: {
            include: { seat: true },
          },
        },
      },
    },
  });

  if (!order) throw new AppError("NOT_FOUND", "Order not found");

  if (order.orderStatus === "PAID") {
    return order;
  }

  // 1. Attempt query via Central Platform Hub
  let syncedViaPlatform = false;
  try {
    const platformRes = await fetch(`${PLATFORM_URL}/api/payments/status/${order.orderNumber}`, {
      method: "GET",
      headers: {
        Accept: "application/json",
        "x-platform-internal-key": PLATFORM_INTERNAL_API_KEY,
      },
    });

    if (platformRes.ok) {
      const platformData: any = await platformRes.json();
      if (platformData.status === "success" && platformData.data) {
        const txStatus = platformData.data.status;
        if (txStatus === "SETTLEMENT") {
          if (order.orderStatus !== "PAID") {
            await confirmBookingPayment(order.id, {
              provider: "MIDTRANS",
              paymentType: platformData.data.paymentType || "qris",
              providerTransactionId: platformData.data.transactionNumber || platformData.data.id,
              rawResponse: platformData.data,
            });
            syncedViaPlatform = true;
          }
        } else if (["EXPIRE", "CANCEL", "DENY", "FAILURE"].includes(txStatus)) {
          if (order.orderStatus === "PENDING") {
            await cancelBooking(order.id);
            syncedViaPlatform = true;
          }
        }
      }
    }
  } catch (err) {
    // ignore and fallback
  }

  // 2. Direct Midtrans Status fallback
  if (!syncedViaPlatform && MIDTRANS_SERVER_KEY) {
    const authHeader = `Basic ${Buffer.from(MIDTRANS_SERVER_KEY + ":").toString("base64")}`;
    try {
      const response = await fetch(`${MIDTRANS_API_BASE_URL}/${order.orderNumber}/status`, {
        method: "GET",
        headers: {
          Accept: "application/json",
          Authorization: authHeader,
        },
      });

      if (response.ok) {
        const data: any = await response.json();
        const status = data.transaction_status?.toLowerCase();
        const fraudStatus = data.fraud_status?.toLowerCase();

        if (status === "settlement" || (status === "capture" && fraudStatus === "accept")) {
          if (order.orderStatus !== "PAID") {
            await confirmBookingPayment(order.id, {
              provider: "MIDTRANS",
              paymentType: data.payment_type || "qris",
              providerTransactionId: data.transaction_id,
              rawResponse: data,
            });
          }
        } else if (["expire", "cancel", "deny"].includes(status)) {
          if (order.orderStatus === "PENDING") {
            await cancelBooking(order.id);
          }
        }
      }
    } catch (err: any) {
      console.error(`[Midtrans] Error syncing status for order ${order.orderNumber}:`, err?.message || err);
    }
  }

  // Re-fetch latest updated order
  order = await prisma.order.findUnique({
    where: { id: orderId },
    include: {
      payments: true,
      tickets: {
        include: {
          showtimeSeat: {
            include: { seat: true },
          },
        },
      },
    },
  });

  return order!;
};
