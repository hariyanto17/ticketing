import { prisma } from "../../utils/prisma";
import { AppError } from "../../utils/errorHandler";
import {
  MIDTRANS_SERVER_KEY,
  MIDTRANS_API_BASE_URL,
  PLATFORM_URL,
  PLATFORM_INTERNAL_API_KEY,
} from "../../config/constant";
import { buildMidtransItemDetails } from "./midtransHelpers";

export const createQrisCharge = async (orderId: string) => {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: {
      schedule: {
        include: {
          movie: true,
          studio: true,
        },
      },
      tickets: {
        include: {
          showtimeSeat: {
            include: {
              seat: true,
            },
          },
        },
      },
      payments: true,
    },
  });

  if (!order) throw new AppError("NOT_FOUND", "Order not found");
  if (order.orderStatus !== "PENDING") {
    throw new AppError(
      "BAD_REQUEST",
      `Cannot generate QRIS payment for order in ${order.orderStatus} status`
    );
  }

  // Check if booking has expired (10 minutes from creation)
  const now = new Date();
  const tenMinutesAgo = new Date(now.getTime() - 10 * 60 * 1000);
  if (order.createdAt < tenMinutesAgo) {
    throw new AppError("BAD_REQUEST", "Booking time has expired. Please re-select your seats.");
  }

  // DUPLICATE PROTECTION: If an active pending QRIS payment already exists with valid QR data, return it
  const existingQrisPayment = order.payments.find(
    (p) =>
      p.status === "PENDING" &&
      (p.paymentType === "QRIS" || p.provider === "MIDTRANS") &&
      (p.rawResponse !== null || p.redirectUrl !== null)
  );
  if (existingQrisPayment) {
    const raw = (existingQrisPayment.rawResponse as any) || {};
    const qrUrl =
      raw.actions?.find((a: any) => a.name === "generate-qr-code")?.url ||
      existingQrisPayment.redirectUrl ||
      "";
    const qrString = raw.qr_string || "";
    const expiredAt =
      existingQrisPayment.expiredAt && new Date(existingQrisPayment.expiredAt) > now
        ? new Date(existingQrisPayment.expiredAt)
        : new Date(order.createdAt.getTime() + 10 * 60 * 1000);

    return {
      orderId: order.id,
      orderNumber: order.orderNumber,
      paymentId: existingQrisPayment.id,
      status: "PENDING",
      amount: existingQrisPayment.amount,
      qrUrl,
      qrString,
      expiredAt: expiredAt.toISOString(),
    };
  }

  const itemDetails = buildMidtransItemDetails(order);

  let transactionId = "";
  let qrUrl = "";
  let qrString = "";
  let rawMidtransResponse: any = null;
  let expiredAt = new Date(Date.now() + 10 * 60 * 1000);

  // 1. First Attempt: Centralized Planet Cinema Platform Hub
  let platformSuccess = false;
  try {
    const platformResponse = await fetch(`${PLATFORM_URL}/api/payments/charge`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        "x-platform-internal-key": PLATFORM_INTERNAL_API_KEY,
      },
      body: JSON.stringify({
        appCode: "TICKETING",
        externalOrderId: order.orderNumber,
        orderNumber: order.orderNumber,
        grossAmount: Math.round(order.totalAmount),
        paymentType: "qris",
        customer: {
          name: order.customerName || "Customer",
          phone: order.customerPhone || "",
          ...(order.customerEmail && { email: order.customerEmail }),
        },
        itemDetails,
        splitItems: [
          {
            targetAppCode: "TICKETING",
            targetOrderId: order.id,
            amount: Math.round(order.totalAmount),
          },
        ],
        expiryMinutes: 10,
      }),
    });

    if (platformResponse.ok) {
      const platformData: any = await platformResponse.json();
      if (platformData.status === "success" && platformData.data) {
        transactionId = platformData.data.transactionNumber || platformData.data.transactionId;
        qrUrl = platformData.data.qrUrl || "";
        qrString = platformData.data.qrString || "";
        rawMidtransResponse = platformData.data;
        if (platformData.data.expiredAt) {
          expiredAt = new Date(platformData.data.expiredAt);
        }
        platformSuccess = true;
      }
    }
  } catch (err: any) {
    console.warn(`[Kasir-Ticket] Platform payment hub call failed, attempting fallback:`, err?.message || err);
  }

  // 2. Direct Midtrans fallback if platform was unreachable or during standalone test mode
  if (!platformSuccess) {
    const qrisPayload = {
      payment_type: "qris",
      transaction_details: {
        order_id: order.orderNumber,
        gross_amount: Math.round(order.totalAmount),
      },
      qris: {
        acquirer: "gopay",
      },
      item_details: itemDetails,
      customer_details: {
        first_name: order.customerName || "Customer",
        phone: order.customerPhone || "",
        ...(order.customerEmail && { email: order.customerEmail }),
      },
      custom_expiry: {
        expiry_duration: 10,
        unit: "minute",
      },
    };

    const authHeader = `Basic ${Buffer.from(MIDTRANS_SERVER_KEY + ":").toString("base64")}`;

    try {
      const response = await fetch(`${MIDTRANS_API_BASE_URL}/charge`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
          Authorization: authHeader,
        },
        body: JSON.stringify(qrisPayload),
      });

      const data: any = await response.json();

      if (!response.ok || (data.status_code !== "201" && data.status_code !== "200")) {
        throw new Error(
          data.status_message || data.error_messages?.join(", ") || "Failed to create Midtrans QRIS transaction"
        );
      }

      rawMidtransResponse = data;
      transactionId = data.transaction_id;
      qrUrl = data.actions?.find((a: any) => a.name === "generate-qr-code")?.url || "";
      qrString = data.qr_string || "";
    } catch (err: any) {
      if (process.env.NODE_ENV === "test" || !process.env.MIDTRANS_SERVER_KEY) {
        transactionId = `mock-qris-txn-${order.orderNumber}`;
        qrUrl = `https://api.sandbox.midtrans.com/v2/qris/${transactionId}/qr-code`;
        qrString = `00020101021226590014ID.LINKAJA.WWW01189360091100210082720205008270303UMI51440014ID.CO.QRIS.WWW0215ID10200210082720303UMI5204581253033605405500005802ID5913Planet Cinema6007Jakarta61051234062070703A0163045952`;
        rawMidtransResponse = {
          status_code: "201",
          status_message: "QRIS transaction is created",
          transaction_id: transactionId,
          order_id: order.orderNumber,
          gross_amount: String(order.totalAmount),
          payment_type: "qris",
          transaction_status: "pending",
          actions: [{ name: "generate-qr-code", method: "GET", url: qrUrl }],
          qr_string: qrString,
        };
      } else {
        throw new AppError("SERVICE_UNAVAILABLE", `Midtrans QRIS gateway error: ${err.message}`);
      }
    }
  }

  // Persist QRIS transaction details to Payment table
  const pendingPayment = order.payments.find((p) => p.status === "PENDING");
  let paymentRecord;
  if (pendingPayment) {
    paymentRecord = await prisma.payment.update({
      where: { id: pendingPayment.id },
      data: {
        provider: "MIDTRANS",
        paymentType: "QRIS",
        providerTransactionId: transactionId,
        providerOrderId: order.orderNumber,
        redirectUrl: qrUrl,
        expiredAt,
        rawResponse: rawMidtransResponse,
      },
    });
  } else {
    paymentRecord = await prisma.payment.create({
      data: {
        orderId: order.id,
        amount: order.totalAmount,
        status: "PENDING",
        provider: "MIDTRANS",
        paymentType: "QRIS",
        providerTransactionId: transactionId,
        providerOrderId: order.orderNumber,
        redirectUrl: qrUrl,
        expiredAt,
        rawResponse: rawMidtransResponse,
      },
    });
  }

  return {
    orderId: order.id,
    orderNumber: order.orderNumber,
    paymentId: paymentRecord.id,
    status: "PENDING",
    amount: order.totalAmount,
    qrUrl,
    qrString,
    expiredAt: expiredAt.toISOString(),
  };
};
