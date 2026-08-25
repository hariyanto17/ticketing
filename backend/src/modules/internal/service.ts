import { prisma } from "../../utils/prisma";

export interface OperationalSummary {
  revenue: number;
  transactions: number;
  ticketsSold: number;
  averageTransaction: number;
}

export interface AnalyticsTrendItem {
  date: string;
  revenue: number;
  transactions: number;
  ticketsSold: number;
}

export interface AnalyticsResult {
  revenue: number;
  transactions: number;
  ticketsSold: number;
  daily: AnalyticsTrendItem[];
}

export interface ActivityResult {
  id: string;
  source: "TICKETING";
  type: "TRANSACTION";
  title: string;
  description: string;
  timestamp: string;
  status: string;
  amount: number;
  referenceId: string;
}

export interface TransactionItem {
  id: string;
  source: "TICKETING";
  transactionNumber: string;
  status: string;
  amount: number;
  currency: "IDR";
  itemCount: number;
  timestamp: string;
  customerName: string | null;
  cashierName: string;
}

export interface TransactionsPaginationResult {
  transactions: TransactionItem[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

const formatRupiah = (val: number) => {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(val);
};

export const getOperationalSummary = async (dateStr: string): Promise<OperationalSummary> => {
  const start = new Date(dateStr);
  start.setUTCHours(0, 0, 0, 0);
  const end = new Date(dateStr);
  end.setUTCHours(23, 59, 59, 999);

  const [orders, ticketsCount] = await Promise.all([
    prisma.order.findMany({
      where: {
        orderStatus: "PAID",
        createdAt: { gte: start, lte: end },
      },
      select: {
        totalAmount: true,
      },
    }),
    prisma.ticket.count({
      where: {
        order: {
          orderStatus: "PAID",
          createdAt: { gte: start, lte: end },
        },
        status: { in: ["ACTIVE", "USED"] },
      },
    }),
  ]);

  const transactions = orders.length;
  const revenue = orders.reduce((sum, o) => sum + o.totalAmount, 0);
  const averageTransaction = transactions > 0 ? revenue / transactions : 0;

  return {
    revenue,
    transactions,
    ticketsSold: ticketsCount,
    averageTransaction,
  };
};

export const getAnalyticsData = async (startDate: string, endDate: string): Promise<AnalyticsResult> => {
  const start = new Date(startDate);
  start.setUTCHours(0, 0, 0, 0);
  const end = new Date(endDate);
  end.setUTCHours(23, 59, 59, 999);

  const orders = await prisma.order.findMany({
    where: {
      orderStatus: "PAID",
      createdAt: { gte: start, lte: end },
    },
    select: {
      totalAmount: true,
      createdAt: true,
      tickets: {
        where: {
          status: { in: ["ACTIVE", "USED"] },
        },
        select: {
          id: true,
        },
      },
    },
  });

  let totalRevenue = 0;
  const totalTransactions = orders.length;
  let totalTicketsSold = 0;

  const dailyMap: Record<string, { date: string; revenue: number; transactions: number; ticketsSold: number }> = {};
  const currentDate = new Date(start);
  while (currentDate <= end) {
    const dStr = currentDate.toISOString().split("T")[0];
    dailyMap[dStr] = { date: dStr, revenue: 0, transactions: 0, ticketsSold: 0 };
    currentDate.setUTCDate(currentDate.getUTCDate() + 1);
  }

  for (const o of orders) {
    const dStr = o.createdAt.toISOString().split("T")[0];
    const revenue = o.totalAmount;
    const ticketsSold = o.tickets.length;

    totalRevenue += revenue;
    totalTicketsSold += ticketsSold;

    if (dailyMap[dStr]) {
      dailyMap[dStr].revenue += revenue;
      dailyMap[dStr].transactions += 1;
      dailyMap[dStr].ticketsSold += ticketsSold;
    }
  }

  const daily = Object.values(dailyMap).sort((a, b) => a.date.localeCompare(b.date));

  return {
    revenue: totalRevenue,
    transactions: totalTransactions,
    ticketsSold: totalTicketsSold,
    daily,
  };
};

export const getActivityList = async (): Promise<ActivityResult[]> => {
  const orders = await prisma.order.findMany({
    where: {
      orderStatus: { in: ["PAID", "CANCELLED"] },
    },
    orderBy: { createdAt: "desc" },
    take: 20,
    include: {
      cashier: { select: { name: true } },
    },
  });

  return orders.map((o) => ({
    id: `ticketing-${o.id}`,
    source: "TICKETING",
    type: "TRANSACTION",
    title: o.orderStatus === "PAID" ? "Ticket sale completed" : "Ticket order cancelled",
    description: `${o.bookingNumber || o.orderNumber} • ${formatRupiah(o.totalAmount)} by ${o.cashier?.name || "Online Guest"}`,
    timestamp: o.createdAt.toISOString(),
    status: o.orderStatus,
    amount: o.totalAmount,
    referenceId: o.id,
  }));
};

export const getTransactionsList = async (filters: {
  page: number;
  limit: number;
  status?: string;
  date?: string;
  search?: string;
}): Promise<TransactionsPaginationResult> => {
  const { page, limit, status, date, search } = filters;
  const skip = (page - 1) * limit;

  const where: any = {};
  if (status) {
    where.orderStatus = status;
  } else {
    where.orderStatus = { in: ["PAID", "CANCELLED"] };
  }

  if (date) {
    const start = new Date(date);
    start.setUTCHours(0, 0, 0, 0);
    const end = new Date(date);
    end.setUTCHours(23, 59, 59, 999);
    where.createdAt = { gte: start, lte: end };
  }

  if (search) {
    where.OR = [
      { orderNumber: { contains: search, mode: "insensitive" } },
      { bookingNumber: { contains: search, mode: "insensitive" } },
    ];
  }

  const [orders, totalCount] = await Promise.all([
    prisma.order.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip,
      take: limit,
      include: {
        cashier: { select: { name: true } },
        tickets: true,
      },
    }),
    prisma.order.count({ where }),
  ]);

  const transactions = orders.map((o) => ({
    id: o.id,
    source: "TICKETING" as const,
    transactionNumber: o.bookingNumber || o.orderNumber,
    status: o.orderStatus,
    amount: o.totalAmount,
    currency: "IDR" as const,
    itemCount: o.tickets.filter((t) => t.status !== "CANCELLED").length,
    timestamp: o.createdAt.toISOString(),
    customerName: o.customerName || null,
    cashierName: o.cashier?.name || "Online Guest",
  }));

  return {
    transactions,
    pagination: {
      total: totalCount,
      page,
      limit,
      totalPages: Math.ceil(totalCount / limit),
    },
  };
};
