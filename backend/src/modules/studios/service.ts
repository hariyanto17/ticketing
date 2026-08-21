import { prisma } from "../../utils/prisma";
import { AppError } from "../../utils/errorHandler";
import { CreateStudioInput, UpdateStudioInput } from "./validation";

interface GetStudiosQuery {
  page?: number;
  limit?: number;
  search?: string;
  status?: string;
}

export const getAllStudios = async (query: GetStudiosQuery) => {
  const page = Number(query.page) || 1;
  const limit = Number(query.limit) || 10;
  const skip = (page - 1) * limit;

  const where: any = {};

  if (query.status) {
    where.status = query.status;
  }

  if (query.search) {
    where.OR = [
      { name: { contains: query.search, mode: "insensitive" } },
      { code: { contains: query.search, mode: "insensitive" } },
    ];
  }

  const [studios, total] = await Promise.all([
    prisma.studio.findMany({
      where,
      include: {
        branch: { select: { id: true, name: true } },
      },
      skip,
      take: limit,
      orderBy: { name: "asc" },
    }),
    prisma.studio.count({ where }),
  ]);

  return {
    studios,
    meta: {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    },
  };
};

export const getStudioById = async (id: string) => {
  const studio = await prisma.studio.findUnique({
    where: { id },
    include: { branch: true },
  });
  if (!studio) throw new AppError("NOT_FOUND", "Studio not found");
  return studio;
};

export const createStudio = async (input: CreateStudioInput) => {
  const existing = await prisma.studio.findUnique({ where: { code: input.code } });
  if (existing) throw new AppError("CONFLICT", "Studio code must be unique");

  let branchId = input.branchId;
  if (!branchId) {
    const firstBranch = await prisma.branch.findFirst();
    if (!firstBranch) throw new AppError("INTERNAL_SERVER_ERROR", "No cinema branches configured");
    branchId = firstBranch.id;
  }

  // Default layout: rows A-K (11 rows) and 12 columns
  const defaultRows = input.layoutRows ?? 11;
  const defaultCols = input.layoutColumns ?? 12;

  return prisma.studio.create({
    data: {
      name: input.name,
      code: input.code,
      capacity: input.capacity,
      type: input.type,
      status: input.status,
      branchId,
      layoutRows: defaultRows,
      layoutColumns: defaultCols,
    },
  });
};

export const updateStudio = async (id: string, input: UpdateStudioInput) => {
  const studio = await getStudioById(id);

  if (input.code && input.code !== studio.code) {
    const existing = await prisma.studio.findUnique({ where: { code: input.code } });
    if (existing) throw new AppError("CONFLICT", "Studio code already taken");
  }

  return prisma.studio.update({
    where: { id },
    data: {
      name: input.name,
      code: input.code,
      capacity: input.capacity,
      ...(input.layoutRows !== undefined && { layoutRows: input.layoutRows }),
      ...(input.layoutColumns !== undefined && { layoutColumns: input.layoutColumns }),
      type: input.type,
      status: input.status,
      ...(input.branchId && { branchId: input.branchId }),
    },
  });
};

export const deleteStudioSoft = async (id: string) => {
  await getStudioById(id);
  // Soft Delete: set status to CLOSED
  return prisma.studio.update({
    where: { id },
    data: { status: "CLOSED" },
  });
};

export const copyLayout = async (destinationStudioId: string, sourceStudioId: string) => {
  if (destinationStudioId === sourceStudioId) {
    throw new AppError("BAD_REQUEST", "Source and destination studios must be different");
  }

  // Verify destination exists
  const destinationStudio = await prisma.studio.findUnique({
    where: { id: destinationStudioId },
  });
  if (!destinationStudio) {
    throw new AppError("NOT_FOUND", "Destination studio not found");
  }

  // Verify source exists
  const sourceStudio = await prisma.studio.findUnique({
    where: { id: sourceStudioId },
  });
  if (!sourceStudio) {
    throw new AppError("NOT_FOUND", "Source studio not found");
  }

  // Check if destination has active showtimes
  const activeShowtimes = await prisma.showtime.findFirst({
    where: {
      studioId: destinationStudioId,
      status: { in: ["DRAFT", "PUBLISHED"] },
    },
  });
  if (activeShowtimes) {
    throw new AppError(
      "BAD_REQUEST",
      "Cannot copy layout because the destination studio has active or scheduled showtimes."
    );
  }

  return prisma.$transaction(async (tx) => {
    // 1. Delete all existing seats for the destination studio
    await tx.seat.deleteMany({
      where: { studioId: destinationStudioId },
    });

    // 2. Load all seats of the source studio
    const sourceSeats = await tx.seat.findMany({
      where: { studioId: sourceStudioId },
    });

    // 3. Create new seats for the destination studio copying layout details
    const newSeatsData = sourceSeats.map((s) => ({
      studioId: destinationStudioId,
      row: s.row,
      column: s.column,
      seatNumber: s.seatNumber,
      seatLabel: s.seatLabel,
      seatType: s.seatType,
      status: s.status,
    }));

    if (newSeatsData.length > 0) {
      await tx.seat.createMany({
        data: newSeatsData,
      });
    }

    // 4. Update destination studio's dimensions and capacity
    const activeSeatsCount = newSeatsData.filter((s) => s.status === "ACTIVE").length;

    await tx.studio.update({
      where: { id: destinationStudioId },
      data: {
        layoutRows: sourceStudio.layoutRows,
        layoutColumns: sourceStudio.layoutColumns,
        capacity: activeSeatsCount,
      },
    });

    return {
      studioId: destinationStudioId,
      sourceStudioId,
      seatCount: newSeatsData.length,
      capacity: activeSeatsCount,
    };
  });
};
