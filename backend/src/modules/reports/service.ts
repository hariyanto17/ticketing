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

export const getFilmShowingDates = async (movieId: string, branchId?: string) => {
  if (!movieId) return [];

  const branch = branchId
    ? await prisma.branch.findUnique({ where: { id: branchId } })
    : await prisma.branch.findFirst();

  const settingsRecords = await prisma.setting.findMany();
  const timezone = settingsRecords.find((s) => s.key === "timezone")?.value || branch?.timezone || process.env.TZ || "Asia/Makassar";

  let showtimes = await prisma.showtime.findMany({
    where: {
      movieId,
      ...(branchId && { studio: { branchId } }),
    },
    select: { businessDate: true, startTime: true },
    orderBy: { startTime: "asc" },
  });

  if (showtimes.length === 0 && branchId) {
    showtimes = await prisma.showtime.findMany({
      where: { movieId },
      select: { businessDate: true, startTime: true },
      orderBy: { startTime: "asc" },
    });
  }

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

  const branch = branchId
    ? await prisma.branch.findUnique({ where: { id: branchId } })
    : await prisma.branch.findFirst();

  const settingsRecords = await prisma.setting.findMany();
  const timezone = settingsRecords.find((s) => s.key === "timezone")?.value || branch?.timezone || process.env.TZ || "Asia/Makassar";
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

  const cinemaName = cinemaNameSetting || branch?.name || "PLANET CINEMA";

  // Find showtimes matching this movie (and branch)
  let allShowtimes = await prisma.showtime.findMany({
    where: {
      movieId,
      ...(branchId && { studio: { branchId } }),
    },
    include: {
      studio: { select: { id: true, name: true, code: true, type: true, capacity: true } },
    },
    orderBy: { startTime: "asc" },
  });

  if (allShowtimes.length === 0 && branchId) {
    allShowtimes = await prisma.showtime.findMany({
      where: { movieId },
      include: {
        studio: { select: { id: true, name: true, code: true, type: true, capacity: true } },
      },
      orderBy: { startTime: "asc" },
    });
  }

  // Filter showtimes matching showingDate in the specified timezone
  const showtimes = allShowtimes.filter((s) => {
    const rawDate = s.businessDate || s.startTime;
    if (!rawDate) return false;
    const dateStr = new Intl.DateTimeFormat("sv-SE", { timeZone: timezone }).format(new Date(rawDate));
    return dateStr === showingDate;
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

export interface MovieAnalyticsDailyItem {
  date: string;
  dayName: string;
  dayShort: string;
  displayDate: string;
  tickets: number;
  revenue: number;
  showtimesCount: number;
}

export interface MovieAnalyticsMovieItem {
  id: string;
  title: string;
  poster: string | null;
  censorshipRating: string;
  durationMinutes: number | null;
  genres: string[];
  totalTickets: number;
  totalRevenue: number;
  totalShowtimes: number;
  averageTicketPrice: number;
  revenueShare: number;
  ticketShare: number;
  daily: MovieAnalyticsDailyItem[];
}

export interface MovieAnalyticsResponse {
  period: {
    startDate: string;
    endDate: string;
    days: number;
    timezone: string;
  };
  summary: {
    totalRevenue: number;
    totalTickets: number;
    totalShowtimes: number;
    activeMoviesCount: number;
    averageTicketsPerDay: number;
    averageRevenuePerDay: number;
    topMovie: {
      id: string;
      title: string;
      poster: string | null;
      revenue: number;
      tickets: number;
    } | null;
    highestSalesDay: {
      date: string;
      dayName: string;
      revenue: number;
      tickets: number;
    } | null;
  };
  dailyTotals: Array<{
    date: string;
    dayName: string;
    dayShort: string;
    displayDate: string;
    totalTickets: number;
    totalRevenue: number;
    totalShowtimes: number;
    movieBreakdown: Array<{
      movieId: string;
      title: string;
      tickets: number;
      revenue: number;
    }>;
  }>;
  movies: MovieAnalyticsMovieItem[];
}

export const getMovieAnalytics = async (
  branchId?: string,
  daysCount: number = 7,
  targetEndDate?: string
): Promise<MovieAnalyticsResponse> => {
  const branch = branchId
    ? await prisma.branch.findUnique({ where: { id: branchId } })
    : await prisma.branch.findFirst();

  const settingsRecords = await prisma.setting.findMany();
  const timezone =
    settingsRecords.find((s) => s.key === "timezone")?.value ||
    branch?.timezone ||
    process.env.TZ ||
    "Asia/Makassar";
  const businessDateSetting = settingsRecords.find((s) => s.key === "businessDate")?.value;

  // Determine end date
  let baseEndDateStr = targetEndDate || businessDateSetting;
  if (!baseEndDateStr) {
    baseEndDateStr = new Intl.DateTimeFormat("sv-SE", { timeZone: timezone }).format(new Date());
  }

  // Parse baseEndDate to date in UTC safely
  const [endYear, endMonth, endDay] = baseEndDateStr.split("-").map(Number);
  const endDateObj = new Date(Date.UTC(endYear, endMonth - 1, endDay, 12, 0, 0));

  // Build the list of consecutive dates (last `daysCount` days)
  const dateList: Array<{ date: string; dateObj: Date; dayName: string; dayShort: string; displayDate: string }> = [];
  const dayNamesId = ["Minggu", "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"];
  const dayShortsId = ["Min", "Sen", "Sel", "Rab", "Kam", "Jum", "Sab"];
  const monthsId = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agt", "Sep", "Okt", "Nov", "Des"];

  for (let i = daysCount - 1; i >= 0; i--) {
    const d = new Date(endDateObj.getTime() - i * 24 * 60 * 60 * 1000);
    const dateStr = d.toISOString().split("T")[0];
    const dayOfWeek = d.getUTCDay();
    const dayNum = d.getUTCDate();
    const monthIndex = d.getUTCMonth();

    dateList.push({
      date: dateStr,
      dateObj: d,
      dayName: dayNamesId[dayOfWeek],
      dayShort: dayShortsId[dayOfWeek],
      displayDate: `${dayNum.toString().padStart(2, "0")} ${monthsId[monthIndex]}`,
    });
  }

  const startDateStr = dateList[0].date;
  const finalEndDateStr = dateList[dateList.length - 1].date;
  const dateSet = new Set(dateList.map((d) => d.date));

  // Fetch showtimes
  let showtimes = await prisma.showtime.findMany({
    where: {
      ...(branchId && { studio: { branchId } }),
    },
    include: {
      movie: {
        include: {
          genres: {
            include: { genre: true },
          },
        },
      },
      studio: {
        select: { id: true, name: true, code: true, capacity: true },
      },
      orders: {
        where: {
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
      },
    },
  });

  if (showtimes.length === 0 && branchId) {
    showtimes = await prisma.showtime.findMany({
      include: {
        movie: {
          include: {
            genres: {
              include: { genre: true },
            },
          },
        },
        studio: {
          select: { id: true, name: true, code: true, capacity: true },
        },
        orders: {
          where: {
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
        },
      },
    });
  }

  // Filter showtimes that fall in our date range
  const relevantShowtimes = showtimes.filter((s) => {
    const rawDate = s.businessDate || s.startTime;
    if (!rawDate) return false;
    const dateStr = new Intl.DateTimeFormat("sv-SE", { timeZone: timezone }).format(new Date(rawDate));
    return dateSet.has(dateStr);
  });

  // Map to hold movie data
  const moviesMap = new Map<
    string,
    {
      id: string;
      title: string;
      poster: string | null;
      censorshipRating: string;
      durationMinutes: number | null;
      genres: string[];
      totalTickets: number;
      totalRevenue: number;
      totalShowtimes: number;
      dailyMap: Map<string, { tickets: number; revenue: number; showtimesCount: number }>;
    }
  >();

  // Map to hold daily aggregate totals
  const dailyTotalsMap = new Map<
    string,
    {
      tickets: number;
      revenue: number;
      showtimesCount: number;
      movieBreakdownMap: Map<string, { movieId: string; title: string; tickets: number; revenue: number }>;
    }
  >();

  for (const dl of dateList) {
    dailyTotalsMap.set(dl.date, {
      tickets: 0,
      revenue: 0,
      showtimesCount: 0,
      movieBreakdownMap: new Map(),
    });
  }

  // Process all relevant showtimes
  for (const s of relevantShowtimes) {
    const rawDate = s.businessDate || s.startTime;
    const dateStr = new Intl.DateTimeFormat("sv-SE", { timeZone: timezone }).format(new Date(rawDate));
    if (!dailyTotalsMap.has(dateStr)) continue;

    const movie = s.movie;
    if (!movie) continue;

    if (!moviesMap.has(movie.id)) {
      const dailyMap = new Map<string, { tickets: number; revenue: number; showtimesCount: number }>();
      for (const dl of dateList) {
        dailyMap.set(dl.date, { tickets: 0, revenue: 0, showtimesCount: 0 });
      }

      moviesMap.set(movie.id, {
        id: movie.id,
        title: movie.title,
        poster: movie.poster,
        censorshipRating: movie.censorshipRating || "SU",
        durationMinutes: movie.durationMinutes,
        genres: (movie.genres?.map((g) => g.genre?.name).filter(Boolean) as string[]) || [],
        totalTickets: 0,
        totalRevenue: 0,
        totalShowtimes: 0,
        dailyMap,
      });
    }

    const movieEntry = moviesMap.get(movie.id)!;
    const movieDaily = movieEntry.dailyMap.get(dateStr)!;
    const dailyTotal = dailyTotalsMap.get(dateStr)!;

    // Count tickets & revenue for this showtime
    let showtimeTickets = 0;
    let showtimeRevenue = 0;

    for (const order of s.orders) {
      const activeTickets = order.tickets.length;
      showtimeTickets += activeTickets;
      showtimeRevenue += activeTickets * s.ticketPrice;
    }

    // Accumulate to movie
    movieEntry.totalTickets += showtimeTickets;
    movieEntry.totalRevenue += showtimeRevenue;
    movieEntry.totalShowtimes += 1;

    movieDaily.tickets += showtimeTickets;
    movieDaily.revenue += showtimeRevenue;
    movieDaily.showtimesCount += 1;

    // Accumulate to daily totals
    dailyTotal.tickets += showtimeTickets;
    dailyTotal.revenue += showtimeRevenue;
    dailyTotal.showtimesCount += 1;

    const currentMb = dailyTotal.movieBreakdownMap.get(movie.id) || {
      movieId: movie.id,
      title: movie.title,
      tickets: 0,
      revenue: 0,
    };
    currentMb.tickets += showtimeTickets;
    currentMb.revenue += showtimeRevenue;
    dailyTotal.movieBreakdownMap.set(movie.id, currentMb);
  }

  // Calculate overall totals
  let grandTotalRevenue = 0;
  let grandTotalTickets = 0;
  let grandTotalShowtimes = 0;

  const dailyTotals = dateList.map((dl) => {
    const dt = dailyTotalsMap.get(dl.date)!;
    grandTotalRevenue += dt.revenue;
    grandTotalTickets += dt.tickets;
    grandTotalShowtimes += dt.showtimesCount;

    return {
      date: dl.date,
      dayName: dl.dayName,
      dayShort: dl.dayShort,
      displayDate: dl.displayDate,
      totalTickets: dt.tickets,
      totalRevenue: dt.revenue,
      totalShowtimes: dt.showtimesCount,
      movieBreakdown: Array.from(dt.movieBreakdownMap.values()),
    };
  });

  // Convert moviesMap to array and compute shares
  const moviesArray = Array.from(moviesMap.values()).map((m) => {
    const revenueShare = grandTotalRevenue > 0 ? (m.totalRevenue / grandTotalRevenue) * 100 : 0;
    const ticketShare = grandTotalTickets > 0 ? (m.totalTickets / grandTotalTickets) * 100 : 0;
    const averageTicketPrice = m.totalTickets > 0 ? Math.round(m.totalRevenue / m.totalTickets) : 0;

    const daily = dateList.map((dl) => {
      const dm = m.dailyMap.get(dl.date)!;
      return {
        date: dl.date,
        dayName: dl.dayName,
        dayShort: dl.dayShort,
        displayDate: dl.displayDate,
        tickets: dm.tickets,
        revenue: dm.revenue,
        showtimesCount: dm.showtimesCount,
      };
    });

    return {
      id: m.id,
      title: m.title,
      poster: m.poster,
      censorshipRating: m.censorshipRating,
      durationMinutes: m.durationMinutes,
      genres: m.genres,
      totalTickets: m.totalTickets,
      totalRevenue: m.totalRevenue,
      totalShowtimes: m.totalShowtimes,
      averageTicketPrice,
      revenueShare: Number(revenueShare.toFixed(1)),
      ticketShare: Number(ticketShare.toFixed(1)),
      daily,
    };
  });

  // Sort movies by total revenue descending (or total tickets)
  moviesArray.sort((a, b) => b.totalRevenue - a.totalRevenue || b.totalTickets - a.totalTickets);

  // Top movie
  const topMovie =
    moviesArray.length > 0
      ? {
          id: moviesArray[0].id,
          title: moviesArray[0].title,
          poster: moviesArray[0].poster,
          revenue: moviesArray[0].totalRevenue,
          tickets: moviesArray[0].totalTickets,
        }
      : null;

  // Highest sales day
  let highestSalesDay: { date: string; dayName: string; revenue: number; tickets: number } | null = null;
  for (const dt of dailyTotals) {
    if (!highestSalesDay || dt.totalRevenue > highestSalesDay.revenue) {
      highestSalesDay = {
        date: dt.date,
        dayName: dt.dayName,
        revenue: dt.totalRevenue,
        tickets: dt.totalTickets,
      };
    }
  }

  const summary = {
    totalRevenue: grandTotalRevenue,
    totalTickets: grandTotalTickets,
    totalShowtimes: grandTotalShowtimes,
    activeMoviesCount: moviesArray.length,
    averageTicketsPerDay: Math.round(grandTotalTickets / daysCount),
    averageRevenuePerDay: Math.round(grandTotalRevenue / daysCount),
    topMovie,
    highestSalesDay,
  };

  return {
    period: {
      startDate: startDateStr,
      endDate: finalEndDateStr,
      days: daysCount,
      timezone,
    },
    summary,
    dailyTotals,
    movies: moviesArray,
  };
};

export const getScheduledMovies = async (branchId?: string) => {
  let movies = await prisma.movie.findMany({
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

  if (movies.length === 0 && branchId) {
    movies = await prisma.movie.findMany({
      where: {
        showtimes: {
          some: {},
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
  }

  return movies;
};


