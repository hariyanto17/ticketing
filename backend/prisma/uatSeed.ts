// @ts-ignore
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

const DEFAULT_ROWS = Array.from({ length: 11 }, (_, i) => String.fromCharCode(65 + i)); // A - K
const DEFAULT_LAYOUT_COLUMNS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16]; // 16 columns -> 176 seats

const buildSeatTemplate = (): SeatTemplate[] => {
  const layout: SeatTemplate[] = [];
  for (const row of DEFAULT_ROWS) {
    for (const column of DEFAULT_LAYOUT_COLUMNS) {
      const seatNumber = column;
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

export async function resetUat() {
  if (process.env.NODE_ENV === "production") {
    console.error("❌ Refusing destructive UAT reset in production environment!");
    process.exit(1);
  }

  console.log("⚠️  Resetting UAT Data & Movies in Kasir Ticket...");
  await prisma.ticketScan.deleteMany();
  await prisma.ticketReprint.deleteMany();
  await prisma.payment.deleteMany();
  await prisma.ticket.deleteMany();
  await prisma.order.deleteMany();
  await prisma.showtimeSeat.deleteMany();
  await prisma.showtime.deleteMany();
  await prisma.dailyClosing.deleteMany();
  await prisma.cashDrawer.deleteMany();
  await prisma.movieGenre.deleteMany();
  await prisma.movie.deleteMany();
  console.log("✓ Kasir Ticket transaction & movie data cleaned successfully.");
}

export async function seedUat(withMovies: boolean = false) {
  if (process.env.NODE_ENV === "production") {
    console.error("❌ Refusing UAT seed execution in production environment!");
    process.exit(1);
  }

  console.log("==================================================");
  console.log("  Seeding Kasir Ticket for Local UAT              ");
  console.log("==================================================");

  // Clean all previous transactions, showtimes, and movies to allow fresh demo
  await prisma.ticketScan.deleteMany();
  await prisma.ticketReprint.deleteMany();
  await prisma.payment.deleteMany();
  await prisma.ticket.deleteMany();
  await prisma.order.deleteMany();
  await prisma.showtimeSeat.deleteMany();
  await prisma.showtime.deleteMany();
  await prisma.dailyClosing.deleteMany();
  await prisma.cashDrawer.deleteMany();
  await prisma.movieGenre.deleteMany();
  await prisma.movie.deleteMany();
  console.log("✓ Existing movies, showtimes & transactions cleaned (0 movies).");

  // 1. Roles
  const rolesDef = [
    { name: "ADMINISTRATOR", description: "All-access Ticketing Admin" },
    { name: "CASHIER", description: "Ticketing Front-desk Cashier" },
    { name: "GATE_VALIDATOR", description: "Gate Validator & Ticket Kiosk Operator" },
    { name: "Gate Validator", description: "Gate Validator & Ticket Kiosk Operator" },
  ];
  const rolesMap: Record<string, any> = {};
  for (const r of rolesDef) {
    let role = await prisma.role.findFirst({ where: { name: r.name } });
    if (!role) {
      role = await prisma.role.create({
        data: { name: r.name, description: r.description, status: "ACTIVE" },
      });
    }
    rolesMap[r.name] = role;
  }
  console.log("✓ Roles verified");

  // 2. Branches
  const branchesDef = [
    { name: "Planet Cinema Head Office", code: "MAIN", address: "Jl. Veteran No. 1", city: "Bone", province: "Sulawesi Selatan", phone: "+62811000001", email: "info@planetcinema.co.id", timezone: "Asia/Makassar", status: "ACTIVE" },
    { name: "Planet Cinema Bone Branch", code: "BONE", address: "Jl. Besse Kajuara No. 8", city: "Bone", province: "Sulawesi Selatan", phone: "+62811000002", email: "bone@planetcinema.co.id", timezone: "Asia/Makassar", status: "ACTIVE" },
  ];
  const branchesMap: Record<string, any> = {};
  for (const b of branchesDef) {
    let branch = await prisma.branch.findFirst({ where: { code: b.code } });
    if (!branch) {
      branch = await prisma.branch.create({ data: b });
    }
    branchesMap[b.code] = branch;
  }
  const mainBranch = branchesMap["MAIN"];
  console.log("✓ Branches verified");

  // 3. UAT Users
  const passwordHash = await bcrypt.hash("Uat12345!", 10);
  const usersDef = [
    { username: "uat_admin", name: "UAT Platform Administrator", email: "uat.admin@planetcinema.local", roleId: rolesMap["ADMINISTRATOR"].id },
    { username: "uat_kasir", name: "UAT Kasir Counter", email: "uat.kasir@planetcinema.local", roleId: rolesMap["CASHIER"].id },
    { username: "uat_ticketadmin", name: "UAT Ticketing Administrator", email: "uat.ticketadmin@planetcinema.local", roleId: rolesMap["ADMINISTRATOR"].id },
    { username: "uat_ticketkasir", name: "UAT Ticketing Kasir", email: "uat.ticketkasir@planetcinema.local", roleId: rolesMap["CASHIER"].id },
    { username: "uat_executive", name: "UAT Executive GM", email: "uat.executive@planetcinema.local", roleId: rolesMap["ADMINISTRATOR"].id },
    { username: "uat_gate_kiosk", name: "UAT Gate Kiosk Operator", email: "uat.gate_kiosk@planetcinema.local", roleId: rolesMap["GATE_VALIDATOR"].id },
  ];

  const usersMap: Record<string, any> = {};
  for (const u of usersDef) {
    const user = await prisma.user.upsert({
      where: { email: u.email },
      update: { name: u.name, username: u.username, roleId: u.roleId, passwordHash, status: "ACTIVE", isActive: true },
      create: {
        username: u.username,
        name: u.name,
        email: u.email,
        passwordHash,
        roleId: u.roleId,
        branchId: mainBranch.id,
        status: "ACTIVE",
        isActive: true,
      },
    });
    usersMap[u.username] = user;
  }
  console.log("✓ UAT Users verified");

  // 4. Production House & Distributor & Genres
  const phDef = [
    { name: "20th Century Studios", contactPerson: "Admin PH", phone: "+62812000000", email: "ph@studios.com", address: "Jakarta" },
    { name: "Warner Bros. Pictures", contactPerson: "Admin WB", phone: "+62812000001", email: "wb@studios.com", address: "Jakarta" },
    { name: "Universal Pictures", contactPerson: "Admin Universal", phone: "+62812000002", email: "universal@studios.com", address: "Jakarta" },
    { name: "MD Pictures", contactPerson: "Admin MD", phone: "+62812000003", email: "info@mdpictures.com", address: "Jakarta" },
  ];
  for (const phItem of phDef) {
    let ph = await prisma.productionHouse.findFirst({ where: { name: phItem.name } });
    if (!ph) {
      await prisma.productionHouse.create({
        data: { ...phItem, isActive: true },
      });
    }
  }

  const distDef = [
    { name: "PT Nusantara Distributor", contactPerson: "Admin Dist", phone: "+62813000000", email: "dist@nusantara.com", address: "Jakarta" },
    { name: "Cinepolis Distribution", contactPerson: "Admin Cinepolis", phone: "+62813000001", email: "dist@cinepolis.com", address: "Jakarta" },
  ];
  for (const distItem of distDef) {
    let dist = await prisma.distributor.findFirst({ where: { name: distItem.name } });
    if (!dist) {
      await prisma.distributor.create({
        data: { ...distItem, isActive: true },
      });
    }
  }

  const genreNames = ["Action", "Sci-Fi", "Drama", "Comedy", "Adventure", "Horror", "Animation", "Romance", "Thriller"];
  for (const gName of genreNames) {
    let genre = await prisma.genre.findFirst({ where: { name: gName } });
    if (!genre) {
      await prisma.genre.create({ data: { name: gName, description: `${gName} genre`, isActive: true } });
    }
  }
  console.log("✓ Production Houses, Distributors & Genres master data verified");

  // 5. Studios & Seats
  const studioConfigs = [
    { name: "Studio 1", code: "S1", capacity: 176, type: "REGULAR" },
    { name: "Studio 2", code: "S2", capacity: 176, type: "REGULAR" },
    { name: "Premiere 1", code: "P1", capacity: 40, type: "PREMIERE" },
  ];

  const seatTemplates = buildSeatTemplate();

  for (const sDef of studioConfigs) {
    const studio = await prisma.studio.upsert({
      where: { code: sDef.code },
      update: { name: sDef.name, capacity: sDef.capacity, type: sDef.type, status: "ACTIVE" },
      create: {
        name: sDef.name,
        code: sDef.code,
        capacity: sDef.capacity,
        type: sDef.type,
        status: "ACTIVE",
        branchId: mainBranch.id,
        layoutRows: 11,
        layoutColumns: 16,
      },
    });

    // Check existing seats
    const existingSeatsCount = await prisma.seat.count({ where: { studioId: studio.id } });
    if (existingSeatsCount === 0) {
      const seatsToCreate = sDef.code === "P1" 
        ? seatTemplates.slice(0, 40).map(st => ({ ...st, studioId: studio.id, seatType: "VIP" }))
        : seatTemplates.map(st => ({ ...st, studioId: studio.id }));
      await prisma.seat.createMany({ data: seatsToCreate });
    }
  }
  console.log("✓ Studios and Seats verified (Studio 1: 176 seats, Studio 2: 176 seats, Premiere 1: 40 seats)");

  if (withMovies) {
    console.log("ℹ️  Seeding dummy movies as requested with --with-movies...");
    // Only if explicitly requested
  } else {
    console.log("✓ Movies catalog is clean (0 movies). Ready for live demo from scratch!");
  }

  console.log("==================================================");
  console.log("  Kasir Ticket UAT Seeding Completed!             ");
  console.log("==================================================");
}

if (require.main === module) {
  const isReset = process.argv.includes("--reset");
  const withMovies = process.argv.includes("--with-movies");
  const action = isReset ? resetUat() : seedUat(withMovies);

  action
    .then(async () => {
      await prisma.$disconnect();
    })
    .catch(async (e) => {
      console.error(e);
      await prisma.$disconnect();
      process.exit(1);
    });
}
