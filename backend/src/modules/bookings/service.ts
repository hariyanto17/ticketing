import { prisma } from "../../utils/prisma";
import { AppError } from "../../utils/errorHandler";
import { CreateBookingInput } from "./validation";
import { emitSeatUpdate } from "../../utils/socket";

export const cleanupExpiredBookings = async () => {
  const now = new Date();
  const tenMinutesAgo = new Date(now.getTime() - 10 * 60 * 1000);

  // Find expired pending bookings
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

export const createGuestBooking = async (input: CreateBookingInput) => {
  await cleanupExpiredBookings();

  // Fetch showtime and details
  const schedule = await prisma.showtime.findUnique({
    where: { id: input.scheduleId },
    include: { studio: true },
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

  // Fetch showtime seats and lazy-create if not yet initialized
  let showtimeSeats = await prisma.showtimeSeat.findMany({
    where: {
      showtimeId: input.scheduleId,
      seatId: { in: input.seatIds },
    },
    include: { seat: true },
  });

  if (showtimeSeats.length < input.seatIds.length) {
    const existingSeatIds = new Set(showtimeSeats.map((s) => s.seatId));
    const missingSeatIds = input.seatIds.filter((id) => !existingSeatIds.has(id));

    const validStudioSeats = await prisma.seat.findMany({
      where: {
        id: { in: missingSeatIds },
        studioId: schedule.studioId,
      },
    });

    if (validStudioSeats.length === missingSeatIds.length) {
      await prisma.showtimeSeat.createMany({
        data: validStudioSeats.map((s) => ({
          showtimeId: input.scheduleId,
          seatId: s.id,
          status: s.status === "DISABLED" ? "DISABLED" : "AVAILABLE",
        })),
        skipDuplicates: true,
      });

      showtimeSeats = await prisma.showtimeSeat.findMany({
        where: {
          showtimeId: input.scheduleId,
          seatId: { in: input.seatIds },
        },
        include: { seat: true },
      });
    }
  }

  if (showtimeSeats.length !== input.seatIds.length) {
    throw new AppError("BAD_REQUEST", "Some selected seats are invalid for this schedule");
  }

  const now = new Date();
  for (const sSeat of showtimeSeats) {
    if (sSeat.status === "SOLD") {
      throw new AppError("BAD_REQUEST", `Seat ${sSeat.seat.seatLabel} is already sold`);
    }
    if (sSeat.status === "HOLD" && sSeat.reservedUntil && sSeat.reservedUntil > now) {
      // If currently held, allow continuation for this checkout
    }
  }

  const totalAmount = showtimeSeats.length * schedule.ticketPrice;
  const reservedUntil = new Date(now.getTime() + 10 * 60 * 1000); // 10 minutes hold for online booking

  return prisma.$transaction(async (tx) => {
    // Generate Serial Order Number
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
    let bookingNumber = `BOOK-${dateStr}-${serial}-${entropy}`;

    let isUnique = false;
    let attempts = 0;
    while (!isUnique && attempts < 10) {
      const existing = await tx.order.findFirst({
        where: {
          OR: [{ orderNumber }, { bookingNumber }],
        },
      });
      if (existing) {
        const nextEntropy = Math.random().toString(36).substring(2, 7).toUpperCase();
        orderNumber = `ORD-${dateStr}-${serial}-${nextEntropy}`;
        bookingNumber = `BOOK-${dateStr}-${serial}-${nextEntropy}`;
        attempts++;
      } else {
        isUnique = true;
      }
    }

    // 1. Create Order in PENDING status
    const order = await tx.order.create({
      data: {
        orderNumber,
        bookingNumber,
        scheduleId: input.scheduleId,
        branchId: schedule.studio.branchId,
        totalAmount,
        paymentMethod: "QRIS",
        paymentStatus: "PENDING",
        orderStatus: "PENDING",
        customerName: input.customerName,
        customerPhone: input.customerPhone,
        customerEmail: input.customerEmail || null,
      },
    });

    // 2. Create Payment record in PENDING status (paidAt is null)
    const payment = await tx.payment.create({
      data: {
        orderId: order.id,
        amount: totalAmount,
        status: "PENDING",
        paidAt: null,
        provider: "MANUAL",
        paymentType: "QRIS",
        expiredAt: reservedUntil,
      },
    });

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

      // Clean up previous cancelled ticket on this seat if re-booked
      await tx.ticket.deleteMany({
        where: {
          showtimeSeatId: sSeat.id,
          status: "CANCELLED",
        },
      });

      const ticket = await tx.ticket.create({
        data: {
          ticketNumber,
          orderId: order.id,
          showtimeSeatId: sSeat.id,
          qrCode: ticketNumber,
          status: "PENDING", // Hardened: Tickets start as PENDING
        },
      });

      // Update ShowtimeSeat to HOLD
      await tx.showtimeSeat.update({
        where: { id: sSeat.id },
        data: {
          status: "HOLD",
          reservedUntil,
        },
      });

      tickets.push(ticket);
    }

    emitSeatUpdate("seats_held", {
      showtimeId: input.scheduleId,
      seatIds: input.seatIds,
    });

    return { order, tickets, payment };
  });
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

  if (order.orderStatus !== "PENDING") {
    throw new AppError(
      "BAD_REQUEST",
      `Only PENDING bookings can have payment confirmed (current status: ${order.orderStatus})`
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
    const existingPendingPayment = order.payments.find((p) => p.status === "PENDING");
    if (existingPendingPayment) {
      await tx.payment.update({
        where: { id: existingPendingPayment.id },
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

    // 3. Activate Tickets (PENDING -> ACTIVE)
    await tx.ticket.updateMany({
      where: {
        orderId,
        status: "PENDING",
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

export const lookupBooking = async (query: string) => {
  await cleanupExpiredBookings();

  return prisma.order.findMany({
    where: {
      OR: [
        { bookingNumber: query },
        { customerPhone: query },
      ],
    },
    include: {
      tickets: {
        include: {
          showtimeSeat: {
            include: { seat: true },
          },
        },
      },
      payments: true,
      schedule: {
        include: {
          movie: true,
          studio: true,
        },
      },
    },
  });
};

export const getAdminBookings = async () => {
  await cleanupExpiredBookings();

  return prisma.order.findMany({
    where: {
      bookingNumber: {
        not: null,
      },
    },
    include: {
      tickets: {
        include: {
          showtimeSeat: {
            include: { seat: true },
          },
        },
      },
      payments: true,
      schedule: {
        include: {
          movie: true,
          studio: true,
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });
};
