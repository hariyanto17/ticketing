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

export const getFilmShowingDates = async (movieId: string) => {
  if (!movieId) return [];

  const settingsRecords = await prisma.setting.findMany();
  const timezone = settingsRecords.find((s) => s.key === "timezone")?.value || "Asia/Jakarta";

  const showtimes = await prisma.showtime.findMany({
    where: { movieId },
    select: { businessDate: true, startTime: true },
    orderBy: { startTime: "asc" },
  });

  const dateSet = new Set<string>();
  for (const s of showtimes) {
    const rawDate = s.businessDate || s.startTime;
    if (rawDate) {
      const dateStr = new Intl.DateTimeFormat("sv-SE", { timeZone: timezone }).format(new Date(rawDate));
      dateSet.add(dateStr);
    }
  }

  return Array.from(dateSet).sort();
};

export const getFilmSalesReport = async (movieId: string, showingDate: string, branchId?: string) => {
  if (!movieId || !showingDate) {
    throw new (require("../../utils/errorHandler").AppError)("BAD_REQUEST", "Movie ID and showing date are required");
  }

  const settingsRecords = await prisma.setting.findMany();
  const timezone = settingsRecords.find((s) => s.key === "timezone")?.value || "Asia/Jakarta";
  const cinemaNameSetting = settingsRecords.find((s) => s.key === "cinemaName")?.value;

  const movie = await prisma.movie.findUnique({
    where: { id: movieId },
    include: {
      distributor: { select: { id: true, name: true } },
      productionHouse: { select: { id: true, name: true } },
    },
  });

  if (!movie) {
    throw new (require("../../utils/errorHandler").AppError)("NOT_FOUND", "Movie not found");
  }

  // Determine date bounds in the target timezone
  const startOfDay = new Date(`${showingDate}T00:00:00`);
  const endOfDay = new Date(`${showingDate}T23:59:59.999`);

  const branch = branchId
    ? await prisma.branch.findUnique({ where: { id: branchId } })
    : await prisma.branch.findFirst();

  const cinemaName = cinemaNameSetting || branch?.name || "PLANET CINEMA";

  // Find showtimes matching this movie and date
  const showtimes = await prisma.showtime.findMany({
    where: {
      movieId,
      ...(branchId && { studio: { branchId } }),
      OR: [
        { businessDate: { gte: startOfDay, lte: endOfDay } },
        { startTime: { gte: startOfDay, lte: endOfDay } },
      ],
    },
    include: {
      studio: { select: { id: true, name: true, code: true, type: true, capacity: true } },
    },
    orderBy: { startTime: "asc" },
  });

  const showtimeIds = showtimes.map((s) => s.id);

  // Fetch valid orders for these showtimes
  const orders = showtimeIds.length > 0
    ? await prisma.order.findMany({
        where: {
          scheduleId: { in: showtimeIds },
          orderStatus: { in: ["PAID", "REFUNDED"] },
          paymentStatus: "PAID",
        },
        include: {
          tickets: {
            where: {
              status: { in: ["ACTIVE", "USED"] },
            },
          },
        },
      })
    : [];

  // Group tickets and calculate sales per showtime
  const showtimeStats = showtimes.map((s, idx) => {
    const showtimeOrders = orders.filter((o) => o.scheduleId === s.id);
    let paidTickets = 0;
    let sales = 0;

    for (const order of showtimeOrders) {
      const activeTickets = order.tickets.length;
      paidTickets += activeTickets;
      sales += activeTickets * s.ticketPrice;
    }

    const startDate = new Date(s.startTime);
    const timeStr = !isNaN(startDate.getTime())
      ? startDate.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", hour12: false, timeZone: timezone })
      : "-";

    return {
      index: idx + 1,
      scheduleId: s.id,
      time: timeStr,
      startTime: s.startTime,
      studioName: s.studio.name,
      studioCode: s.studio.code,
      seatGrade: s.studio.type || "REGULAR",
      ticketPrice: s.ticketPrice,
      paidTickets,
      freeTickets: 0,
      sales,
    };
  });

  const totals = showtimeStats.reduce(
    (acc, curr) => ({
      paidTickets: acc.paidTickets + curr.paidTickets,
      freeTickets: acc.freeTickets + curr.freeTickets,
      sales: acc.sales + curr.sales,
    }),
    { paidTickets: 0, freeTickets: 0, sales: 0 }
  );

  return {
    reportTitle: "TICKET SALES REPORT",
    distributor: movie.distributor?.name || movie.productionHouse?.name || "Mutiara Films",
    cinema: cinemaName,
    site: cinemaName,
    showingDate,
    movie: {
      id: movie.id,
      title: movie.title,
      format: "2D",
      censorshipRating: movie.censorshipRating || "SU",
      durationMinutes: movie.durationMinutes,
    },
    showtimes: showtimeStats,
    totals,
  };
};

export interface FilmSalesReportData {
  reportTitle: string;
  distributor: string;
  cinema: string;
  site: string;
  showingDate: string;
  movie: {
    id: string;
    title: string;
    format: string;
    censorshipRating: string;
    durationMinutes?: number | null;
  };
  showtimes: Array<{
    index: number;
    scheduleId: string;
    time: string;
    startTime: Date | string;
    studioName: string;
    studioCode: string;
    seatGrade: string;
    ticketPrice: number;
    paidTickets: number;
    freeTickets: number;
    sales: number;
  }>;
  totals: {
    paidTickets: number;
    freeTickets: number;
    sales: number;
  };
}

export const getScheduledMovies = async (branchId?: string) => {
  const movies = await prisma.movie.findMany({
    where: {
      showtimes: {
        some: {
          ...(branchId && { studio: { branchId } }),
        },
      },
    },
    select: {
      id: true,
      title: true,
      poster: true,
      censorshipRating: true,
      durationMinutes: true,
      status: true,
    },
    orderBy: { title: "asc" },
  });
  return movies;
};

