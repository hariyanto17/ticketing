import { prisma } from "../../utils/prisma";
import { AppError } from "../../utils/errorHandler";

export const validateTicket = async (ticketNumber: string) => {
  const ticket = await prisma.ticket.findUnique({
    where: { ticketNumber },
    include: {
      order: {
        include: {
          cashier: { select: { id: true, name: true } },
        },
      },
      showtimeSeat: {
        include: {
          showtime: {
            include: {
              movie: { select: { id: true, title: true } },
              studio: { select: { id: true, name: true, code: true } },
            },
          },
          seat: true,
        },
      },
    },
  });

  if (!ticket) {
    return { status: "NOT_FOUND", ticket: null };
  }

  if (ticket.status === "CANCELLED") {
    return { status: "CANCELLED", ticket };
  }

  if (ticket.status === "USED") {
    return { status: "USED", ticket };
  }

  if (ticket.status === "PENDING") {
    return { status: "PENDING_PAYMENT", ticket };
  }

  if (ticket.status !== "ACTIVE") {
    return { status: "INVALID", ticket };
  }

  // Only if ACTIVE, mark as USED
  const updatedTicket = await prisma.ticket.update({
    where: { id: ticket.id },
    data: { status: "USED" },
    include: {
      order: {
        include: {
          cashier: { select: { id: true, name: true } },
        },
      },
      showtimeSeat: {
        include: {
          showtime: {
            include: {
              movie: { select: { id: true, title: true } },
              studio: { select: { id: true, name: true, code: true } },
            },
          },
          seat: true,
        },
      },
    },
  });

  return { status: "VALID", ticket: updatedTicket };
};

export const reprintTicket = async (ticketId: string, userId: string, reason: string) => {
  const ticket = await prisma.ticket.findUnique({ where: { id: ticketId } });
  if (!ticket) {
    throw new AppError("NOT_FOUND", "Ticket not found");
  }

  // Create reprint log
  return prisma.ticketReprint.create({
    data: {
      ticketId,
      reprintedById: userId,
      reason,
    },
    include: {
      ticket: true,
      reprintedBy: { select: { id: true, name: true } },
    },
  });
};

/**
 * Kiosk Self-Service Ticket Lookup
 * Finds order & tickets by Order Number, Booking Number, Ticket Number, QR Code string, or Customer Phone
 */
export const kioskLookupOrder = async (query: string) => {
  const trimmed = query.trim();

  // 1. Try finding order by Order Number, Booking Number, or ID directly
  let order = await prisma.order.findFirst({
    where: {
      OR: [
        { orderNumber: trimmed },
        { bookingNumber: trimmed },
        { id: trimmed },
      ],
    },
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

  // 2. If not found, try finding via ticketNumber or qrCode
  if (!order) {
    const ticket = await prisma.ticket.findFirst({
      where: {
        OR: [
          { ticketNumber: trimmed },
          { qrCode: trimmed },
        ],
      },
      select: { orderId: true },
    });

    if (ticket?.orderId) {
      order = await prisma.order.findUnique({
        where: { id: ticket.orderId },
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
    }
  }

  // 3. If still not found and query looks like phone number, find latest PAID order for phone
  if (!order && (trimmed.startsWith("08") || trimmed.startsWith("+62") || /^\d{8,15}$/.test(trimmed))) {
    order = await prisma.order.findFirst({
      where: {
        customerPhone: trimmed,
        orderStatus: "PAID",
      },
      orderBy: { createdAt: "desc" },
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
  }

  if (!order) {
    throw new AppError("NOT_FOUND", "Pesanan atau tiket tidak ditemukan. Periksa kembali nomor booking / QR Anda.");
  }

  if (order.orderStatus === "CANCELLED") {
    throw new AppError("BAD_REQUEST", "Pesanan ini telah dibatalkan.");
  }

  if (order.orderStatus === "PENDING" || order.paymentStatus === "PENDING") {
    throw new AppError("BAD_REQUEST", "Pesanan belum lunas. Harap selesaikan pembayaran terlebih dahulu.");
  }

  const latestPayment = order.payments?.[0];

  return {
    orderId: order.id,
    orderNumber: order.orderNumber,
    bookingNumber: order.bookingNumber || order.orderNumber,
    customerName: order.customerName || "Pengunjung",
    customerPhone: order.customerPhone || "-",
    customerEmail: order.customerEmail || "-",
    totalAmount: order.totalAmount,
    orderStatus: order.orderStatus,
    paymentStatus: order.paymentStatus,
    paidAt: latestPayment?.paidAt || order.createdAt,
    paymentType: order.paymentMethod || latestPayment?.paymentType || "QRIS",
    movie: {
      id: order.schedule?.movie?.id,
      title: order.schedule?.movie?.title || "Film Bioskop",
      poster: order.schedule?.movie?.poster || null,
      durationMinutes: order.schedule?.movie?.durationMinutes || 0,
      censorshipRating: order.schedule?.movie?.censorshipRating || "SU",
    },
    studio: {
      id: order.schedule?.studio?.id,
      name: order.schedule?.studio?.name || "Studio 1",
      code: order.schedule?.studio?.code || "S1",
      type: order.schedule?.studio?.type || "REGULAR",
    },
    showtime: {
      id: order.schedule?.id,
      businessDate: order.schedule?.businessDate || order.schedule?.startTime,
      startTime: order.schedule?.startTime,
      endTime: order.schedule?.endTime,
      ticketPrice: order.schedule?.ticketPrice || 0,
    },
    tickets: order.tickets.map((t) => ({
      id: t.id,
      ticketNumber: t.ticketNumber,
      qrCode: t.qrCode || t.ticketNumber,
      status: t.status,
      seatLabel: t.showtimeSeat?.seat?.seatLabel || "-",
      row: t.showtimeSeat?.seat?.row || "-",
      seatNumber: t.showtimeSeat?.seat?.seatNumber || 0,
      seatType: t.showtimeSeat?.seat?.seatType || "REGULAR",
      price: order.schedule?.ticketPrice || 0,
    })),
  };
};

/**
 * Log Kiosk Ticket Printing event
 */
export const logKioskPrint = async (orderId: string, operatorId?: string) => {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: { tickets: true },
  });

  if (!order) {
    throw new AppError("NOT_FOUND", "Pesanan tidak ditemukan");
  }

  // Create reprint log entries if printed again
  if (operatorId && order.tickets.length > 0) {
    for (const ticket of order.tickets) {
      await prisma.ticketReprint.create({
        data: {
          ticketId: ticket.id,
          reprintedById: operatorId,
          reason: "KIOSK_SELF_SERVICE_PRINT",
        },
      }).catch(() => {});
    }
  }

  return {
    success: true,
    orderId: order.id,
    orderNumber: order.orderNumber,
    ticketsCount: order.tickets.length,
    printedAt: new Date().toISOString(),
  };
};
