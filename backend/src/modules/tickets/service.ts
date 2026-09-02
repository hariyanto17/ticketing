import { prisma } from "../../utils/prisma";

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
    throw new (require("../../utils/errorHandler").AppError)("NOT_FOUND", "Ticket not found");
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
