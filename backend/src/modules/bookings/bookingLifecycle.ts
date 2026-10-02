import { prisma } from "../../utils/prisma";
import { AppError } from "../../utils/errorHandler";
import { emitSeatUpdate } from "../../utils/socket";

export const cleanupExpiredBookings = async () => {
  const now = new Date();
  const tenMinutesAgo = new Date(now.getTime() - 10 * 60 * 1000);

  // 1. Auto-release any expired HOLD seats whose reservedUntil has passed
  const expiredHeldSeats = await prisma.showtimeSeat.findMany({
    where: {
      status: "HOLD",
      reservedUntil: { lt: now },
    },
    select: { id: true, seatId: true, showtimeId: true },
  });

  if (expiredHeldSeats.length > 0) {
    await prisma.showtimeSeat.updateMany({
      where: { id: { in: expiredHeldSeats.map((s) => s.id) } },
      data: {
        status: "AVAILABLE",
        reservedUntil: null,
      },
    });

    const grouped = expiredHeldSeats.reduce((acc, s) => {
      if (!acc[s.showtimeId]) acc[s.showtimeId] = [];
      acc[s.showtimeId].push(s.seatId);
      return acc;
    }, {} as Record<string, string[]>);

    for (const [showtimeId, seatIds] of Object.entries(grouped)) {
      emitSeatUpdate("seats_released", { showtimeId, seatIds });
    }
  }

  // 2. Find expired pending bookings older than 10 minutes
  const expiredOrders = await prisma.order.findMany({
    where: {
      orderStatus: "PENDING",
      createdAt: {
        lt: tenMinutesAgo,
      },
    },
    include: {
      tickets: true,
    },
  });

  for (const order of expiredOrders) {
    await prisma.$transaction(async (tx) => {
      // 1. Cancel tickets
      await tx.ticket.updateMany({
        where: { orderId: order.id },
        data: { status: "CANCELLED" },
      });

      // 2. Release seats
      const seatIds = order.tickets.map((t) => t.showtimeSeatId);
      await tx.showtimeSeat.updateMany({
        where: { id: { in: seatIds } },
        data: {
          status: "AVAILABLE",
          reservedUntil: null,
        },
      });

      // 3. Mark payment as FAILED
      await tx.payment.updateMany({
        where: { orderId: order.id, status: "PENDING" },
        data: { status: "FAILED" },
      });

      // 4. Cancel order
      await tx.order.update({
        where: { id: order.id },
        data: {
          orderStatus: "CANCELLED",
          paymentStatus: "FAILED",
        },
      });

      // Query seat details to broadcast release
      const showtimeSeats = await tx.showtimeSeat.findMany({
        where: { id: { in: seatIds } },
        select: { seatId: true },
      });

      emitSeatUpdate("seats_released", {
        showtimeId: order.scheduleId,
        seatIds: showtimeSeats.map((s) => s.seatId),
      });
    });
  }
};

export const confirmBookingPayment = async (
  orderId: string,
  paymentData?: {
    providerTransactionId?: string;
    paymentType?: string;
    provider?: string;
    rawResponse?: any;
  }
) => {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: { tickets: true, payments: true },
  });

  if (!order) throw new AppError("NOT_FOUND", "Booking order not found");

  // IDEMPOTENCY GUARD: If order is already PAID, return gracefully
  if (order.orderStatus === "PAID") {
    return order;
  }

  if (order.orderStatus !== "PENDING" && order.orderStatus !== "CANCELLED") {
    throw new AppError(
      "BAD_REQUEST",
      `Cannot confirm payment for order in ${order.orderStatus} status`
    );
  }

  return prisma.$transaction(async (tx) => {
    // 1. Update Order status to PAID
    const updatedOrder = await tx.order.update({
      where: { id: orderId },
      data: {
        orderStatus: "PAID",
        paymentStatus: "PAID",
      },
    });

    // 2. Update or Create Payment record to PAID with paidAt timestamp
    const latestPayment = order.payments[order.payments.length - 1];
    if (latestPayment) {
      await tx.payment.update({
        where: { id: latestPayment.id },
        data: {
          status: "PAID",
          paidAt: new Date(),
          ...(paymentData?.provider && { provider: paymentData.provider }),
          ...(paymentData?.paymentType && { paymentType: paymentData.paymentType }),
          ...(paymentData?.providerTransactionId && {
            providerTransactionId: paymentData.providerTransactionId,
          }),
          ...(paymentData?.rawResponse && { rawResponse: paymentData.rawResponse }),
        },
      });
    } else {
      await tx.payment.create({
        data: {
          orderId,
          amount: order.totalAmount,
          status: "PAID",
          paidAt: new Date(),
          provider: paymentData?.provider || "MANUAL",
          paymentType: paymentData?.paymentType || "QRIS",
          ...(paymentData?.providerTransactionId && {
            providerTransactionId: paymentData.providerTransactionId,
          }),
          ...(paymentData?.rawResponse && { rawResponse: paymentData.rawResponse }),
        },
      });
    }

    // 3. Activate Tickets (set to ACTIVE)
    await tx.ticket.updateMany({
      where: {
        orderId,
      },
      data: {
        status: "ACTIVE",
      },
    });

    // 4. Mark seats as SOLD
    const seatIds = order.tickets.map((t) => t.showtimeSeatId);
    await tx.showtimeSeat.updateMany({
      where: { id: { in: seatIds } },
      data: {
        status: "SOLD",
        reservedUntil: null,
      },
    });

    // Fetch seat details for broadcast
    const showtimeSeats = await tx.showtimeSeat.findMany({
      where: { id: { in: seatIds } },
      select: { seatId: true },
    });

    emitSeatUpdate("seats_sold", {
      showtimeId: order.scheduleId,
      seatIds: showtimeSeats.map((s) => s.seatId),
    });

    return updatedOrder;
  });
};

export const cancelBooking = async (orderId: string) => {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: { tickets: true, payments: true },
  });

  if (!order) throw new AppError("NOT_FOUND", "Booking order not found");

  if (order.orderStatus === "CANCELLED") {
    return order; // Idempotent cancellation
  }

  if (order.orderStatus !== "PENDING") {
    throw new AppError("BAD_REQUEST", "Only PENDING bookings can be cancelled");
  }

  return prisma.$transaction(async (tx) => {
    // 1. Cancel Tickets
    await tx.ticket.updateMany({
      where: { orderId },
      data: { status: "CANCELLED" },
    });

    // 2. Mark Payment as FAILED
    await tx.payment.updateMany({
      where: { orderId, status: "PENDING" },
      data: { status: "FAILED" },
    });

    // 3. Release seats
    const seatIds = order.tickets.map((t) => t.showtimeSeatId);
    await tx.showtimeSeat.updateMany({
      where: { id: { in: seatIds } },
      data: {
        status: "AVAILABLE",
        reservedUntil: null,
      },
    });

    // 4. Cancel order
    const updatedOrder = await tx.order.update({
      where: { id: orderId },
      data: {
        orderStatus: "CANCELLED",
        paymentStatus: "FAILED",
      },
    });

    const showtimeSeats = await tx.showtimeSeat.findMany({
      where: { id: { in: seatIds } },
      select: { seatId: true },
    });

    emitSeatUpdate("seats_released", {
      showtimeId: order.scheduleId,
      seatIds: showtimeSeats.map((s) => s.seatId),
    });

    return updatedOrder;
  });
};
