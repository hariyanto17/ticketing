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

      // 3. Cancel order
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

  // Fetch showtime seats
  const showtimeSeats = await prisma.showtimeSeat.findMany({
    where: {
      showtimeId: input.scheduleId,
      seatId: { in: input.seatIds },
    },
    include: { seat: true },
  });

  if (showtimeSeats.length !== input.seatIds.length) {
    throw new AppError("BAD_REQUEST", "Some selected seats are invalid for this schedule");
  }

  const now = new Date();
  for (const sSeat of showtimeSeats) {
    if (sSeat.status === "SOLD") {
      throw new AppError("BAD_REQUEST", `Seat ${sSeat.seat.seatLabel} is already sold`);
    }
    if (sSeat.status === "HOLD" && sSeat.reservedUntil && sSeat.reservedUntil > now) {
      throw new AppError("CONFLICT", `Seat ${sSeat.seat.seatLabel} is currently held by another session`);
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
    const orderNumber = `ORD-${dateStr}-${serial}`;
    const bookingNumber = `BOOK-${dateStr}-${serial}`;

    // Create Order
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

    // Create Tickets and hold seats
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

    return { order, tickets };
  });
};

export const confirmBookingPayment = async (orderId: string) => {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: { tickets: true },
  });

  if (!order) throw new AppError("NOT_FOUND", "Booking order not found");
  if (order.orderStatus !== "PENDING") {
    throw new AppError("BAD_REQUEST", "Only PENDING bookings can have payment confirmed");
  }

  return prisma.$transaction(async (tx) => {
    // 1. Update Order status
    const updatedOrder = await tx.order.update({
      where: { id: orderId },
      data: {
        orderStatus: "PAID",
        paymentStatus: "PAID",
      },
    });

    // 2. Create Payment
    await tx.payment.create({
      data: {
        orderId,
        amount: order.totalAmount,
        status: "PAID",
      },
    });

    // 3. Mark seats as SOLD
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
    include: { tickets: true },
  });

  if (!order) throw new AppError("NOT_FOUND", "Booking order not found");
  if (order.orderStatus !== "PENDING") {
    throw new AppError("BAD_REQUEST", "Only PENDING bookings can be cancelled");
  }

  return prisma.$transaction(async (tx) => {
    // 1. Cancel Tickets
    await tx.ticket.updateMany({
      where: { orderId },
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

    // 3. Cancel order
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
