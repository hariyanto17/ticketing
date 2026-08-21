import { prisma } from "../../utils/prisma";
import { AppError } from "../../utils/errorHandler";
import { SeatInput, BatchLayoutInput } from "./validation";

export const getSeatsByStudio = async (studioId: string) => {
  return prisma.seat.findMany({
    where: { studioId },
    orderBy: [{ row: "asc" }, { column: "asc" }],
  });
};

export const createSeat = async (input: SeatInput) => {
  // Check duplicate
  const duplicate = await prisma.seat.findFirst({
    where: {
      studioId: input.studioId,
      row: input.row,
      column: input.column,
    },
  });

  if (duplicate) {
    throw new AppError("CONFLICT", `Seat at ${input.row}${input.column} already exists`);
  }

  return prisma.seat.create({
    data: input,
  });
};

export const updateSeat = async (id: string, input: Partial<SeatInput>) => {
  const seat = await prisma.seat.findUnique({ where: { id } });
  if (!seat) throw new AppError("NOT_FOUND", "Seat not found");

  return prisma.seat.update({
    where: { id },
    data: input,
  });
};

export const deleteSeat = async (id: string) => {
  const seat = await prisma.seat.findUnique({ where: { id } });
  if (!seat) throw new AppError("NOT_FOUND", "Seat not found");

  return prisma.seat.delete({ where: { id } });
};

export const saveBatchLayout = async (
  studioId: string,
  seats: SeatInput[],
  options?: { force?: boolean }
) => {
  const studio = await prisma.studio.findUnique({ where: { id: studioId } });
  if (!studio) throw new AppError("NOT_FOUND", "Studio not found");

  // Validate incoming seats for duplicate row+column
  const seen = new Set<string>();
  for (const s of seats) {
    const key = `${s.row}:${s.column}`;
    if (seen.has(key)) throw new AppError("BAD_REQUEST", `Duplicate seat position ${s.row}${s.column}`);
    seen.add(key);
  }

  return prisma.$transaction(async (tx) => {
    const existingSeats = await tx.seat.findMany({ where: { studioId } });

    const existingById = new Map(existingSeats.map((e) => [e.id, e]));
    const existingByRowCol = new Map(existingSeats.map((e) => [`${e.row}:${e.column}`, e]));

    const toCreate: SeatInput[] = [];
    const toUpdate: { id: string; data: Partial<SeatInput> }[] = [];
    const matchedExistingIds = new Set<string>();

    for (const s of seats) {
      if (s.id && existingById.has(s.id)) {
        matchedExistingIds.add(s.id);
        toUpdate.push({ id: s.id, data: { row: s.row, column: s.column, seatNumber: s.seatNumber, seatLabel: s.seatLabel, seatType: s.seatType, status: s.status } });
        continue;
      }

      const byKey = existingByRowCol.get(`${s.row}:${s.column}`);
      if (byKey) {
        matchedExistingIds.add(byKey.id);
        toUpdate.push({ id: byKey.id, data: { row: s.row, column: s.column, seatNumber: s.seatNumber, seatLabel: s.seatLabel, seatType: s.seatType, status: s.status } });
        continue;
      }

      toCreate.push(s);
    }

    const candidatesToRemove = existingSeats.filter((e) => !matchedExistingIds.has(e.id));

    const removedSeats: any[] = [];
    for (const candidate of candidatesToRemove) {
      const dependent = await tx.showtimeSeat.findFirst({ where: { seatId: candidate.id } });
      if (dependent) {
        // Preserve historical integrity: mark as DISABLED instead of deleting
        await tx.seat.update({ where: { id: candidate.id }, data: { status: "DISABLED" } });
        removedSeats.push({ id: candidate.id, seatLabel: candidate.seatLabel, action: "disabled_due_to_dependencies" });
      } else {
        await tx.seat.delete({ where: { id: candidate.id } });
        removedSeats.push({ id: candidate.id, seatLabel: candidate.seatLabel, action: "deleted" });
      }
    }

    const updatedSeats: any[] = [];
    for (const u of toUpdate) {
      const updated = await tx.seat.update({ where: { id: u.id }, data: { ...u.data } });
      updatedSeats.push(updated);
    }

    const createdSeats: any[] = [];
    for (const c of toCreate) {
      const created = await tx.seat.create({ data: { studioId, row: c.row, column: c.column, seatNumber: c.seatNumber, seatLabel: c.seatLabel, seatType: c.seatType, status: c.status } });
      createdSeats.push(created);
    }

    // Recalculate capacity (ACTIVE seats only)
    const activeSeatsCount = await tx.seat.count({ where: { studioId, status: "ACTIVE" } });
    await tx.studio.update({ where: { id: studioId }, data: { capacity: activeSeatsCount } });

    return { created: createdSeats, updated: updatedSeats, removed: removedSeats, capacity: activeSeatsCount };
  });
};

export const validateRemoval = async (studioId: string, opts: { row?: string; column?: number }) => {
  // Find seats in the given row or column
  const where: any = { studioId };
  if (opts.row) where.row = opts.row;
  if (opts.column) where.column = opts.column;

  const seats = await prisma.seat.findMany({ where });
  const blocked: any[] = [];

  for (const s of seats) {
    const dep = await prisma.showtimeSeat.findFirst({ where: { seatId: s.id } });
    if (dep) {
      blocked.push({ id: s.id, seatLabel: s.seatLabel });
    }
  }

  return { safe: blocked.length === 0, blocked };
};
