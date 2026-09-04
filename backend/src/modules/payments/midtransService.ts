import crypto from "crypto";
import { prisma } from "../../utils/prisma";
import { AppError } from "../../utils/errorHandler";
import {
  MIDTRANS_SERVER_KEY,
  MIDTRANS_SNAP_BASE_URL,
  MIDTRANS_API_BASE_URL,
} from "../../config/constant";
import { confirmBookingPayment, cancelBooking } from "../bookings/service";
import { MidtransNotificationInput } from "./validation";

export const generateMidtransSignature = (
  orderId: string,
  statusCode: string,
  grossAmount: string,
  serverKey = MIDTRANS_SERVER_KEY
): string => {
  const rawString = `${orderId}${statusCode}${grossAmount}${serverKey}`;
  return crypto.createHash("sha512").update(rawString).digest("hex");
};

export const verifyMidtransSignature = (
  payload: {
    order_id: string;
    status_code: string;
    gross_amount: string;
    signature_key: string;
    [key: string]: any;
  },
  serverKey = MIDTRANS_SERVER_KEY
): boolean => {
  const expectedSignature = generateMidtransSignature(
    payload.order_id,
    payload.status_code,
    payload.gross_amount,
    serverKey
  );
  return payload.signature_key === expectedSignature;
};

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

  // Check if booking has expired (2 minutes from creation)
  const now = new Date();
  const twoMinutesAgo = new Date(now.getTime() - 2 * 60 * 1000);
  if (order.createdAt < twoMinutesAgo) {
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
        : new Date(order.createdAt.getTime() + 2 * 60 * 1000);

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

  // Construct Midtrans Core API QRIS Payload
  const itemDetails = order.tickets.map((t) => ({
    id: t.id,
    price: Math.round(order.schedule.ticketPrice),
    quantity: 1,
    name: `${order.schedule.movie.title.substring(0, 30)} (Seat ${t.showtimeSeat.seat.seatLabel})`,
  }));

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
      expiry_duration: 2,
      unit: "minute",
    },
  };

  const authHeader = `Basic ${Buffer.from(MIDTRANS_SERVER_KEY + ":").toString("base64")}`;

  let transactionId = "";
  let qrUrl = "";
  let qrString = "";
  let rawMidtransResponse: any = null;
  let expiredAt = new Date(Date.now() + 2 * 60 * 1000);

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
    // If external Midtrans API fails in test/mock environment or server key not active, provide deterministic mock
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

export const createSnapTransaction = async (orderId: string) => {
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
      `Cannot generate Snap token for order in ${order.orderStatus} status`
    );
  }

  // If a valid snapToken already exists on the pending payment, return it
  const existingPayment = order.payments.find(
    (p) => p.status === "PENDING" && p.snapToken
  );
  if (existingPayment && existingPayment.snapToken) {
    return {
      token: existingPayment.snapToken,
      redirect_url: existingPayment.redirectUrl || "",
      orderId: order.id,
      orderNumber: order.orderNumber,
      totalAmount: order.totalAmount,
    };
  }

  // Construct Midtrans Snap Payload
  const itemDetails = order.tickets.map((t) => ({
    id: t.id,
    price: Math.round(order.schedule.ticketPrice),
    quantity: 1,
    name: `${order.schedule.movie.title.substring(0, 30)} (Seat ${t.showtimeSeat.seat.seatLabel})`,
  }));

  const snapPayload = {
    transaction_details: {
      order_id: order.orderNumber,
      gross_amount: Math.round(order.totalAmount),
    },
    item_details: itemDetails,
    customer_details: {
      first_name: order.customerName || "Customer",
      phone: order.customerPhone || "",
      ...(order.customerEmail && { email: order.customerEmail }),
    },
    expiry: {
      unit: "minutes",
      duration: 2,
    },
  };

  const authHeader = `Basic ${Buffer.from(MIDTRANS_SERVER_KEY + ":").toString("base64")}`;

  let snapToken = "";
  let redirectUrl = "";

  try {
    const response = await fetch(`${MIDTRANS_SNAP_BASE_URL}/transactions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        Authorization: authHeader,
      },
      body: JSON.stringify(snapPayload),
    });

    const data: any = await response.json();

    if (!response.ok || !data.token) {
      throw new Error(data.error_messages?.join(", ") || data.message || "Failed to create Midtrans Snap transaction");
    }

    snapToken = data.token;
    redirectUrl = data.redirect_url;
  } catch (err: any) {
    // If external Midtrans API fails (e.g. sandbox offline or test environment), provide deterministic fallback
    if (process.env.NODE_ENV === "test" || !process.env.MIDTRANS_SERVER_KEY) {
      snapToken = `mock-snap-token-${order.orderNumber}`;
      redirectUrl = `https://app.sandbox.midtrans.com/snap/v2/vtweb/${snapToken}`;
    } else {
      throw new AppError("SERVICE_UNAVAILABLE", `Midtrans Snap gateway error: ${err.message}`);
    }
  }

  // Save snapToken on Payment record
  const pendingPayment = order.payments.find((p) => p.status === "PENDING");
  if (pendingPayment) {
    await prisma.payment.update({
      where: { id: pendingPayment.id },
      data: {
        provider: "MIDTRANS",
        snapToken,
        redirectUrl,
        paymentType: "MIDTRANS_SNAP",
        providerOrderId: order.orderNumber,
      },
    });
  } else {
    await prisma.payment.create({
      data: {
        orderId: order.id,
        amount: order.totalAmount,
        status: "PENDING",
        provider: "MIDTRANS",
        snapToken,
        redirectUrl,
        paymentType: "MIDTRANS_SNAP",
        providerOrderId: order.orderNumber,
        expiredAt: new Date(Date.now() + 2 * 60 * 1000),
      },
    });
  }

  return {
    token: snapToken,
    redirect_url: redirectUrl,
    orderId: order.id,
    orderNumber: order.orderNumber,
    totalAmount: order.totalAmount,
  };
};

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
