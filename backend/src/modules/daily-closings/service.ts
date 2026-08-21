import { prisma } from "../../utils/prisma";
import { AppError } from "../../utils/errorHandler";

export const getDailyClosingSummary = async (businessDate: Date) => {
  const startOfDay = new Date(businessDate);
  startOfDay.setHours(0, 0, 0, 0);
  const endOfDay = new Date(businessDate);
  endOfDay.setHours(23, 59, 59, 999);

  // Check if already closed
  const existing = await prisma.dailyClosing.findFirst({
    where: {
      businessDate: {
        gte: startOfDay,
        lte: endOfDay,
      },
    },
  });

  const orders = await prisma.order.findMany({
    where: {
      schedule: {
        businessDate: {
          gte: startOfDay,
          lte: endOfDay,
        },
      },
    },
    include: {
      tickets: true,
    },
  });

  const paidOrders = orders.filter((o) => o.orderStatus === "PAID");
  const totalTransactions = paidOrders.length;
  
  const totalRevenue = paidOrders.reduce((sum, o) => sum + o.totalAmount, 0);
  const cashRevenue = paidOrders.filter((o) => o.paymentMethod === "CASH").reduce((sum, o) => sum + o.totalAmount, 0);
  const qrisRevenue = paidOrders.filter((o) => o.paymentMethod === "QRIS").reduce((sum, o) => sum + o.totalAmount, 0);

  // Tickets sold
  const totalTicketsSold = paidOrders.reduce((sum, o) => sum + o.tickets.filter(t => t.status === "ACTIVE" || t.status === "USED").length, 0);

  // Total refunds: cancelled tickets
  // Sum up approximate value or just count them
  const refundedTicketsCount = orders.reduce((sum, o) => sum + o.tickets.filter(t => t.status === "CANCELLED").length, 0);
  
  // Approximate refund cost
  const ticketPriceSample = paidOrders[0]?.totalAmount / (paidOrders[0]?.tickets.length || 1) || 50000;
  const totalRefunds = refundedTicketsCount * ticketPriceSample;

  return {
    isAlreadyClosed: !!existing,
    totalTicketsSold,
    totalRevenue,
    cashRevenue,
    qrisRevenue,
    totalRefunds,
    totalTransactions,
  };
};

export const createDailyClosing = async (userId: string, businessDate: Date) => {
  const summary = await getDailyClosingSummary(businessDate);
  if (summary.isAlreadyClosed) {
    throw new AppError("CONFLICT", "This business date has already been closed");
  }

  // Create closing record
  return prisma.dailyClosing.create({
    data: {
      businessDate,
      totalTicketsSold: summary.totalTicketsSold,
      totalRevenue: summary.totalRevenue,
      cashRevenue: summary.cashRevenue,
      qrisRevenue: summary.qrisRevenue,
      totalRefunds: summary.totalRefunds,
      totalTransactions: summary.totalTransactions,
      closedById: userId,
    },
  });
};

export const getClosingsHistory = async () => {
  return prisma.dailyClosing.findMany({
    include: {
      closedBy: { select: { id: true, name: true } },
    },
    orderBy: { businessDate: "desc" },
  });
};
