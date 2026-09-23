import { prisma } from "../../utils/prisma";
import { AppError } from "../../utils/errorHandler";
import { CreatePromotionInput, UpdatePromotionInput } from "./validation";

interface GetPromotionsQuery {
  page?: number;
  limit?: number;
  search?: string;
  promoType?: string;
  isActive?: boolean | string;
  branchId?: string;
  movieId?: string;
}

const promoInclude = {
  branch: { select: { id: true, name: true, code: true } },
  movies: {
    include: {
      movie: { select: { id: true, title: true, poster: true } },
    },
  },
};

export const getAllPromotions = async (query: GetPromotionsQuery) => {
  const page = Number(query.page) || 1;
  const limit = Number(query.limit) || 10;
  const skip = (page - 1) * limit;

  const where: any = {};

  if (query.search) {
    where.OR = [
      { name: { contains: query.search, mode: "insensitive" } },
      { code: { contains: query.search, mode: "insensitive" } },
    ];
  }

  if (query.promoType) {
    where.promoType = query.promoType;
  }

  if (query.isActive !== undefined) {
    where.isActive = query.isActive === true || query.isActive === "true";
  }

  if (query.branchId) {
    where.OR = [{ branchId: query.branchId }, { branchId: null }];
  }

  if (query.movieId) {
    where.movies = {
      some: { movieId: query.movieId },
    };
  }

  const [promotions, total] = await Promise.all([
    prisma.promotion.findMany({
      where,
      include: promoInclude,
      skip,
      take: limit,
      orderBy: { createdAt: "desc" },
    }),
    prisma.promotion.count({ where }),
  ]);

  return {
    promotions,
    meta: {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    },
  };
};

export const getActivePromotions = async (branchId?: string, movieId?: string) => {
  const now = new Date();

  const where: any = {
    isActive: true,
    startDate: { lte: now },
    endDate: { gte: now },
  };

  if (branchId) {
    where.OR = [{ branchId }, { branchId: null }];
  }

  if (movieId) {
    where.movies = {
      some: { movieId },
    };
  }

  const promotions = await prisma.promotion.findMany({
    where,
    include: promoInclude,
    orderBy: { createdAt: "desc" },
  });

  // Filter out promotions that have exhausted their quota
  return promotions.filter((p) => p.usedQuota < p.quota);
};

export const getPromotionById = async (id: string) => {
  const promotion = await prisma.promotion.findUnique({
    where: { id },
    include: promoInclude,
  });

  if (!promotion) throw new AppError("NOT_FOUND", "Promotion not found");
  return promotion;
};

export const createPromotion = async (input: CreatePromotionInput) => {
  if (input.code) {
    const existing = await prisma.promotion.findUnique({
      where: { code: input.code },
    });
    if (existing) {
      throw new AppError("BAD_REQUEST", `Kode promo '${input.code}' sudah digunakan`);
    }
  }

  const { movieIds, ...data } = input;

  const promotion = await prisma.promotion.create({
    data: {
      name: data.name,
      code: data.code || null,
      promoType: data.promoType,
      discountPercent: data.discountPercent ?? null,
      maxDiscount: data.maxDiscount ?? null,
      buyQty: data.buyQty ?? (data.promoType === "BUY_X_GET_Y" ? 1 : null),
      getQty: data.getQty ?? (data.promoType === "BUY_X_GET_Y" ? 1 : null),
      quota: data.quota,
      usedQuota: 0,
      minTickets: data.minTickets ?? 1,
      maxUsagePerOrder: data.maxUsagePerOrder ?? null,
      startDate: new Date(data.startDate),
      endDate: new Date(data.endDate),
      isActive: data.isActive ?? true,
      status: "ACTIVE",
      branchId: data.branchId || null,
      movies: movieIds && movieIds.length > 0 ? {
        create: movieIds.map((mId) => ({ movieId: mId })),
      } : undefined,
    },
    include: promoInclude,
  });

  return promotion;
};

export const updatePromotion = async (id: string, input: UpdatePromotionInput) => {
  await getPromotionById(id);

  if (input.code) {
    const existing = await prisma.promotion.findFirst({
      where: {
        code: input.code,
        NOT: { id },
      },
    });
    if (existing) {
      throw new AppError("BAD_REQUEST", `Kode promo '${input.code}' sudah digunakan`);
    }
  }

  const { movieIds, ...rest } = input;
  const data: any = { ...rest };
  if (input.startDate) data.startDate = new Date(input.startDate);
  if (input.endDate) data.endDate = new Date(input.endDate);

  if (movieIds !== undefined) {
    await prisma.promotionMovie.deleteMany({
      where: { promotionId: id },
    });
    if (movieIds.length > 0) {
      await prisma.promotionMovie.createMany({
        data: movieIds.map((mId) => ({ promotionId: id, movieId: mId })),
      });
    }
  }

  const updated = await prisma.promotion.update({
    where: { id },
    data,
    include: promoInclude,
  });

  return updated;
};

export const deletePromotion = async (id: string) => {
  await getPromotionById(id);

  // Check if promo has been used in orders
  const ordersCount = await prisma.order.count({
    where: { promotionId: id },
  });

  if (ordersCount > 0) {
    // If already used in orders, soft delete by deactivating
    return prisma.promotion.update({
      where: { id },
      data: { isActive: false, status: "INACTIVE" },
    });
  }

  // Otherwise hard delete
  return prisma.promotion.delete({
    where: { id },
  });
};

export interface PromoCalculationResult {
  promotionId: string;
  promoName: string;
  promoType: string;
  subtotal: number;
  discountAmount: number;
  finalAmount: number;
  freeTicketsCount: number;
  usedQuotaIncrement: number;
  details: {
    ticketPrice: number;
    ticketCount: number;
    description: string;
  };
}

export const calculatePromotionDiscount = (
  promotion: any,
  ticketCount: number,
  ticketPrice: number,
  movieId?: string
): PromoCalculationResult => {
  const now = new Date();

  if (!promotion.isActive) {
    throw new AppError("BAD_REQUEST", "Promo sudah tidak aktif");
  }

  if (now < promotion.startDate) {
    throw new AppError("BAD_REQUEST", "Promo belum mulai berlaku");
  }

  if (now > promotion.endDate) {
    throw new AppError("BAD_REQUEST", "Promo sudah expired");
  }

  // Validate Movie eligibility
  if (promotion.movies && promotion.movies.length > 0) {
    if (!movieId) {
      throw new AppError("BAD_REQUEST", "Movie ID diperlukan untuk memvalidasi promo ini");
    }
    const isMovieAllowed = promotion.movies.some(
      (pm: any) => pm.movieId === movieId || pm.movie?.id === movieId
    );
    if (!isMovieAllowed) {
      throw new AppError(
        "BAD_REQUEST",
        `Promo '${promotion.name}' tidak berlaku untuk film ini`
      );
    }
  }

  const remainingQuota = promotion.quota - promotion.usedQuota;
  if (remainingQuota <= 0) {
    throw new AppError("BAD_REQUEST", "Kuota promo sudah habis");
  }

  if (ticketCount < promotion.minTickets) {
    throw new AppError(
      "BAD_REQUEST",
      `Minimal pembelian untuk promo ini adalah ${promotion.minTickets} tiket`
    );
  }

  const subtotal = ticketCount * ticketPrice;
  let discountAmount = 0;
  let freeTicketsCount = 0;
  let usedQuotaIncrement = 0;
  let description = "";

  if (promotion.promoType === "BUY_X_GET_Y") {
    const buyQty = promotion.buyQty || 1;
    const getQty = promotion.getQty || 1;
    const bundleSize = buyQty + getQty;

    // Number of complete bundles customer qualified for
    const bundles = Math.floor(ticketCount / bundleSize);
    if (bundles <= 0) {
      throw new AppError(
        "BAD_REQUEST",
        `Untuk promo Buy ${buyQty} Get ${getQty}, minimal harus memilih ${bundleSize} tiket`
      );
    }

    let theoreticalFree = bundles * getQty;
    if (promotion.maxUsagePerOrder && theoreticalFree > promotion.maxUsagePerOrder) {
      theoreticalFree = promotion.maxUsagePerOrder;
    }

    // Limit by available remaining quota
    freeTicketsCount = Math.min(theoreticalFree, remainingQuota);
    discountAmount = freeTicketsCount * ticketPrice;
    usedQuotaIncrement = freeTicketsCount;
    description = `Buy ${buyQty} Get ${getQty}: Gratis ${freeTicketsCount} tiket`;
  } else if (promotion.promoType === "PERCENTAGE") {
    const percent = promotion.discountPercent || 0;
    let eligibleTickets = Math.min(ticketCount, remainingQuota);

    if (promotion.maxUsagePerOrder && eligibleTickets > promotion.maxUsagePerOrder) {
      eligibleTickets = promotion.maxUsagePerOrder;
    }

    let calculatedDiscount = eligibleTickets * ticketPrice * (percent / 100);
    if (promotion.maxDiscount && calculatedDiscount > promotion.maxDiscount) {
      calculatedDiscount = promotion.maxDiscount;
    }

    discountAmount = calculatedDiscount;
    usedQuotaIncrement = eligibleTickets;
    description = `Diskon ${percent}% untuk ${eligibleTickets} tiket`;
  }

  const finalAmount = Math.max(0, subtotal - discountAmount);

  return {
    promotionId: promotion.id,
    promoName: promotion.name,
    promoType: promotion.promoType,
    subtotal,
    discountAmount,
    finalAmount,
    freeTicketsCount,
    usedQuotaIncrement,
    details: {
      ticketPrice,
      ticketCount,
      description,
    },
  };
};
