import { prisma } from "../../utils/prisma";
import { AppError } from "../../utils/errorHandler";
import { CheckoutInput } from "./validation";
import { emitSeatUpdate } from "../../utils/socket";
import { calculatePromotionDiscount } from "../promotions/service";

interface GetOrdersQuery {
  page?: number;
  limit?: number;
  search?: string;
  cashierId?: string;
  channel?: string;
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

  if (query.channel) {
    where.channel = query.channel;
  }

  if (query.search) {
    where.OR = [
      { orderNumber: { contains: query.search, mode: "insensitive" } },
      { bookingNumber: { contains: query.search, mode: "insensitive" } },
      { customerName: { contains: query.search, mode: "insensitive" } },
      { customerPhone: { contains: query.search, mode: "insensitive" } },
    ];
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
        promotion: true,
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
      promotion: true,
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
  }

  // Promotions logic
  let promotion: any = null;
  if (input.promotionId || input.promoCode) {
    promotion = await prisma.promotion.findFirst({
      where: input.promotionId
        ? { id: input.promotionId }
        : { code: input.promoCode },
      include: {
        movies: true,
      },
    });

    if (!promotion) {
      throw new AppError("NOT_FOUND", "Promo tidak ditemukan");
    }

    if (promotion.branchId && promotion.branchId !== branchId) {
      throw new AppError("BAD_REQUEST", "Promo tidak berlaku untuk cabang ini");
    }
  }

  const subtotal = showtimeSeats.length * schedule.ticketPrice;
  let discountAmount = 0;
  let totalAmount = subtotal;
  let freeTicketsCount = 0;
  let usedQuotaIncrement = 0;
  let promoSnapshot: any = null;

  if (promotion) {
    const promoCalc = calculatePromotionDiscount(
      promotion,
      showtimeSeats.length,
      schedule.ticketPrice,
      schedule.movieId
    );
    discountAmount = promoCalc.discountAmount;
    totalAmount = promoCalc.finalAmount;
    freeTicketsCount = promoCalc.freeTicketsCount;
    usedQuotaIncrement = promoCalc.usedQuotaIncrement;
    promoSnapshot = {
      promotionId: promotion.id,
      name: promotion.name,
      code: promotion.code,
      promoType: promotion.promoType,
      discountPercent: promotion.discountPercent,
      discountAmount,
      freeTicketsCount,
      details: promoCalc.details,
    };
  }

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
    // Atomic quota validation and consumption
    if (promotion && usedQuotaIncrement > 0) {
      const currentPromo = await tx.promotion.findUnique({
        where: { id: promotion.id },
        include: { movies: true },
      });
      if (!currentPromo || !currentPromo.isActive) {
        throw new AppError("BAD_REQUEST", "Promo sudah tidak aktif");
      }
      if (currentPromo.movies && currentPromo.movies.length > 0) {
        const isAllowed = currentPromo.movies.some((pm) => pm.movieId === schedule.movieId);
        if (!isAllowed) {
          throw new AppError("BAD_REQUEST", `Promo '${currentPromo.name}' tidak berlaku untuk film ini`);
        }
      }
      if (currentPromo.quota - currentPromo.usedQuota < usedQuotaIncrement) {
        throw new AppError("BAD_REQUEST", "Sisa kuota tiket promo tidak mencukupi");
      }

      await tx.promotion.update({
        where: { id: promotion.id },
        data: {
          usedQuota: { increment: usedQuotaIncrement },
        },
      });
    }

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
    const entropy = Math.random().toString(36).substring(2, 7).toUpperCase();
    let orderNumber = `ORD-${dateStr}-${serial}-${entropy}`;

    let isUnique = false;
    let attempts = 0;
    while (!isUnique && attempts < 10) {
      const existing = await tx.order.findUnique({ where: { orderNumber } });
      if (existing) {
        const nextEntropy = Math.random().toString(36).substring(2, 7).toUpperCase();
        orderNumber = `ORD-${dateStr}-${serial}-${nextEntropy}`;
        attempts++;
      } else {
        isUnique = true;
      }
    }

    // Create Order
    const order = await tx.order.create({
      data: {
        orderNumber,
        cashierId,
        scheduleId: input.scheduleId,
        branchId,
        channel: "POS",
        subtotal,
        discountAmount,
        totalAmount,
        promotionId: promotion ? promotion.id : null,
        promoSnapshot,
        paymentMethod: input.paymentMethod,
        paymentStatus: "PAID",
        orderStatus: "PAID",
      },
      include: {
        promotion: true,
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
        paidAt: now,
        provider: "MANUAL",
        paymentType: input.paymentMethod,
      },
    });

    // Create Tickets and update seats
    const tickets: any[] = [];
    const orderSuffix = orderNumber.replace(`ORD-${dateStr}-`, "");
    for (let idx = 0; idx < showtimeSeats.length; idx++) {
      const sSeat = showtimeSeats[idx];
      const ticketSerial = String(idx + 1).padStart(3, "0");
      let ticketNumber = `PCM-${dateStr}-${orderSuffix}-${ticketSerial}`;

      let ticketUnique = false;
      let ticketAttempts = 0;
      while (!ticketUnique && ticketAttempts < 5) {
        const existingTicket = await tx.ticket.findUnique({ where: { ticketNumber } });
        if (existingTicket) {
          const ticketEntropy = Math.random().toString(36).substring(2, 6).toUpperCase();
          ticketNumber = `PCM-${dateStr}-${orderSuffix}-${ticketSerial}-${ticketEntropy}`;
          ticketAttempts++;
        } else {
          ticketUnique = true;
        }
      }

      let isFree = false;
      let ticketDiscount = 0;
      if (promotion) {
        if (promotion.promoType === "BUY_X_GET_Y") {
          // Free tickets applied to the last freeTicketsCount tickets
          if (idx >= showtimeSeats.length - freeTicketsCount) {
            isFree = true;
            ticketDiscount = schedule.ticketPrice;
          }
        } else if (promotion.promoType === "PERCENTAGE") {
          ticketDiscount = discountAmount / showtimeSeats.length;
        }
      }

      const ticket = await tx.ticket.create({
        data: {
          ticketNumber,
          orderId: order.id,
          showtimeSeatId: sSeat.id,
          price: schedule.ticketPrice,
          discountAmount: ticketDiscount,
          isFree,
          qrCode: ticketNumber,
          status: "ACTIVE",
        },
        include: {
          showtimeSeat: {
            include: {
              seat: true,
            },
          },
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
    // 1. Restore Promotion Quota if applicable
    if (order.promotionId && order.promoSnapshot) {
      const snap: any = order.promoSnapshot;
      const promoType = snap.promoType;
      const usedIncrement = snap.freeTicketsCount ?? (promoType === "PERCENTAGE" ? order.tickets.length : 0);
      if (usedIncrement > 0) {
        await tx.promotion.update({
          where: { id: order.promotionId },
          data: {
            usedQuota: { decrement: usedIncrement },
          },
        }).catch(() => {});
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

