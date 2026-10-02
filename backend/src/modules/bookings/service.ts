import { prisma } from "../../utils/prisma";
import { AppError } from "../../utils/errorHandler";
import { CreateBookingInput } from "./validation";
import { emitSeatUpdate } from "../../utils/socket";
import { getSettings } from "../settings/service";
import { cleanupExpiredBookings } from "./bookingLifecycle";

export { cleanupExpiredBookings, confirmBookingPayment, cancelBooking } from "./bookingLifecycle";

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

  const settings = await getSettings();
  const channel = input.channel?.toUpperCase() || "ONLINE";
  const isOnline = channel === "MOBILE" || channel === "ONLINE" || channel === "GUEST";
  const feePerTicket = isOnline ? Number(settings.onlineServiceFee || 4000) : 0;
  const totalOnlineServiceFee = feePerTicket * showtimeSeats.length;
  const totalAmount = showtimeSeats.length * schedule.ticketPrice + totalOnlineServiceFee;
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
      if (!existing) {
        isUnique = true;
      } else {
        const retryEntropy = Math.random().toString(36).substring(2, 7).toUpperCase();
        orderNumber = `ORD-${dateStr}-${serial}-${retryEntropy}`;
        bookingNumber = `BOOK-${dateStr}-${serial}-${retryEntropy}`;
        attempts++;
      }
    }

    // 1. Create Order with PENDING status
    const order = await tx.order.create({
      data: {
        orderNumber,
        bookingNumber,
        scheduleId: input.scheduleId,
        branchId: schedule.studio.branchId,
        channel,
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
          status: "PENDING",
        },
        include: {
          showtimeSeat: {
            include: {
              seat: true,
            },
          },
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

export const lookupBooking = async (query: string) => {
  await cleanupExpiredBookings();

  const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000);

  return prisma.order.findMany({
    where: {
      OR: [
        { id: query },
        { orderNumber: query },
        { bookingNumber: query },
        { customerPhone: query },
      ],
      schedule: {
        startTime: {
          gte: twoHoursAgo,
        },
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
    orderBy: {
      createdAt: "desc",
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
