import { prisma } from "../../utils/prisma";
import { AppError } from "../../utils/errorHandler";
import { emitSeatUpdate } from "../../utils/socket";
import { invalidateScheduleSeatCache } from "../../utils/redis";

export const voidOrder = async (orderId: string) => {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: {
      tickets: true,
      payments: true,
    },
  });

  if (!order) throw new AppError("NOT_FOUND", "Order not found");
  if (order.orderStatus === "CANCELLED" || order.orderStatus === "REFUNDED") {
    throw new AppError("BAD_REQUEST", "Order is already cancelled or refunded");
  }

  const result = await prisma.$transaction(async (tx) => {
    // 1. Restore Promotion Quota if applicable
    if (order.promotionId && order.promoSnapshot) {
      const snap: any = order.promoSnapshot;
      const promoType = snap.promoType;
      const usedIncrement = snap.freeTicketsCount ?? (promoType === "PERCENTAGE" ? order.tickets.length : 0);
      if (usedIncrement > 0) {
        await tx.promotion
          .update({
            where: { id: order.promotionId },
            data: {
              usedQuota: { decrement: usedIncrement },
            },
          })
          .catch(() => {});
      }
    }

    // 2. Update Order status
    const updatedOrder = await tx.order.update({
      where: { id: orderId },
      data: {
        orderStatus: "CANCELLED",
        paymentStatus: "FAILED",
      },
    });

    // 3. Update Payments
    await tx.payment.updateMany({
      where: { orderId },
      data: { status: "FAILED" },
    });

    // 4. Cancel Tickets
    await tx.ticket.updateMany({
      where: { orderId },
      data: { status: "CANCELLED" },
    });

    // 5. Release Showtime Seats
    const seatIds = order.tickets.map((t) => t.showtimeSeatId);
    await tx.showtimeSeat.updateMany({
      where: { id: { in: seatIds } },
      data: {
        status: "AVAILABLE",
        reservedUntil: null,
      },
    });

    // Get the seatIds details for socket broadcast
    const showtimeSeats = await tx.showtimeSeat.findMany({
      where: { id: { in: seatIds } },
      select: { seatId: true },
    });

    // Broadcast live seat updates
    emitSeatUpdate("seats_released", {
      showtimeId: order.scheduleId,
      seatIds: showtimeSeats.map((s) => s.seatId),
    });

    return updatedOrder;
  });

  await invalidateScheduleSeatCache(order.scheduleId);
  return result;
};


export const refundTicket = async (ticketId: string, reason: string) => {
  const ticket = await prisma.ticket.findUnique({
    where: { id: ticketId },
    include: {
      order: {
        include: {
          tickets: true,
        },
      },
      showtimeSeat: true,
    },
  });

  if (!ticket) throw new AppError("NOT_FOUND", "Ticket not found");
  if (ticket.status !== "ACTIVE") {
    throw new AppError("BAD_REQUEST", "Only ACTIVE tickets can be refunded");
  }
  const scheduleId = ticket.order.scheduleId;

  const result = await prisma.$transaction(async (tx) => {
    // 1. Cancel Ticket
    const updatedTicket = await tx.ticket.update({
      where: { id: ticketId },
      data: { status: "CANCELLED" },
    });

    // 2. Release seat
    await tx.showtimeSeat.update({
      where: { id: ticket.showtimeSeatId },
      data: {
        status: "AVAILABLE",
        reservedUntil: null,
      },
    });

    // 3. Update Order amounts
    const ticketsCount = ticket.order.tickets.length;
    const ticketRefundAmount = ticket.order.totalAmount / ticketsCount;
    const newTotalAmount = Math.max(0, ticket.order.totalAmount - ticketRefundAmount);

    const activeTicketsLeft = ticket.order.tickets.filter((t) => t.id !== ticketId && t.status === "ACTIVE").length;

    await tx.order.update({
      where: { id: ticket.orderId },
      data: {
        totalAmount: newTotalAmount,
        ...(activeTicketsLeft === 0 && {
          orderStatus: "REFUNDED",
          paymentStatus: "REFUNDED",
        }),
      },
    });

    // 4. Update Payment amount or state
    await tx.payment.updateMany({
      where: { orderId: ticket.orderId },
      data: {
        amount: newTotalAmount,
        ...(activeTicketsLeft === 0 && { status: "REFUNDED" }),
      },
    });

    // Broadcast live seat updates
    emitSeatUpdate("seats_released", {
      showtimeId: scheduleId,
      seatIds: [ticket.showtimeSeat.seatId],
    });

    return updatedTicket;
  });

  await invalidateScheduleSeatCache(scheduleId);
  return result;
};



