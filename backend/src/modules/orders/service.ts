import { prisma } from "../../utils/prisma";
import { AppError } from "../../utils/errorHandler";
import { CheckoutInput } from "./validation";
import { emitSeatUpdate } from "../../utils/socket";

interface GetOrdersQuery {
  page?: number;
  limit?: number;
  search?: string;
  cashierId?: string;
  startDate?: string;
  endDate?: string;
}

export const getAllOrders = async (query: GetOrdersQuery) => {
  const page = Number(query.page) || 1;
  const limit = Number(query.limit) || 10;
  const skip = (page - 1) * limit;

  const where: any = {};

  if (query.cashierId) {
    where.cashierId = query.cashierId;
  }

  if (query.search) {
    where.orderNumber = { contains: query.search, mode: "insensitive" };
  }

  if (query.startDate || query.endDate) {
    where.createdAt = {};
    if (query.startDate) {
      where.createdAt.gte = new Date(query.startDate);
    }
    if (query.endDate) {
      // Set to end of the day
      const end = new Date(query.endDate);
      end.setHours(23, 59, 59, 999);
      where.createdAt.lte = end;
    }
  }

  const [orders, total] = await Promise.all([
    prisma.order.findMany({
      where,
      include: {
        cashier: { select: { id: true, name: true, username: true } },
        schedule: {
          include: {
            movie: { select: { id: true, title: true } },
            studio: { select: { id: true, name: true, code: true } },
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
      },
      skip,
      take: limit,
      orderBy: { createdAt: "desc" },
    }),
    prisma.order.count({ where }),
  ]);

  return {
    orders,
    meta: {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    },
  };
};

export const getOrderById = async (id: string) => {
  const order = await prisma.order.findUnique({
    where: { id },
    include: {
      cashier: { select: { id: true, name: true, username: true } },
      schedule: {
        include: {
          movie: { select: { id: true, title: true } },
          studio: { select: { id: true, name: true, code: true } },
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
  return order;
};

export const createCheckoutOrder = async (cashierId: string, branchId: string, input: CheckoutInput) => {
  // Verify Cash Drawer is open
  const activeDrawer = await prisma.cashDrawer.findFirst({
    where: { openedById: cashierId, status: "OPEN" },
  });
  if (!activeDrawer) {
    throw new AppError("BAD_REQUEST", "You must open a cash drawer session before selling tickets");
  }

  // Fetch showtime
  const schedule = await prisma.showtime.findUnique({
    where: { id: input.scheduleId },
  });
  if (!schedule) throw new AppError("NOT_FOUND", "Schedule not found");

  // Check if business date is closed
  const startOfDay = new Date(schedule.businessDate);
  startOfDay.setHours(0, 0, 0, 0);
  const endOfDay = new Date(schedule.businessDate);
  endOfDay.setHours(23, 59, 59, 999);

  const isClosed = await prisma.dailyClosing.findFirst({
    where: {
      businessDate: {
        gte: startOfDay,
        lte: endOfDay,
      },
    },
  });

  if (isClosed) {
    throw new AppError(
      "BAD_REQUEST",
      "Ticket sales are locked: the business date for this schedule has been closed"
    );
  }

  // Fetch showtime seats
  const showtimeSeats = await prisma.showtimeSeat.findMany({
    where: {
      showtimeId: input.scheduleId,
      seatId: { in: input.seatIds },
    },
    include: {
      seat: true,
    },
  });

  if (showtimeSeats.length !== input.seatIds.length) {
    throw new AppError("BAD_REQUEST", "Some selected seats are invalid for this schedule");
  }

  // Verify status of seats
  const now = new Date();
  for (const sSeat of showtimeSeats) {
    if (sSeat.status === "SOLD") {
      throw new AppError("BAD_REQUEST", `Seat ${sSeat.seat.seatLabel} is already sold`);
    }
    // If seat is on hold, check if hold is still active by another session
    if (sSeat.status === "HOLD" && sSeat.reservedUntil && sSeat.reservedUntil > now) {
      // For simplicity in cashiers MVP, cashier is allowed to proceed if they initiated it
      // In strict environment, we'd check session, but we will allow the sale to go through
    }
  }

  const totalAmount = showtimeSeats.length * schedule.ticketPrice;

  let amountReceived = input.amountReceived || totalAmount;
  let change = 0;

  if (input.paymentMethod === "CASH") {
    if (amountReceived < totalAmount) {
      throw new AppError("BAD_REQUEST", "Received payment amount is less than total amount");
    }
    change = amountReceived - totalAmount;
  } else {
    amountReceived = totalAmount;
    change = 0;
  }

  // Execute database transaction
  return prisma.$transaction(async (tx) => {
    // Generate order number ORD-YYYYMMDD-serial
    const dateStr = now.toISOString().split("T")[0].replace(/-/g, "");
    const count = await tx.order.count({
      where: {
        createdAt: {
          gte: new Date(now.getFullYear(), now.getMonth(), now.getDate()),
        },
      },
    });
    const serial = String(count + 1).padStart(5, "0");
    const orderNumber = `ORD-${dateStr}-${serial}`;

    // Create Order
    const order = await tx.order.create({
      data: {
        orderNumber,
        cashierId,
        scheduleId: input.scheduleId,
        branchId,
        totalAmount,
        paymentMethod: input.paymentMethod,
        paymentStatus: "PAID",
        orderStatus: "PAID",
      },
    });

    // Create Payment
    await tx.payment.create({
      data: {
        orderId: order.id,
        amount: totalAmount,
        amountReceived,
        change,
        status: "PAID",
      },
    });

    // Create Tickets and update seats
    const tickets: any[] = [];
    for (let idx = 0; idx < showtimeSeats.length; idx++) {
      const sSeat = showtimeSeats[idx];
      const ticketSerial = String(idx + 1).padStart(3, "0");
      const ticketNumber = `PCM-${dateStr}-${serial}-${ticketSerial}`;

      const ticket = await tx.ticket.create({
        data: {
          ticketNumber,
          orderId: order.id,
          showtimeSeatId: sSeat.id,
          qrCode: ticketNumber,
          status: "ACTIVE",
        },
      });

      // Update ShowtimeSeat status to SOLD
      await tx.showtimeSeat.update({
        where: { id: sSeat.id },
        data: {
          status: "SOLD",
          reservedUntil: null,
        },
      });

      tickets.push(ticket);
    }

    // Broadcast live seat updates
    emitSeatUpdate("seats_sold", {
      showtimeId: input.scheduleId,
      seatIds: input.seatIds,
    });

    return {
      order,
      tickets,
    };
  });
};

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

  return prisma.$transaction(async (tx) => {
    // 1. Update Order status
    const updatedOrder = await tx.order.update({
      where: { id: orderId },
      data: {
        orderStatus: "CANCELLED",
        paymentStatus: "FAILED",
      },
    });

    // 2. Update Payments
    await tx.payment.updateMany({
      where: { orderId },
      data: { status: "FAILED" },
    });

    // 3. Cancel Tickets
    await tx.ticket.updateMany({
      where: { orderId },
      data: { status: "CANCELLED" },
    });

    // 4. Release Showtime Seats
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

  return prisma.$transaction(async (tx) => {
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
      showtimeId: ticket.order.scheduleId,
      seatIds: [ticket.showtimeSeat.seatId],
    });

    return updatedTicket;
  });
};

