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

  // Split POS vs Online orders
  const posPaidOrders = paidOrders.filter(
    (o) => o.channel === "POS" || Boolean(o.cashierId && !o.bookingNumber)
  );
  const onlinePaidOrders = paidOrders.filter(
    (o) => o.channel === "ONLINE" || Boolean(o.bookingNumber && !o.cashierId)
  );

  // POS / Cashier breakdown
  const posCashRevenue = posPaidOrders
    .filter((o) => o.paymentMethod === "CASH")
    .reduce((sum, o) => sum + o.totalAmount, 0);
  const posQrisRevenue = posPaidOrders
    .filter((o) => o.paymentMethod === "QRIS")
    .reduce((sum, o) => sum + o.totalAmount, 0);
  const posRevenue = posCashRevenue + posQrisRevenue;
  const posTicketsSold = posPaidOrders.reduce(
    (sum, o) => sum + o.tickets.filter((t) => t.status === "ACTIVE" || t.status === "USED").length,
    0
  );
  const posTransactions = posPaidOrders.length;

  // Online / Mobile breakdown
  const onlineQrisRevenue = onlinePaidOrders.reduce((sum, o) => sum + o.totalAmount, 0);
  const onlineRevenue = onlineQrisRevenue;
  const onlineTicketsSold = onlinePaidOrders.reduce(
    (sum, o) => sum + o.tickets.filter((t) => t.status === "ACTIVE" || t.status === "USED").length,
    0
  );
  const onlineTransactions = onlinePaidOrders.length;

  // Total summary
  const totalRevenue = posRevenue + onlineRevenue;
  const cashRevenue = posCashRevenue;
  const qrisRevenue = posQrisRevenue + onlineQrisRevenue;
  const totalTicketsSold = posTicketsSold + onlineTicketsSold;
  const totalTransactions = paidOrders.length;

  // Total refunds: cancelled tickets
  const refundedTicketsCount = orders.reduce(
    (sum, o) => sum + o.tickets.filter((t) => t.status === "CANCELLED").length,
    0
  );
  const ticketPriceSample = paidOrders[0]?.totalAmount / (paidOrders[0]?.tickets.length || 1) || 50000;
  const totalRefunds = refundedTicketsCount * ticketPriceSample;

  return {
    isAlreadyClosed: !!existing,
    totalTicketsSold,
    totalRevenue,
    cashRevenue,
    qrisRevenue,
    posRevenue,
    posCashRevenue,
    posQrisRevenue,
    posTicketsSold,
    posTransactions,
    onlineRevenue,
    onlineQrisRevenue,
    onlineTicketsSold,
    onlineTransactions,
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
      posRevenue: summary.posRevenue,
      onlineRevenue: summary.onlineRevenue,
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
