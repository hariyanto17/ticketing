import { prisma } from "../../../utils/prisma";
import { ReportQueryInput } from "./validation";

export interface MoviePerformanceItem {
  movieId: string;
  movieTitle: string;
  durationMinutes: number | null;
  ticketsSold: number;
  ticketsActive: number;
  ticketsUsed: number;
  grossRevenue: number;
  refundAmount: number;
  netRevenue: number;
  averageTicketPrice: number | null;
  revenueShare: number;
}

export interface ShowtimePerformanceItem {
  showtimeId: string;
  movieId: string;
  movieTitle: string;
  studioId: string;
  studioName: string;
  studioCode: string;
  showDate: string;
  startTime: string;
  endTime: string | null;
  ticketPrice: number;
  totalSeats: number;
  soldSeats: number;
  usedSeats: number;
  availableSeats: number;
  occupancyRate: number | null;
  revenue: number;
}

export interface ReportPaginationResult<T> {
  data: T[];
  summary: {
    totalItems: number;
    totalRevenue: number;
    totalTicketsSold?: number;
    totalSeats?: number;
    averageOccupancyRate?: number | null;
  };
  pagination: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

export const getMoviePerformanceReport = async (
  input: ReportQueryInput
): Promise<ReportPaginationResult<MoviePerformanceItem>> => {
  const start = new Date(input.startDate);
  start.setUTCHours(0, 0, 0, 0);
  const end = new Date(input.endDate);
  end.setUTCHours(23, 59, 59, 999);

  // Fetch orders with tickets and schedule movie within date range
  const orderWhere: any = {
    createdAt: { gte: start, lte: end },
    orderStatus: { in: ["PAID", "REFUNDED"] },
  };

  if (input.movieId) {
    orderWhere.schedule = { movieId: input.movieId };
  }

  const orders = await prisma.order.findMany({
    where: orderWhere,
    include: {
      tickets: true,
      schedule: {
        include: {
          movie: true,
        },
      },
    },
  });

  const movieMap = new Map<string, {
    movieId: string;
    movieTitle: string;
    durationMinutes: number | null;
    ticketsSold: number;
    ticketsActive: number;
    ticketsUsed: number;
    grossRevenue: number;
    refundAmount: number;
    netRevenue: number;
  }>();

  for (const o of orders) {
    const movie = o.schedule?.movie;
    if (!movie) continue;

    if (input.search) {
      const q = input.search.toLowerCase();
      if (!movie.title.toLowerCase().includes(q)) continue;
    }

    const movieId = movie.id;
    const existing = movieMap.get(movieId) || {
      movieId,
      movieTitle: movie.title,
      durationMinutes: movie.durationMinutes || null,
      ticketsSold: 0,
      ticketsActive: 0,
      ticketsUsed: 0,
      grossRevenue: 0,
      refundAmount: 0,
      netRevenue: 0,
    };

    const activeTickets = o.tickets.filter((t) => t.status === "ACTIVE").length;
    const usedTickets = o.tickets.filter((t) => t.status === "USED").length;
    const cancelledTickets = o.tickets.filter((t) => t.status === "CANCELLED").length;
    const validTicketsCount = activeTickets + usedTickets;

    const totalTickets = validTicketsCount + cancelledTickets;
    const ticketPrice = totalTickets > 0 ? o.totalAmount / totalTickets : o.totalAmount;

    if (o.orderStatus === "PAID") {
      existing.grossRevenue += o.totalAmount;
      existing.ticketsSold += validTicketsCount;
      existing.ticketsActive += activeTickets;
      existing.ticketsUsed += usedTickets;
      existing.refundAmount += cancelledTickets * ticketPrice;
    } else if (o.orderStatus === "REFUNDED") {
      existing.refundAmount += o.totalAmount;
    }

    movieMap.set(movieId, existing);
  }

  // Calculate netRevenue, averageTicketPrice, and revenueShare
  let totalNetRevenue = 0;
  let totalTicketsSoldSum = 0;

  const moviesList = Array.from(movieMap.values()).map((m) => {
    const net = Math.max(0, m.grossRevenue - m.refundAmount);
    totalNetRevenue += net;
    totalTicketsSoldSum += m.ticketsSold;
    return {
      ...m,
      netRevenue: net,
    };
  });

  const fullReport: MoviePerformanceItem[] = moviesList
    .map((m) => {
      const avgPrice = m.ticketsSold > 0 ? Number((m.netRevenue / m.ticketsSold).toFixed(2)) : null;
      const share = totalNetRevenue > 0 ? Number(((m.netRevenue / totalNetRevenue) * 100).toFixed(2)) : 0;
      return {
        ...m,
        averageTicketPrice: avgPrice,
        revenueShare: share,
      };
    })
    .sort((a, b) => b.netRevenue - a.netRevenue);

  // Pagination
  const page = input.page || 1;
  const limit = input.limit || 20;
  const skip = (page - 1) * limit;
  const paginatedData = fullReport.slice(skip, skip + limit);

  return {
    data: paginatedData,
    summary: {
      totalItems: fullReport.length,
      totalRevenue: totalNetRevenue,
      totalTicketsSold: totalTicketsSoldSum,
    },
    pagination: {
      total: fullReport.length,
      page,
      limit,
      totalPages: Math.ceil(fullReport.length / limit) || 1,
    },
  };
};

export const getShowtimePerformanceReport = async (
  input: ReportQueryInput
): Promise<ReportPaginationResult<ShowtimePerformanceItem>> => {
  const start = new Date(input.startDate);
  start.setUTCHours(0, 0, 0, 0);
  const end = new Date(input.endDate);
  end.setUTCHours(23, 59, 59, 999);

  const showtimeWhere: any = {
    businessDate: { gte: start, lte: end },
  };

  if (input.movieId) {
    showtimeWhere.movieId = input.movieId;
  }
  if (input.studioId) {
    showtimeWhere.studioId = input.studioId;
  }
  if (input.showtimeId) {
    showtimeWhere.id = input.showtimeId;
  }

  const showtimes = await prisma.showtime.findMany({
    where: showtimeWhere,
    include: {
      movie: true,
      studio: {
        include: {
          seats: true,
        },
      },
      orders: {
        where: {
          orderStatus: "PAID",
        },
        include: {
          tickets: true,
        },
      },
    },
    orderBy: {
      startTime: "desc",
    },
  });

  let totalShowtimeRevenue = 0;
  let totalSoldSeatsSum = 0;
  let totalAvailableCapacity = 0;

  const items: ShowtimePerformanceItem[] = [];

  for (const s of showtimes) {
    if (input.search) {
      const q = input.search.toLowerCase();
      const matchMovie = s.movie?.title.toLowerCase().includes(q);
      const matchStudio = s.studio?.name.toLowerCase().includes(q) || s.studio?.code.toLowerCase().includes(q);
      if (!matchMovie && !matchStudio) continue;
    }

    const totalSeats = s.studio?.seats?.length || s.studio?.capacity || 0;
    
    let soldSeats = 0;
    let usedSeats = 0;
    let revenue = 0;

    for (const o of s.orders) {
      revenue += o.totalAmount;
      soldSeats += o.tickets.filter((t) => t.status === "ACTIVE" || t.status === "USED").length;
      usedSeats += o.tickets.filter((t) => t.status === "USED").length;
    }

    const availableSeats = Math.max(0, totalSeats - soldSeats);
    const occupancyRate = totalSeats > 0 ? Number(((soldSeats / totalSeats) * 100).toFixed(2)) : null;

    totalShowtimeRevenue += revenue;
    totalSoldSeatsSum += soldSeats;
    totalAvailableCapacity += totalSeats;

    items.push({
      showtimeId: s.id,
      movieId: s.movieId,
      movieTitle: s.movie?.title || "Unknown Movie",
      studioId: s.studioId,
      studioName: s.studio?.name || "Unknown Studio",
      studioCode: s.studio?.code || "TBD",
      showDate: s.businessDate.toISOString().split("T")[0],
      startTime: s.startTime.toISOString(),
      endTime: s.endTime ? s.endTime.toISOString() : null,
      ticketPrice: s.ticketPrice,
      totalSeats,
      soldSeats,
      usedSeats,
      availableSeats,
      occupancyRate,
      revenue,
    });
  }

  // Sort by revenue DESC, then startTime DESC
  items.sort((a, b) => b.revenue - a.revenue || b.startTime.localeCompare(a.startTime));

  const averageOccupancy = totalAvailableCapacity > 0
    ? Number(((totalSoldSeatsSum / totalAvailableCapacity) * 100).toFixed(2))
    : null;

  // Pagination
  const page = input.page || 1;
  const limit = input.limit || 20;
  const skip = (page - 1) * limit;
  const paginatedData = items.slice(skip, skip + limit);

  return {
    data: paginatedData,
    summary: {
      totalItems: items.length,
      totalRevenue: totalShowtimeRevenue,
      totalTicketsSold: totalSoldSeatsSum,
      totalSeats: totalAvailableCapacity,
      averageOccupancyRate: averageOccupancy,
    },
    pagination: {
      total: items.length,
      page,
      limit,
      totalPages: Math.ceil(items.length / limit) || 1,
    },
  };
};
