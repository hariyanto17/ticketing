import { prisma } from "../../utils/prisma";
import { AppError } from "../../utils/errorHandler";
import {
  MIDTRANS_SERVER_KEY,
  MIDTRANS_SNAP_BASE_URL,
  PLATFORM_URL,
  PLATFORM_INTERNAL_API_KEY,
} from "../../config/constant";
import { buildMidtransItemDetails } from "./midtransHelpers";

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

  const itemDetails = buildMidtransItemDetails(order);

  let snapToken = "";
  let redirectUrl = "";

  // Attempt via Central Platform Hub
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
        paymentType: "snap",
        customer: {
          name: order.customerName || "Customer",
          phone: order.customerPhone || "",
          ...(order.customerEmail && { email: order.customerEmail }),
        },
        itemDetails,
        expiryMinutes: 10,
      }),
    });

    if (platformResponse.ok) {
      const platformData: any = await platformResponse.json();
      if (platformData.status === "success" && platformData.data?.snapToken) {
        snapToken = platformData.data.snapToken;
        redirectUrl = platformData.data.qrUrl || platformData.data.redirectUrl || "";
        platformSuccess = true;
      }
    }
  } catch (err: any) {
    console.warn(`[Kasir-Ticket] Platform snap charge call failed, attempting fallback:`, err?.message || err);
  }

  if (!platformSuccess) {
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
        duration: 10,
      },
    };

    const authHeader = `Basic ${Buffer.from(MIDTRANS_SERVER_KEY + ":").toString("base64")}`;

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
      if (process.env.NODE_ENV === "test" || !process.env.MIDTRANS_SERVER_KEY) {
        snapToken = `mock-snap-token-${order.orderNumber}`;
        redirectUrl = `https://app.sandbox.midtrans.com/snap/v2/vtweb/${snapToken}`;
      } else {
        throw new AppError("SERVICE_UNAVAILABLE", `Midtrans Snap gateway error: ${err.message}`);
      }
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
        expiredAt: new Date(Date.now() + 10 * 60 * 1000),
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
