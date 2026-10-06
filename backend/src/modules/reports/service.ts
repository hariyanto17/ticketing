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
  const dailySalesMap = new Map<string, { date: string; ticketCount: number; revenue: number; cash: number; qris: number; debit: number; credit: number; refund: number }>();

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
    const dailyEntry = dailySalesMap.get(dateStr) || { date: dateStr, ticketCount: 0, revenue: 0, cash: 0, qris: 0, debit: 0, credit: 0, refund: 0 };
    dailyEntry.ticketCount += activeTicketsCount;
    dailyEntry.revenue += order.totalAmount;
    if (order.paymentMethod === "CASH") dailyEntry.cash += order.totalAmount;
    else if (order.paymentMethod === "QRIS") dailyEntry.qris += order.totalAmount;
    else if (order.paymentMethod === "DEBIT_CARD") dailyEntry.debit += order.totalAmount;
    else if (order.paymentMethod === "CREDIT_CARD") dailyEntry.credit += order.totalAmount;
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

export type MomentumDirection = "UP" | "SLIGHT_UP" | "STABLE" | "SLIGHT_DOWN" | "DOWN" | "NONE";
export type MomentumLabel = "Naik" | "Cenderung Naik" | "Stabil" | "Cenderung Turun" | "Turun" | "Tidak tersedia";

export interface MovieStudioBreakdownItem {
  studioId: string;
  studioName: string;
  studioCode: string;
  shows: number;
  tickets: number;
  capacity: number;
  occupancy: number;
  revenue: number;
  ticketsPerShow: number;
  revenuePerShow: number;
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
  totalCapacity: number;
  occupancy: number;
  ticketsPerShow: number;
  revenuePerShow: number;
  averageTicketPrice: number;
  revenueShare: number;
  ticketShare: number;
  peakHour: string;
  bestStudio: string;
  momentum: {
    direction: MomentumDirection;
    label: MomentumLabel;
    growthPercentage: number;
    currentTickets: number;
    previousTickets: number;
  };
  recommendation: {
    action: "INCREASE" | "MAINTAIN" | "REDUCE" | "MONITOR";
    label: string;
    reason: string;
  };
  healthScore: {
    score: number;
    status: "STRONG" | "NORMAL" | "WEAK" | "CRITICAL";
    label: string;
  };
  studiosBreakdown: MovieStudioBreakdownItem[];
  daily: MovieAnalyticsDailyItem[];
}

export interface GenreAnalyticsItem {
  id: string;
  name: string;
  moviesCount: number;
  movieTitles: string[];
  totalTickets: number;
  totalRevenue: number;
  totalShowtimes: number;
  totalCapacity: number;
  occupancy: number;
  ticketsPerShow: number;
  revenuePerShow: number;
  revenueShare: number;
  ticketShare: number;
  momentum: {
    direction: MomentumDirection;
    label: MomentumLabel;
    growthPercentage: number;
    currentTickets: number;
    previousTickets: number;
  };
  daily: MovieAnalyticsDailyItem[];
}

export interface StudioPerformanceItem {
  studioId: string;
  studioName: string;
  studioCode: string;
  capacity: number;
  totalShowtimes: number;
  totalTickets: number;
  totalCapacity: number;
  totalRevenue: number;
  averageTicketsPerShow: number;
  averageRevenuePerShow: number;
  occupancyRate: number;
  revenueShare: number;
}

export interface TimeSlotPerformanceItem {
  slotKey: string;
  label: string;
  timeRange: string;
  totalTickets: number;
  totalRevenue: number;
  showtimesCount: number;
  totalCapacity: number;
  occupancy: number;
  averageTicketsPerShow: number;
  revenuePerShow: number;
  revenueShare: number;
  isPeak: boolean;
}

export interface ShowtimeHeatmapCell {
  dayOfWeek: number; // 0=Sun, 1=Mon, ..., 6=Sat
  dayName: string;
  dayShort: string;
  timeSlot: string; // e.g. "10:00 - 12:00"
  slotKey: string;
  showsCount: number;
  tickets: number;
  capacity: number;
  occupancy: number;
  revenue: number;
  ticketsPerShow: number;
  revenuePerShow: number;
}

export interface IndividualShowAnalyticsItem {
  showtimeId: string;
  movieId: string;
  movieTitle: string;
  date: string;
  displayDate: string;
  time: string;
  studioId: string;
  studioName: string;
  tickets: number;
  capacity: number;
  occupancy: number;
  revenue: number;
}

export interface DayOfWeekAnalyticsItem {
  dayOfWeek: number;
  dayName: string;
  dayShort: string;
  shows: number;
  tickets: number;
  capacity: number;
  occupancy: number;
  revenue: number;
  ticketsPerShow: number;
  revenuePerShow: number;
}

export interface WeekdayWeekendComparison {
  weekday: {
    shows: number;
    tickets: number;
    capacity: number;
    occupancy: number;
    revenue: number;
    ticketsPerShow: number;
    revenuePerShow: number;
  };
  weekend: {
    shows: number;
    tickets: number;
    capacity: number;
    occupancy: number;
    revenue: number;
    ticketsPerShow: number;
    revenuePerShow: number;
  };
  weekendLiftPercentage: number;
}

export interface MovieAnalyticsResponse {
  period: {
    startDate: string;
    endDate: string;
    days: number;
    timezone: string;
    previousStartDate: string;
    previousEndDate: string;
  };
  summary: {
    totalRevenue: number;
    totalTickets: number;
    totalShowtimes: number;
    totalCapacity: number;
    averageOccupancy: number;
    activeMoviesCount: number;
    averageTicketsPerShow: number;
    averageRevenuePerShow: number;
    averageTicketsPerDay: number;
    averageRevenuePerDay: number;
    topMovie: {
      id: string;
      title: string;
      poster: string | null;
      revenue: number;
      tickets: number;
      occupancy: number;
      recommendation: string;
    } | null;
    topGenre: {
      name: string;
      revenue: number;
      tickets: number;
      moviesCount: number;
      revenueShare: number;
    } | null;
    highestSalesDay: {
      date: string;
      dayName: string;
      revenue: number;
      tickets: number;
    } | null;
    peakTimeSlot: {
      label: string;
      timeRange: string;
      revenue: number;
      tickets: number;
      occupancy: number;
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
    totalCapacity: number;
    occupancy: number;
    movieBreakdown: Array<{
      movieId: string;
      title: string;
      tickets: number;
      revenue: number;
    }>;
  }>;
  movies: MovieAnalyticsMovieItem[];
  genres: GenreAnalyticsItem[];
  studioPerformance: StudioPerformanceItem[];
  timeSlotPerformance: TimeSlotPerformanceItem[];
  showtimeHeatmap: ShowtimeHeatmapCell[];
  bestShows: IndividualShowAnalyticsItem[];
  underperformingShows: IndividualShowAnalyticsItem[];
  dayOfWeekAnalytics: DayOfWeekAnalyticsItem[];
  weekdayWeekendComparison: WeekdayWeekendComparison;
}

export const getMovieAnalytics = async (
  branchId?: string,
  daysCount: number = 7,
  targetEndDate?: string,
  targetStartDate?: string
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

  const [endYear, endMonth, endDay] = baseEndDateStr.split("-").map(Number);
  const endDateObj = new Date(Date.UTC(endYear, endMonth - 1, endDay, 12, 0, 0));

  let effectiveDaysCount = daysCount;
  if (targetStartDate) {
    const [startYear, startMonth, startDay] = targetStartDate.split("-").map(Number);
    const startDateObj = new Date(Date.UTC(startYear, startMonth - 1, startDay, 12, 0, 0));
    const diffDays = Math.round((endDateObj.getTime() - startDateObj.getTime()) / (24 * 60 * 60 * 1000)) + 1;
    if (diffDays > 0) {
      effectiveDaysCount = Math.min(diffDays, 180);
    }
  }

  const dayNamesId = ["Minggu", "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"];
  const dayShortsId = ["Min", "Sen", "Sel", "Rab", "Kam", "Jum", "Sab"];
  const monthsId = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agt", "Sep", "Okt", "Nov", "Des"];

  // Current period date list
  const dateList: Array<{ date: string; dateObj: Date; dayName: string; dayShort: string; displayDate: string }> = [];
  for (let i = effectiveDaysCount - 1; i >= 0; i--) {
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

  // Previous period date list (for momentum comparison)
  const prevDateList: Array<{ date: string }> = [];
  for (let i = effectiveDaysCount * 2 - 1; i >= effectiveDaysCount; i--) {
    const d = new Date(endDateObj.getTime() - i * 24 * 60 * 60 * 1000);
    const dateStr = d.toISOString().split("T")[0];
    prevDateList.push({ date: dateStr });
  }
  const prevStartDateStr = prevDateList[0]?.date || startDateStr;
  const prevEndDateStr = prevDateList[prevDateList.length - 1]?.date || startDateStr;
  const prevDateSet = new Set(prevDateList.map((d) => d.date));

  // Combined date set for DB filtering
  const allNeededDates = new Set([...dateSet, ...prevDateSet]);

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

  // Pre-calculate previous period movie & genre ticket totals
  const prevMovieTickets = new Map<string, number>();
  const prevGenreTickets = new Map<string, number>();

  for (const s of showtimes) {
    const rawDate = s.businessDate || s.startTime;
    if (!rawDate) continue;
    const dateStr = new Intl.DateTimeFormat("sv-SE", { timeZone: timezone }).format(new Date(rawDate));
    if (!prevDateSet.has(dateStr)) continue;

    let ticketsCount = 0;
    for (const o of s.orders) {
      ticketsCount += o.tickets.length;
    }

    if (s.movie) {
      prevMovieTickets.set(s.movie.id, (prevMovieTickets.get(s.movie.id) || 0) + ticketsCount);

      const genreObjects = (s.movie.genres?.map((g) => g.genre).filter(Boolean) as Array<{ id: string; name: string }>) || [];
      const effectiveGenres = genreObjects.length > 0 ? genreObjects : [{ id: "general", name: "Umum" }];
      for (const g of effectiveGenres) {
        prevGenreTickets.set(g.id, (prevGenreTickets.get(g.id) || 0) + ticketsCount);
      }
    }
  }

  // Filter current period showtimes
  const relevantShowtimes = showtimes.filter((s) => {
    const rawDate = s.businessDate || s.startTime;
    if (!rawDate) return false;
    const dateStr = new Intl.DateTimeFormat("sv-SE", { timeZone: timezone }).format(new Date(rawDate));
    return dateSet.has(dateStr);
  });

  // Structures for current period aggregation
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
      totalCapacity: number;
      studiosMap: Map<string, { studioId: string; studioName: string; studioCode: string; shows: number; tickets: number; capacity: number; revenue: number }>;
      hourCountsMap: Map<string, number>;
      dailyMap: Map<string, { tickets: number; revenue: number; showtimesCount: number }>;
    }
  >();

  const genresMap = new Map<
    string,
    {
      id: string;
      name: string;
      movieTitlesSet: Set<string>;
      totalTickets: number;
      totalRevenue: number;
      totalShowtimes: number;
      totalCapacity: number;
      dailyMap: Map<string, { tickets: number; revenue: number; showtimesCount: number }>;
    }
  >();

  const studiosMap = new Map<
    string,
    {
      studioId: string;
      studioName: string;
      studioCode: string;
      capacity: number;
      totalShowtimes: number;
      totalTickets: number;
      totalCapacity: number;
      totalRevenue: number;
    }
  >();

  // Slot definitions according to requirements:
  // Morning: 06:00 - 11:59
  // Afternoon: 12:00 - 15:59
  // Evening: 16:00 - 18:59
  // Prime Time: 19:00 - 21:59
  // Late Night: 22:00+
  const slotDefinitions = [
    { key: "MORNING", label: "Pagi (Morning)", timeRange: "06:00 - 11:59", minHour: 6, maxHour: 12 },
    { key: "AFTERNOON", label: "Siang (Afternoon)", timeRange: "12:00 - 15:59", minHour: 12, maxHour: 16 },
    { key: "EVENING", label: "Sore (Evening)", timeRange: "16:00 - 18:59", minHour: 16, maxHour: 19 },
    { key: "PRIME_TIME", label: "Prime Time", timeRange: "19:00 - 21:59", minHour: 19, maxHour: 22 },
    { key: "LATE_NIGHT", label: "Larut Malam (Late Night)", timeRange: "22:00+", minHour: 22, maxHour: 30 },
  ];

  const timeSlotsMap = new Map<
    string,
    {
      slotKey: string;
      label: string;
      timeRange: string;
      totalTickets: number;
      totalRevenue: number;
      showtimesCount: number;
      totalCapacity: number;
    }
  >();

  for (const sDef of slotDefinitions) {
    timeSlotsMap.set(sDef.key, {
      slotKey: sDef.key,
      label: sDef.label,
      timeRange: sDef.timeRange,
      totalTickets: 0,
      totalRevenue: 0,
      showtimesCount: 0,
      totalCapacity: 0,
    });
  }

  // Heatmap definitions (Day of week × 2-hour buckets: 14:00 to 22:00)
  const heatmapBuckets = [
    { key: "14:00", label: "14:00 - 15:59", minH: 14, maxH: 16 },
    { key: "16:00", label: "16:00 - 17:59", minH: 16, maxH: 18 },
    { key: "18:00", label: "18:00 - 19:59", minH: 18, maxH: 20 },
    { key: "20:00", label: "20:00 - 21:59", minH: 20, maxH: 22 },
  ];

  // Key: `${dayOfWeek}_${bucketKey}`
  const heatmapDataMap = new Map<string, { shows: number; tickets: number; capacity: number; revenue: number }>();

  // Day of week analytics (0 to 6)
  const dayOfWeekMap = new Map<number, { shows: number; tickets: number; capacity: number; revenue: number }>();
  for (let d = 0; d < 7; d++) {
    dayOfWeekMap.set(d, { shows: 0, tickets: 0, capacity: 0, revenue: 0 });
  }

  // Daily totals map
  const dailyTotalsMap = new Map<
    string,
    {
      tickets: number;
      revenue: number;
      showtimesCount: number;
      capacity: number;
      movieBreakdownMap: Map<string, { movieId: string; title: string; tickets: number; revenue: number }>;
    }
  >();

  for (const dl of dateList) {
    dailyTotalsMap.set(dl.date, {
      tickets: 0,
      revenue: 0,
      showtimesCount: 0,
      capacity: 0,
      movieBreakdownMap: new Map(),
    });
  }

  const individualShowsList: IndividualShowAnalyticsItem[] = [];

  // Process all relevant showtimes
  for (const s of relevantShowtimes) {
    const rawDate = s.businessDate || s.startTime;
    const dateStr = new Intl.DateTimeFormat("sv-SE", { timeZone: timezone }).format(new Date(rawDate));
    if (!dailyTotalsMap.has(dateStr)) continue;

    const movie = s.movie;
    if (!movie) continue;

    const studio = s.studio;
    const studioCapacity = studio?.capacity || 100;

    // Count tickets & revenue
    let showtimeTickets = 0;
    let showtimeRevenue = 0;

    for (const order of s.orders) {
      const activeTickets = order.tickets.length;
      showtimeTickets += activeTickets;
      showtimeRevenue += activeTickets * s.ticketPrice;
    }

    // Individual show record
    const startTimeDate = new Date(s.startTime);
    const timeFormatter = new Intl.DateTimeFormat("en-GB", { timeZone: timezone, hour: "2-digit", minute: "2-digit", hour12: false });
    const formattedTime = timeFormatter.format(startTimeDate);
    const showOccupancy = studioCapacity > 0 ? Number(((showtimeTickets / studioCapacity) * 100).toFixed(1)) : 0;

    const [y, m, d] = dateStr.split("-").map(Number);
    const displayDateStr = `${d.toString().padStart(2, "0")} ${monthsId[m - 1]}`;

    individualShowsList.push({
      showtimeId: s.id,
      movieId: movie.id,
      movieTitle: movie.title,
      date: dateStr,
      displayDate: displayDateStr,
      time: formattedTime,
      studioId: studio?.id || "",
      studioName: studio?.name || "Studio",
      tickets: showtimeTickets,
      capacity: studioCapacity,
      occupancy: showOccupancy,
      revenue: showtimeRevenue,
    });

    // Extract hour in timezone
    const hourVal = parseInt(formattedTime.split(":")[0], 10) + parseInt(formattedTime.split(":")[1] || "0", 10) / 60;
    const dayOfWeekVal = new Date(Date.UTC(y, m - 1, d, 12, 0, 0)).getUTCDay();

    // Accumulate day of week
    const dowEntry = dayOfWeekMap.get(dayOfWeekVal)!;
    dowEntry.shows += 1;
    dowEntry.tickets += showtimeTickets;
    dowEntry.capacity += studioCapacity;
    dowEntry.revenue += showtimeRevenue;

    // Accumulate heatmap
    let matchedBucketKey = "10:00";
    for (const b of heatmapBuckets) {
      if (hourVal >= b.minH && hourVal < b.maxH) {
        matchedBucketKey = b.key;
        break;
      }
    }
    const hmKey = `${dayOfWeekVal}_${matchedBucketKey}`;
    const hmEntry = heatmapDataMap.get(hmKey) || { shows: 0, tickets: 0, capacity: 0, revenue: 0 };
    hmEntry.shows += 1;
    hmEntry.tickets += showtimeTickets;
    hmEntry.capacity += studioCapacity;
    hmEntry.revenue += showtimeRevenue;
    heatmapDataMap.set(hmKey, hmEntry);

    // Initialize movie entry
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
        totalCapacity: 0,
        studiosMap: new Map(),
        hourCountsMap: new Map(),
        dailyMap,
      });
    }

    const movieEntry = moviesMap.get(movie.id)!;
    const movieDaily = movieEntry.dailyMap.get(dateStr)!;
    const dailyTotal = dailyTotalsMap.get(dateStr)!;

    movieEntry.totalTickets += showtimeTickets;
    movieEntry.totalRevenue += showtimeRevenue;
    movieEntry.totalShowtimes += 1;
    movieEntry.totalCapacity += studioCapacity;

    movieDaily.tickets += showtimeTickets;
    movieDaily.revenue += showtimeRevenue;
    movieDaily.showtimesCount += 1;

    // Track movie studios
    if (studio) {
      const ms = movieEntry.studiosMap.get(studio.id) || {
        studioId: studio.id,
        studioName: studio.name,
        studioCode: studio.code,
        shows: 0,
        tickets: 0,
        capacity: 0,
        revenue: 0,
      };
      ms.shows += 1;
      ms.tickets += showtimeTickets;
      ms.capacity += studioCapacity;
      ms.revenue += showtimeRevenue;
      movieEntry.studiosMap.set(studio.id, ms);
    }

    // Track movie hour popularity
    const hourBucket = `${formattedTime.split(":")[0]}:00`;
    movieEntry.hourCountsMap.set(hourBucket, (movieEntry.hourCountsMap.get(hourBucket) || 0) + showtimeTickets);

    // Studio tracking
    if (studio) {
      if (!studiosMap.has(studio.id)) {
        studiosMap.set(studio.id, {
          studioId: studio.id,
          studioName: studio.name,
          studioCode: studio.code,
          capacity: studioCapacity,
          totalShowtimes: 0,
          totalTickets: 0,
          totalCapacity: 0,
          totalRevenue: 0,
        });
      }
      const studioEntry = studiosMap.get(studio.id)!;
      studioEntry.totalShowtimes += 1;
      studioEntry.totalTickets += showtimeTickets;
      studioEntry.totalCapacity += studioCapacity;
      studioEntry.totalRevenue += showtimeRevenue;
    }

    // Time Slot tracking
    let matchedSlotKey = "PRIME_TIME";
    if (hourVal < 12) matchedSlotKey = "MORNING";
    else if (hourVal < 16) matchedSlotKey = "AFTERNOON";
    else if (hourVal < 19) matchedSlotKey = "EVENING";
    else if (hourVal < 22) matchedSlotKey = "PRIME_TIME";
    else matchedSlotKey = "LATE_NIGHT";

    const timeSlotEntry = timeSlotsMap.get(matchedSlotKey);
    if (timeSlotEntry) {
      timeSlotEntry.showtimesCount += 1;
      timeSlotEntry.totalTickets += showtimeTickets;
      timeSlotEntry.totalCapacity += studioCapacity;
      timeSlotEntry.totalRevenue += showtimeRevenue;
    }

    // Genre tracking
    const genreObjects = (movie.genres?.map((g) => g.genre).filter(Boolean) as Array<{ id: string; name: string }>) || [];
    const effectiveGenres = genreObjects.length > 0 ? genreObjects : [{ id: "general", name: "Umum" }];

    for (const gen of effectiveGenres) {
      if (!genresMap.has(gen.id)) {
        const dailyMap = new Map<string, { tickets: number; revenue: number; showtimesCount: number }>();
        for (const dl of dateList) {
          dailyMap.set(dl.date, { tickets: 0, revenue: 0, showtimesCount: 0 });
        }
        genresMap.set(gen.id, {
          id: gen.id,
          name: gen.name,
          movieTitlesSet: new Set<string>(),
          totalTickets: 0,
          totalRevenue: 0,
          totalShowtimes: 0,
          totalCapacity: 0,
          dailyMap,
        });
      }

      const genreEntry = genresMap.get(gen.id)!;
      genreEntry.movieTitlesSet.add(movie.title);
      genreEntry.totalTickets += showtimeTickets;
      genreEntry.totalRevenue += showtimeRevenue;
      genreEntry.totalShowtimes += 1;
      genreEntry.totalCapacity += studioCapacity;

      const genreDaily = genreEntry.dailyMap.get(dateStr)!;
      genreDaily.tickets += showtimeTickets;
      genreDaily.revenue += showtimeRevenue;
      genreDaily.showtimesCount += 1;
    }

    // Daily totals
    dailyTotal.tickets += showtimeTickets;
    dailyTotal.revenue += showtimeRevenue;
    dailyTotal.showtimesCount += 1;
    dailyTotal.capacity += studioCapacity;

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

  // Calculate grand totals
  let grandTotalRevenue = 0;
  let grandTotalTickets = 0;
  let grandTotalShowtimes = 0;
  let grandTotalCapacity = 0;

  const dailyTotals = dateList.map((dl) => {
    const dt = dailyTotalsMap.get(dl.date)!;
    grandTotalRevenue += dt.revenue;
    grandTotalTickets += dt.tickets;
    grandTotalShowtimes += dt.showtimesCount;
    grandTotalCapacity += dt.capacity;

    const dayOccupancy = dt.capacity > 0 ? Number(((dt.tickets / dt.capacity) * 100).toFixed(1)) : 0;

    return {
      date: dl.date,
      dayName: dl.dayName,
      dayShort: dl.dayShort,
      displayDate: dl.displayDate,
      totalTickets: dt.tickets,
      totalRevenue: dt.revenue,
      totalShowtimes: dt.showtimesCount,
      totalCapacity: dt.capacity,
      occupancy: dayOccupancy,
      movieBreakdown: Array.from(dt.movieBreakdownMap.values()),
    };
  });

  const averageOccupancy = grandTotalCapacity > 0 ? Number(((grandTotalTickets / grandTotalCapacity) * 100).toFixed(1)) : 0;

  // Build Movies Array with Momentum, Recommendations, Health Scores & Studios Breakdown
  const moviesArray: MovieAnalyticsMovieItem[] = Array.from(moviesMap.values()).map((m) => {
    const revenueShare = grandTotalRevenue > 0 ? Number(((m.totalRevenue / grandTotalRevenue) * 100).toFixed(1)) : 0;
    const ticketShare = grandTotalTickets > 0 ? Number(((m.totalTickets / grandTotalTickets) * 100).toFixed(1)) : 0;
    const averageTicketPrice = m.totalTickets > 0 ? Math.round(m.totalRevenue / m.totalTickets) : 0;
    const ticketsPerShow = m.totalShowtimes > 0 ? Number((m.totalTickets / m.totalShowtimes).toFixed(1)) : 0;
    const revenuePerShow = m.totalShowtimes > 0 ? Math.round(m.totalRevenue / m.totalShowtimes) : 0;
    const movieOccupancy = m.totalCapacity > 0 ? Number(((m.totalTickets / m.totalCapacity) * 100).toFixed(1)) : 0;

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

    // Studios breakdown for this movie
    const studiosBreakdown: MovieStudioBreakdownItem[] = Array.from(m.studiosMap.values()).map((s) => ({
      studioId: s.studioId,
      studioName: s.studioName,
      studioCode: s.studioCode,
      shows: s.shows,
      tickets: s.tickets,
      capacity: s.capacity,
      occupancy: s.capacity > 0 ? Number(((s.tickets / s.capacity) * 100).toFixed(1)) : 0,
      revenue: s.revenue,
      ticketsPerShow: s.shows > 0 ? Number((s.tickets / s.shows).toFixed(1)) : 0,
      revenuePerShow: s.shows > 0 ? Math.round(s.revenue / s.shows) : 0,
    }));
    studiosBreakdown.sort((a, b) => b.occupancy - a.occupancy || b.tickets - a.tickets);

    const bestStudio = studiosBreakdown.length > 0 ? studiosBreakdown[0].studioName : "-";

    // Peak Hour calculation
    let peakHourStr = "-";
    let maxHourTickets = 0;
    for (const [hour, tCount] of m.hourCountsMap.entries()) {
      if (tCount > maxHourTickets) {
        maxHourTickets = tCount;
        peakHourStr = hour;
      }
    }

    // Momentum Calculation comparing current period vs previous period
    const prevTix = prevMovieTickets.get(m.id) || 0;
    const currTix = m.totalTickets;

    let growthPercentage = 0;
    let direction: MomentumDirection = "STABLE";
    let label: MomentumLabel = "Stabil";

    if (prevTix === 0 && currTix === 0) {
      direction = "NONE";
      label = "Tidak tersedia";
      growthPercentage = 0;
    } else if (prevTix === 0 && currTix > 0) {
      direction = "UP";
      label = "Naik";
      growthPercentage = 100;
    } else {
      growthPercentage = Number((((currTix - prevTix) / prevTix) * 100).toFixed(1));
      if (growthPercentage > 15) {
        direction = "UP";
        label = "Naik";
      } else if (growthPercentage >= 5) {
        direction = "SLIGHT_UP";
        label = "Cenderung Naik";
      } else if (growthPercentage >= -5) {
        direction = "STABLE";
        label = "Stabil";
      } else if (growthPercentage >= -15) {
        direction = "SLIGHT_DOWN";
        label = "Cenderung Turun";
      } else {
        direction = "DOWN";
        label = "Turun";
      }
    }

    // Deterministic Rule-Based Recommendation
    let recAction: "INCREASE" | "MAINTAIN" | "REDUCE" | "MONITOR" = "MONITOR";
    let recLabel = "Pantau";
    let recReason = "Data tayang masih sedikit";

    if (m.totalShowtimes < 3) {
      recAction = "MONITOR";
      recLabel = "Pantau";
      recReason = "Penayangan masih baru / terbatas (< 3 show)";
    } else if (movieOccupancy >= 60 || (movieOccupancy >= 45 && (direction === "UP" || direction === "SLIGHT_UP")) || ticketsPerShow >= 35) {
      recAction = "INCREASE";
      recLabel = "Tambah Jam Tayang";
      recReason = `Okupansi tinggi (${movieOccupancy}%) dengan momentum ${label.toLowerCase()}`;
    } else if (movieOccupancy < 30 || (movieOccupancy < 40 && (direction === "DOWN" || direction === "SLIGHT_DOWN"))) {
      recAction = "REDUCE";
      recLabel = "Kurangi Jam Tayang";
      recReason = `Okupansi rendah (${movieOccupancy}%) dan permintaan menurun`;
    } else {
      recAction = "MAINTAIN";
      recLabel = "Pertahankan";
      recReason = `Kinerja stabil dengan rata-rata ${ticketsPerShow} tiket/show`;
    }

    // Health Score (0 - 100)
    // 30% Occupancy, 25% Tickets/Show, 20% Revenue/Show, 15% Momentum, 10% Recent Trend
    const normOccupancy = Math.min(100, Math.max(0, movieOccupancy));
    const normTicketsPerShow = Math.min(100, Math.max(0, (ticketsPerShow / 40) * 100));
    const normRevPerShow = Math.min(100, Math.max(0, (revenuePerShow / 1_500_000) * 100));
    const normMomentum = Math.min(100, Math.max(0, 50 + growthPercentage * 2.5));
    const normTrend = direction === "UP" ? 100 : direction === "SLIGHT_UP" ? 75 : direction === "STABLE" ? 50 : direction === "SLIGHT_DOWN" ? 25 : 10;

    const rawScore = Math.round(
      0.30 * normOccupancy +
      0.25 * normTicketsPerShow +
      0.20 * normRevPerShow +
      0.15 * normMomentum +
      0.10 * normTrend
    );
    const healthScoreVal = Math.max(0, Math.min(100, rawScore));

    let hsStatus: "STRONG" | "NORMAL" | "WEAK" | "CRITICAL" = "NORMAL";
    let hsLabel = "Normal";
    if (healthScoreVal >= 80) {
      hsStatus = "STRONG";
      hsLabel = "Sangat Baik";
    } else if (healthScoreVal >= 60) {
      hsStatus = "NORMAL";
      hsLabel = "Normal";
    } else if (healthScoreVal >= 40) {
      hsStatus = "WEAK";
      hsLabel = "Kurang";
    } else {
      hsStatus = "CRITICAL";
      hsLabel = "Kritis";
    }

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
      totalCapacity: m.totalCapacity,
      occupancy: movieOccupancy,
      ticketsPerShow,
      revenuePerShow,
      averageTicketPrice,
      revenueShare,
      ticketShare,
      peakHour: peakHourStr,
      bestStudio,
      momentum: {
        direction,
        label,
        growthPercentage,
        currentTickets: currTix,
        previousTickets: prevTix,
      },
      recommendation: {
        action: recAction,
        label: recLabel,
        reason: recReason,
      },
      healthScore: {
        score: healthScoreVal,
        status: hsStatus,
        label: hsLabel,
      },
      studiosBreakdown,
      daily,
    };
  });

  moviesArray.sort((a, b) => b.totalRevenue - a.totalRevenue || b.totalTickets - a.totalTickets);

  // Convert Genres
  const genresArray: GenreAnalyticsItem[] = Array.from(genresMap.values()).map((g) => {
    const revenueShare = grandTotalRevenue > 0 ? Number(((g.totalRevenue / grandTotalRevenue) * 100).toFixed(1)) : 0;
    const ticketShare = grandTotalTickets > 0 ? Number(((g.totalTickets / grandTotalTickets) * 100).toFixed(1)) : 0;
    const ticketsPerShow = g.totalShowtimes > 0 ? Number((g.totalTickets / g.totalShowtimes).toFixed(1)) : 0;
    const revenuePerShow = g.totalShowtimes > 0 ? Math.round(g.totalRevenue / g.totalShowtimes) : 0;
    const genreOccupancy = g.totalCapacity > 0 ? Number(((g.totalTickets / g.totalCapacity) * 100).toFixed(1)) : 0;

    const daily = dateList.map((dl) => {
      const dm = g.dailyMap.get(dl.date)!;
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

    const prevTix = prevGenreTickets.get(g.id) || 0;
    const currTix = g.totalTickets;

    let growthPercentage = 0;
    let direction: MomentumDirection = "STABLE";
    let label: MomentumLabel = "Stabil";

    if (prevTix === 0 && currTix === 0) {
      direction = "NONE";
      label = "Tidak tersedia";
      growthPercentage = 0;
    } else if (prevTix === 0 && currTix > 0) {
      direction = "UP";
      label = "Naik";
      growthPercentage = 100;
    } else {
      growthPercentage = Number((((currTix - prevTix) / prevTix) * 100).toFixed(1));
      if (growthPercentage > 15) {
        direction = "UP";
        label = "Naik";
      } else if (growthPercentage >= 5) {
        direction = "SLIGHT_UP";
        label = "Cenderung Naik";
      } else if (growthPercentage >= -5) {
        direction = "STABLE";
        label = "Stabil";
      } else if (growthPercentage >= -15) {
        direction = "SLIGHT_DOWN";
        label = "Cenderung Turun";
      } else {
        direction = "DOWN";
        label = "Turun";
      }
    }

    return {
      id: g.id,
      name: g.name,
      moviesCount: g.movieTitlesSet.size,
      movieTitles: Array.from(g.movieTitlesSet),
      totalTickets: g.totalTickets,
      totalRevenue: g.totalRevenue,
      totalShowtimes: g.totalShowtimes,
      totalCapacity: g.totalCapacity,
      occupancy: genreOccupancy,
      ticketsPerShow,
      revenuePerShow,
      revenueShare,
      ticketShare,
      momentum: {
        direction,
        label,
        growthPercentage,
        currentTickets: currTix,
        previousTickets: prevTix,
      },
      daily,
    };
  });

  genresArray.sort((a, b) => b.totalRevenue - a.totalRevenue || b.totalTickets - a.totalTickets);

  // Convert Studios
  const studioPerformance: StudioPerformanceItem[] = Array.from(studiosMap.values()).map((st) => {
    const revenueShare = grandTotalRevenue > 0 ? Number(((st.totalRevenue / grandTotalRevenue) * 100).toFixed(1)) : 0;
    const occupancyRate = st.totalCapacity > 0 ? Number(((st.totalTickets / st.totalCapacity) * 100).toFixed(1)) : 0;
    const averageTicketsPerShow = st.totalShowtimes > 0 ? Number((st.totalTickets / st.totalShowtimes).toFixed(1)) : 0;
    const averageRevenuePerShow = st.totalShowtimes > 0 ? Math.round(st.totalRevenue / st.totalShowtimes) : 0;

    return {
      studioId: st.studioId,
      studioName: st.studioName,
      studioCode: st.studioCode,
      capacity: st.capacity,
      totalShowtimes: st.totalShowtimes,
      totalTickets: st.totalTickets,
      totalCapacity: st.totalCapacity,
      totalRevenue: st.totalRevenue,
      averageTicketsPerShow,
      averageRevenuePerShow,
      occupancyRate,
      revenueShare,
    };
  });

  studioPerformance.sort((a, b) => b.totalRevenue - a.totalRevenue);

  // Convert Time Slots
  const timeSlotPerformance: TimeSlotPerformanceItem[] = Array.from(timeSlotsMap.values()).map((slot) => {
    const revenueShare = grandTotalRevenue > 0 ? Number(((slot.totalRevenue / grandTotalRevenue) * 100).toFixed(1)) : 0;
    const occupancy = slot.totalCapacity > 0 ? Number(((slot.totalTickets / slot.totalCapacity) * 100).toFixed(1)) : 0;
    const averageTicketsPerShow = slot.showtimesCount > 0 ? Number((slot.totalTickets / slot.showtimesCount).toFixed(1)) : 0;
    const revenuePerShow = slot.showtimesCount > 0 ? Math.round(slot.totalRevenue / slot.showtimesCount) : 0;

    return {
      slotKey: slot.slotKey,
      label: slot.label,
      timeRange: slot.timeRange,
      totalTickets: slot.totalTickets,
      totalRevenue: slot.totalRevenue,
      showtimesCount: slot.showtimesCount,
      totalCapacity: slot.totalCapacity,
      occupancy,
      averageTicketsPerShow,
      revenuePerShow,
      revenueShare,
      isPeak: false,
    };
  });

  let peakTimeSlotItem: TimeSlotPerformanceItem | null = null;
  for (const slot of timeSlotPerformance) {
    if (!peakTimeSlotItem || slot.totalRevenue > peakTimeSlotItem.totalRevenue) {
      peakTimeSlotItem = slot;
    }
  }
  if (peakTimeSlotItem && peakTimeSlotItem.totalRevenue > 0) {
    peakTimeSlotItem.isPeak = true;
  }

  // Showtime Heatmap Grid Cells
  const showtimeHeatmap: ShowtimeHeatmapCell[] = [];
  // Order: Senin(1) to Minggu(0)
  const orderedDows = [1, 2, 3, 4, 5, 6, 0];
  for (const dow of orderedDows) {
    for (const b of heatmapBuckets) {
      const hmKey = `${dow}_${b.key}`;
      const cell = heatmapDataMap.get(hmKey) || { shows: 0, tickets: 0, capacity: 0, revenue: 0 };
      const cellOccupancy = cell.capacity > 0 ? Number(((cell.tickets / cell.capacity) * 100).toFixed(1)) : 0;
      const cellTixPerShow = cell.shows > 0 ? Number((cell.tickets / cell.shows).toFixed(1)) : 0;
      const cellRevPerShow = cell.shows > 0 ? Math.round(cell.revenue / cell.shows) : 0;

      showtimeHeatmap.push({
        dayOfWeek: dow,
        dayName: dayNamesId[dow],
        dayShort: dayShortsId[dow],
        timeSlot: b.label,
        slotKey: b.key,
        showsCount: cell.shows,
        tickets: cell.tickets,
        capacity: cell.capacity,
        occupancy: cellOccupancy,
        revenue: cell.revenue,
        ticketsPerShow: cellTixPerShow,
        revenuePerShow: cellRevPerShow,
      });
    }
  }

  // Best & Underperforming Individual Shows
  const sortedShowsByOccupancy = [...individualShowsList].sort((a, b) => b.occupancy - a.occupancy || b.tickets - a.tickets);
  const bestShows = sortedShowsByOccupancy.slice(0, 10);
  const underperformingShows = [...sortedShowsByOccupancy].reverse().slice(0, 10);

  // Day of Week Analytics
  const dayOfWeekAnalytics: DayOfWeekAnalyticsItem[] = orderedDows.map((dow) => {
    const d = dayOfWeekMap.get(dow)!;
    const occupancy = d.capacity > 0 ? Number(((d.tickets / d.capacity) * 100).toFixed(1)) : 0;
    const ticketsPerShow = d.shows > 0 ? Number((d.tickets / d.shows).toFixed(1)) : 0;
    const revenuePerShow = d.shows > 0 ? Math.round(d.revenue / d.shows) : 0;

    return {
      dayOfWeek: dow,
      dayName: dayNamesId[dow],
      dayShort: dayShortsId[dow],
      shows: d.shows,
      tickets: d.tickets,
      capacity: d.capacity,
      occupancy,
      revenue: d.revenue,
      ticketsPerShow,
      revenuePerShow,
    };
  });

  // Weekday vs Weekend
  // Weekday: Mon(1), Tue(2), Wed(3), Thu(4)
  // Weekend: Fri(5), Sat(6), Sun(0)
  let wdShows = 0, wdTickets = 0, wdCapacity = 0, wdRevenue = 0;
  let weShows = 0, weTickets = 0, weCapacity = 0, weRevenue = 0;

  for (const dow of [1, 2, 3, 4]) {
    const d = dayOfWeekMap.get(dow)!;
    wdShows += d.shows;
    wdTickets += d.tickets;
    wdCapacity += d.capacity;
    wdRevenue += d.revenue;
  }

  for (const dow of [5, 6, 0]) {
    const d = dayOfWeekMap.get(dow)!;
    weShows += d.shows;
    weTickets += d.tickets;
    weCapacity += d.capacity;
    weRevenue += d.revenue;
  }

  const wdTixPerShow = wdShows > 0 ? Number((wdTickets / wdShows).toFixed(1)) : 0;
  const wdRevPerShow = wdShows > 0 ? Math.round(wdRevenue / wdShows) : 0;
  const wdOccupancy = wdCapacity > 0 ? Number(((wdTickets / wdCapacity) * 100).toFixed(1)) : 0;

  const weTixPerShow = weShows > 0 ? Number((weTickets / weShows).toFixed(1)) : 0;
  const weRevPerShow = weShows > 0 ? Math.round(weRevenue / weShows) : 0;
  const weOccupancy = weCapacity > 0 ? Number(((weTickets / weCapacity) * 100).toFixed(1)) : 0;

  let weekendLiftPercentage = 0;
  if (wdTixPerShow > 0) {
    weekendLiftPercentage = Number((((weTixPerShow - wdTixPerShow) / wdTixPerShow) * 100).toFixed(1));
  } else if (weTixPerShow > 0) {
    weekendLiftPercentage = 100;
  }

  const weekdayWeekendComparison: WeekdayWeekendComparison = {
    weekday: {
      shows: wdShows,
      tickets: wdTickets,
      capacity: wdCapacity,
      occupancy: wdOccupancy,
      revenue: wdRevenue,
      ticketsPerShow: wdTixPerShow,
      revenuePerShow: wdRevPerShow,
    },
    weekend: {
      shows: weShows,
      tickets: weTickets,
      capacity: weCapacity,
      occupancy: weOccupancy,
      revenue: weRevenue,
      ticketsPerShow: weTixPerShow,
      revenuePerShow: weRevPerShow,
    },
    weekendLiftPercentage,
  };

  // Top movie
  const topMovie =
    moviesArray.length > 0
      ? {
          id: moviesArray[0].id,
          title: moviesArray[0].title,
          poster: moviesArray[0].poster,
          revenue: moviesArray[0].totalRevenue,
          tickets: moviesArray[0].totalTickets,
          occupancy: moviesArray[0].occupancy,
          recommendation: moviesArray[0].recommendation.label,
        }
      : null;

  // Top genre
  const topGenre =
    genresArray.length > 0 && genresArray[0].totalRevenue > 0
      ? {
          name: genresArray[0].name,
          revenue: genresArray[0].totalRevenue,
          tickets: genresArray[0].totalTickets,
          moviesCount: genresArray[0].moviesCount,
          revenueShare: genresArray[0].revenueShare,
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

  const averageTicketsPerShow = grandTotalShowtimes > 0 ? Number((grandTotalTickets / grandTotalShowtimes).toFixed(1)) : 0;
  const averageRevenuePerShow = grandTotalShowtimes > 0 ? Math.round(grandTotalRevenue / grandTotalShowtimes) : 0;

  const summary = {
    totalRevenue: grandTotalRevenue,
    totalTickets: grandTotalTickets,
    totalShowtimes: grandTotalShowtimes,
    totalCapacity: grandTotalCapacity,
    averageOccupancy,
    activeMoviesCount: moviesArray.length,
    averageTicketsPerShow,
    averageRevenuePerShow,
    averageTicketsPerDay: Math.round(grandTotalTickets / effectiveDaysCount),
    averageRevenuePerDay: Math.round(grandTotalRevenue / effectiveDaysCount),
    topMovie,
    topGenre,
    highestSalesDay,
    peakTimeSlot:
      peakTimeSlotItem && peakTimeSlotItem.totalRevenue > 0
        ? {
            label: peakTimeSlotItem.label,
            timeRange: peakTimeSlotItem.timeRange,
            revenue: peakTimeSlotItem.totalRevenue,
            tickets: peakTimeSlotItem.totalTickets,
            occupancy: peakTimeSlotItem.occupancy,
          }
        : null,
  };

  return {
    period: {
      startDate: startDateStr,
      endDate: finalEndDateStr,
      days: effectiveDaysCount,
      timezone,
      previousStartDate: prevStartDateStr,
      previousEndDate: prevEndDateStr,
    },
    summary,
    dailyTotals,
    movies: moviesArray,
    genres: genresArray,
    studioPerformance,
    timeSlotPerformance,
    showtimeHeatmap,
    bestShows,
    underperformingShows,
    dayOfWeekAnalytics,
    weekdayWeekendComparison,
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


