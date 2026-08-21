import { prisma } from "../../utils/prisma";

export const getOperationalReports = async () => {
  const orders = await prisma.order.findMany({
    include: {
      tickets: true,
      cashier: { select: { id: true, name: true } },
      schedule: {
        include: {
          movie: { select: { id: true, title: true } },
          studio: { select: { id: true, name: true, code: true } },
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  // 1. Daily Sales Report aggregation
  const dailySalesMap = new Map<string, { date: string; ticketCount: number; revenue: number; cash: number; qris: number; refund: number }>();

  // 2. Cashier Report aggregation
  const cashierMap = new Map<string, { cashierName: string; ticketsSold: number; revenue: number }>();

  // 3. Movie Report aggregation
  const movieMap = new Map<string, { movieTitle: string; ticketsSold: number }>();

  // 4. Schedule Report aggregation
  const scheduleMap = new Map<string, { scheduleId: string; movieTitle: string; studioCode: string; startTime: Date; seatsSold: number; revenue: number }>();

  for (const order of orders) {
    const isPaid = order.orderStatus === "PAID";
    const isRefunded = order.orderStatus === "REFUNDED";

    if (!isPaid && !isRefunded) continue;

    const dateStr = new Date(order.createdAt).toISOString().split("T")[0];
    const activeTicketsCount = order.tickets.filter((t) => t.status === "ACTIVE" || t.status === "USED").length;
    const cancelledTicketsCount = order.tickets.filter((t) => t.status === "CANCELLED").length;

    // Approximate ticket price
    const ticketPriceVal = activeTicketsCount > 0 ? order.totalAmount / activeTicketsCount : 50000;
    const refundAmt = cancelledTicketsCount * ticketPriceVal;

    // --- DAILY SALES ---
    const dailyEntry = dailySalesMap.get(dateStr) || { date: dateStr, ticketCount: 0, revenue: 0, cash: 0, qris: 0, refund: 0 };
    dailyEntry.ticketCount += activeTicketsCount;
    dailyEntry.revenue += order.totalAmount;
    if (order.paymentMethod === "CASH") dailyEntry.cash += order.totalAmount;
    if (order.paymentMethod === "QRIS") dailyEntry.qris += order.totalAmount;
    dailyEntry.refund += refundAmt;
    dailySalesMap.set(dateStr, dailyEntry);

    // --- CASHIER ---
    const cashierId = order.cashierId || "Online";
    const cashierName = order.cashier?.name || "Online Guest";
    const cashierEntry = cashierMap.get(cashierId) || { cashierName, ticketsSold: 0, revenue: 0 };
    cashierEntry.ticketsSold += activeTicketsCount;
    cashierEntry.revenue += order.totalAmount;
    cashierMap.set(cashierId, cashierEntry);

    // --- MOVIE ---
    const movieTitle = order.schedule?.movie?.title || "Unknown Movie";
    const movieEntry = movieMap.get(movieTitle) || { movieTitle, ticketsSold: 0 };
    movieEntry.ticketsSold += activeTicketsCount;
    movieMap.set(movieTitle, movieEntry);

    // --- SCHEDULE ---
    const schedId = order.scheduleId;
    const studioCode = order.schedule?.studio?.code || "TBD";
    const schedEntry = scheduleMap.get(schedId) || {
      scheduleId: schedId,
      movieTitle,
      studioCode,
      startTime: order.schedule?.startTime,
      seatsSold: 0,
      revenue: 0,
    };
    schedEntry.seatsSold += activeTicketsCount;
    schedEntry.revenue += order.totalAmount;
    scheduleMap.set(schedId, schedEntry);
  }

  return {
    dailySales: Array.from(dailySalesMap.values()),
    cashierReport: Array.from(cashierMap.values()),
    movieReport: Array.from(movieMap.values()),
    scheduleReport: Array.from(scheduleMap.values()),
  };
};
