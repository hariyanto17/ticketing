import bcrypt from "bcryptjs";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

type SeatTemplate = {
  row: string;
  column: number;
  seatNumber: number;
  seatLabel: string;
  seatType: string;
  status: string;
};

const DEFAULT_ROWS = Array.from({ length: 11 }, (_, i) => String.fromCharCode(65 + i));
const DEFAULT_LAYOUT_COLUMNS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 13, 14, 15, 16, 17, 18];

const getRowIndex = (row: string): number => {
  let index = 0;
  for (let i = 0; i < row.length; i++) {
    index = index * 26 + (row.charCodeAt(i) - 64);
  }
  return index - 1;
};

const buildFallbackSeatTemplate = (): SeatTemplate[] => {
  const layout: SeatTemplate[] = [];

  for (const row of DEFAULT_ROWS) {
    for (const column of DEFAULT_LAYOUT_COLUMNS) {
      const seatNumber = DEFAULT_LAYOUT_COLUMNS.indexOf(column) + 1;
      layout.push({
        row,
        column,
        seatNumber,
        seatLabel: `${row}${seatNumber}`,
        seatType: "REGULAR",
        status: "ACTIVE",
      });
    }
  }

  return layout;
};

const buildSeatTemplate = (studioSeats?: Array<{ row: string; column: number; seatNumber: number; seatLabel: string; seatType: string; status: string }>): SeatTemplate[] => {
  if (studioSeats && studioSeats.length > 0) {
    return [...studioSeats]
      .sort((a, b) => {
        const rowDiff = getRowIndex(a.row) - getRowIndex(b.row);
        if (rowDiff !== 0) return rowDiff;
        return a.column - b.column;
      })
      .map((seat) => ({
        row: seat.row,
        column: seat.column,
        seatNumber: seat.seatNumber,
        seatLabel: seat.seatLabel,
        seatType: seat.seatType || "REGULAR",
        status: seat.status || "ACTIVE",
      }));
  }

  return buildFallbackSeatTemplate();
};

async function ensureRole(name: string, description: string) {
  const existing = await prisma.role.findFirst({ where: { name } });
  if (existing) return existing;

  return prisma.role.create({
    data: {
      name,
      description,
      status: "ACTIVE",
    },
  });
}

async function ensureBranch() {
  const existing = await prisma.branch.findFirst({
    where: { code: "MAIN" },
  });

  if (existing) return existing;

  return prisma.branch.create({
    data: {
      name: "Main Branch",
      code: "MAIN",
      address: "Jakarta",
      city: "Jakarta",
      province: "DKI Jakarta",
      phone: "+628000000000",
      email: "admin@kasir-ticket.test",
      timezone: "Asia/Jakarta",
      status: "ACTIVE",
    },
  });
}

async function ensureUser(branchId: string, roleId: string, username: string, name: string, email: string, phone: string) {
  const passwordHash = await bcrypt.hash("test1234", 10);

  return prisma.user.upsert({
    where: { username },
    update: {
      branchId,
      roleId,
      name,
      email,
      phone,
      isActive: true,
      status: "ACTIVE",
      passwordHash,
    },
    create: {
      branchId,
      roleId,
      username,
      name,
      email,
      phone,
      passwordHash,
      avatar: null,
      isActive: true,
      status: "ACTIVE",
    },
  });
}

async function ensureGenre(name: string, description: string) {
  const existing = await prisma.genre.findFirst({ where: { name } });
  if (existing) return existing;

  return prisma.genre.create({
    data: {
      name,
      description,
      isActive: true,
    },
  });
}

async function ensureProductionHouse(name: string) {
  const existing = await prisma.productionHouse.findFirst({ where: { name } });
  if (existing) return existing;

  return prisma.productionHouse.create({
    data: {
      name,
      contactPerson: "Admin",
      phone: "+628000000000",
      email: "admin@kasir-ticket.test",
      address: "Jakarta",
      isActive: true,
    },
  });
}

async function ensureDistributor(name: string) {
  const existing = await prisma.distributor.findFirst({ where: { name } });
  if (existing) return existing;

  return prisma.distributor.create({
    data: {
      name,
      contactPerson: "Admin",
      phone: "+628000000000",
      email: "admin@kasir-ticket.test",
      address: "Jakarta",
      isActive: true,
    },
  });
}

async function ensureDefaultStudios(branchId: string) {
  const templateStudio = await prisma.studio.findFirst({
    where: { OR: [{ code: "S1" }, { name: "Studio 1" }] },
    include: { seats: { orderBy: [{ row: "asc" }, { column: "asc" }] } },
  });

  const templateSeats = buildSeatTemplate(templateStudio?.seats ?? undefined);
  const defaultStudios = [
    { name: "Studio 1", code: "S1", type: "REGULAR", status: "ACTIVE" },
    { name: "Studio 2", code: "S2", type: "REGULAR", status: "ACTIVE" },
    { name: "Premiere 1", code: "P1", type: "PREMIERE", status: "ACTIVE" },
    { name: "VIP 1", code: "V1", type: "VIP", status: "ACTIVE" },
  ];

  const created: Array<{ code: string; id: string; capacity: number }> = [];

  for (const studioDef of defaultStudios) {
    const seatType = studioDef.type === "VIP" ? "VIP" : "REGULAR";
    const studio = await prisma.studio.upsert({
      where: { code: studioDef.code },
      update: {
        name: studioDef.name,
        branchId,
        type: studioDef.type,
        status: studioDef.status,
        capacity: templateSeats.filter((seat) => seat.status === "ACTIVE").length,
        layoutRows: [...new Set(templateSeats.map((seat) => seat.row))].length,
        layoutColumns: Math.max(...templateSeats.map((seat) => seat.column)),
      },
      create: {
        name: studioDef.name,
        code: studioDef.code,
        branchId,
        type: studioDef.type,
        status: studioDef.status,
        capacity: templateSeats.filter((seat) => seat.status === "ACTIVE").length,
        layoutRows: [...new Set(templateSeats.map((seat) => seat.row))].length,
        layoutColumns: Math.max(...templateSeats.map((seat) => seat.column)),
      },
    });

    await prisma.seat.deleteMany({ where: { studioId: studio.id } });

    const seatsToCreate = (studioDef.type === "VIP" ? templateSeats.filter((seat) => ["A", "B"].includes(seat.row)) : templateSeats).map((seat) => ({
      studioId: studio.id,
      row: seat.row,
      column: seat.column,
      seatNumber: seat.seatNumber,
      seatLabel: seat.seatLabel,
      seatType: seatType,
      status: seat.status,
    }));

    await prisma.seat.createMany({ data: seatsToCreate });

    const activeSeatCount = seatsToCreate.filter((seat) => seat.status === "ACTIVE").length;
    await prisma.studio.update({
      where: { id: studio.id },
      data: {
        capacity: activeSeatCount,
      },
    });

    created.push({ code: studioDef.code, id: studio.id, capacity: activeSeatCount });
  }

  return created;
}

async function main() {
  const adminRole = await ensureRole("Admin", "Administrator role");
  const cashierRole = await ensureRole("Cashier", "Cashier role");
  const gateRole = await ensureRole("Gate Validator", "Gate Validator & Ticket Kiosk Operator");
  const branch = await ensureBranch();

  await ensureUser(branch.id, adminRole.id, "admin", "Admin", "admin@kasir-ticket.test", "+628000000000");
  await ensureUser(branch.id, cashierRole.id, "cashier", "Cashier User", "cashier@kasir-ticket.test", "+628111111111");
  await ensureUser(branch.id, gateRole.id, "gate_kiosk", "Gate Kiosk Operator", "kiosk@kasir-ticket.test", "+628222222222");

  const genres = [
    ["Action", "High energy, stunts, and chases"],
    ["Comedy", "Humorous and light-hearted"],
    ["Drama", "Character-driven and emotional narratives"],
    ["Horror", "Designed to scare and thrill"],
    ["Sci-Fi", "Futuristic and speculative science elements"],
  ];

  for (const [name, description] of genres) {
    await ensureGenre(name, description);
  }

  const productionHouses = ["Warner Bros. Pictures", "Universal Pictures", "Marvel Studios"];
  for (const name of productionHouses) {
    await ensureProductionHouse(name);
  }

  const distributors = ["UIP Indonesia", "Cinepolis Distribution"];
  for (const name of distributors) {
    await ensureDistributor(name);
  }

  const createdStudios = await ensureDefaultStudios(branch.id);
  console.log("Default studios ensured:", createdStudios.map((studio) => ({ code: studio.code, capacity: studio.capacity })));
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
