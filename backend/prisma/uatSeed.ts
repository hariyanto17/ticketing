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

  console.log("⚠️  Resetting UAT Data in Kasir Ticket...");
  await prisma.ticketScan.deleteMany();
  await prisma.ticketReprint.deleteMany();
  await prisma.payment.deleteMany();
  await prisma.ticket.deleteMany();
  await prisma.order.deleteMany();
  await prisma.showtimeSeat.deleteMany();
  await prisma.showtime.deleteMany();
  await prisma.dailyClosing.deleteMany();
  await prisma.cashDrawer.deleteMany();
  console.log("✓ Kasir Ticket transaction data cleaned successfully.");
}

export async function seedUat() {
  if (process.env.NODE_ENV === "production") {
    console.error("❌ Refusing UAT seed execution in production environment!");
    process.exit(1);
  }

  console.log("==================================================");
  console.log("  Seeding Kasir Ticket for Local UAT              ");
  console.log("==================================================");

  // 1. Roles
  const rolesDef = [
    { name: "ADMINISTRATOR", description: "All-access Ticketing Admin" },
    { name: "CASHIER", description: "Ticketing Front-desk Cashier" },
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
  const passwordHash = await bcrypt.hash("test1234", 10);
  const usersDef = [
    { username: "uat_admin", name: "UAT Platform Administrator", email: "uat.admin@planetcinema.local", roleId: rolesMap["ADMINISTRATOR"].id },
    { username: "uat_kasir", name: "UAT Kasir Counter", email: "uat.kasir@planetcinema.local", roleId: rolesMap["CASHIER"].id },
    { username: "uat_ticketadmin", name: "UAT Ticketing Administrator", email: "uat.ticketadmin@planetcinema.local", roleId: rolesMap["ADMINISTRATOR"].id },
    { username: "uat_ticketkasir", name: "UAT Ticketing Kasir", email: "uat.ticketkasir@planetcinema.local", roleId: rolesMap["CASHIER"].id },
    { username: "uat_executive", name: "UAT Executive GM", email: "uat.executive@planetcinema.local", roleId: rolesMap["ADMINISTRATOR"].id },
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
  const cashierUser = usersMap["uat_kasir"];
  console.log("✓ UAT Users verified");

  // 4. Production House & Distributor & Genres
  let ph = await prisma.productionHouse.findFirst({ where: { name: "20th Century Studios" } });
  if (!ph) {
    ph = await prisma.productionHouse.create({
      data: { name: "20th Century Studios", contactPerson: "Admin PH", phone: "+62812000000", email: "ph@studios.com", address: "Jakarta", isActive: true },
    });
  }

  let dist = await prisma.distributor.findFirst({ where: { name: "PT Nusantara Distributor" } });
  if (!dist) {
    dist = await prisma.distributor.create({
      data: { name: "PT Nusantara Distributor", contactPerson: "Admin Dist", phone: "+62813000000", email: "dist@nusantara.com", address: "Jakarta", isActive: true },
    });
  }

  const genreNames = ["Action", "Sci-Fi", "Drama", "Comedy", "Adventure"];
  const genresMap: Record<string, any> = {};
  for (const gName of genreNames) {
    let genre = await prisma.genre.findFirst({ where: { name: gName } });
    if (!genre) {
      genre = await prisma.genre.create({ data: { name: gName, description: `${gName} genre`, isActive: true } });
    }
    genresMap[gName] = genre;
  }

  // 5. Studios & Seats
  const studioConfigs = [
    { name: "Studio 1", code: "S1", capacity: 176, type: "REGULAR" },
    { name: "Studio 2", code: "S2", capacity: 176, type: "REGULAR" },
    { name: "Premiere 1", code: "P1", capacity: 40, type: "PREMIERE" },
  ];

  const studiosMap: Record<string, any> = {};
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
    studiosMap[sDef.code] = studio;

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

  // 6. Movies
  const moviesDef = [
    {
      title: "Avatar: The Way of Water",
      slug: "avatar-the-way-of-water",
      synopsis: "Jake Sully lives with his newfound family formed on the extrasolar moon Pandora.",
      durationMinutes: 192,
      censorshipRating: "13+",
      status: "NOW_SHOWING",
      poster: "https://images.unsplash.com/photo-1534447677768-be436bb09401?w=500&auto=format&fit=crop&q=60",
      genres: ["Action", "Sci-Fi", "Adventure"],
    },
    {
      title: "Oppenheimer",
      slug: "oppenheimer",
      synopsis: "The story of American scientist J. Robert Oppenheimer and his role in the development of the atomic bomb.",
      durationMinutes: 180,
      censorshipRating: "17+",
      status: "NOW_SHOWING",
      poster: "https://images.unsplash.com/photo-1440404653325-ab127d49abc1?w=500&auto=format&fit=crop&q=60",
      genres: ["Drama"],
    },
    {
      title: "Dune: Part Two",
      slug: "dune-part-two",
      synopsis: "Paul Atreides unites with Chani and the Fremen while seeking revenge against the conspirators.",
      durationMinutes: 166,
      censorshipRating: "13+",
      status: "NOW_SHOWING",
      poster: "https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=500&auto=format&fit=crop&q=60",
      genres: ["Action", "Sci-Fi"],
    },
    {
      title: "Agak Laen",
      slug: "agak-laen",
      synopsis: "Empat sekawan penjaga rumah hantu di pasar malam yang berjuang agar wahana mereka tidak bangkrut.",
      durationMinutes: 119,
      censorshipRating: "13+",
      status: "NOW_SHOWING",
      poster: "https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?w=500&auto=format&fit=crop&q=60",
      genres: ["Comedy"],
    },
  ];

  const moviesMap: Record<string, any> = {};
  for (const mDef of moviesDef) {
    const movie = await prisma.movie.upsert({
      where: { slug: mDef.slug },
      update: {
        title: mDef.title,
        synopsis: mDef.synopsis,
        durationMinutes: mDef.durationMinutes,
        censorshipRating: mDef.censorshipRating,
        status: mDef.status,
        poster: mDef.poster,
      },
      create: {
        title: mDef.title,
        slug: mDef.slug,
        synopsis: mDef.synopsis,
        durationMinutes: mDef.durationMinutes,
        censorshipRating: mDef.censorshipRating,
        status: mDef.status,
        poster: mDef.poster,
        productionHouseId: ph.id,
        distributorId: dist.id,
      },
    });
    moviesMap[mDef.slug] = movie;

    // Link genres
    for (const gName of mDef.genres) {
      const g = genresMap[gName];
      if (g) {
        await prisma.movieGenre.upsert({
          where: { movieId_genreId: { movieId: movie.id, genreId: g.id } },
          update: {},
          create: { movieId: movie.id, genreId: g.id },
        });
      }
    }
  }
  console.log("✓ Movies Seeded (Avatar, Oppenheimer, Dune: Part Two, Agak Laen)");

  // 7. Showtimes & Transaction Generator
  // Generate historical & current showtimes for [today, yesterday, -2d, -3d, -5d, -7d]
  const targetDays = [0, 1, 2, 3, 5, 7]; // Days ago
  const baseDate = new Date();
  baseDate.setHours(0, 0, 0, 0);

  const studio1 = studiosMap["S1"];
  const studio2 = studiosMap["S2"];
  const studioSeatsS1 = await prisma.seat.findMany({ where: { studioId: studio1.id }, orderBy: { seatNumber: "asc" } });
  const studioSeatsS2 = await prisma.seat.findMany({ where: { studioId: studio2.id }, orderBy: { seatNumber: "asc" } });

  let totalOrdersCreated = 0;
  let totalTicketsCreated = 0;

  for (const daysAgo of targetDays) {
    const showDate = new Date(baseDate.getTime() - daysAgo * 24 * 3600 * 1000);
    const dateStr = showDate.toISOString().split("T")[0];

    const showtimeSlots = [
      { movieSlug: "avatar-the-way-of-water", studio: studio1, seats: studioSeatsS1, hour: 13, min: 0, ticketPrice: 50000, soldSeatsCount: 65, usedCount: 55, refundCount: 2 },
      { movieSlug: "oppenheimer", studio: studio2, seats: studioSeatsS2, hour: 15, min: 30, ticketPrice: 45000, soldSeatsCount: 50, usedCount: 45, refundCount: 0 },
      { movieSlug: "dune-part-two", studio: studio1, seats: studioSeatsS1, hour: 19, min: 0, ticketPrice: 55000, soldSeatsCount: 95, usedCount: 88, refundCount: 3 },
      { movieSlug: "agak-laen", studio: studio2, seats: studioSeatsS2, hour: 20, min: 0, ticketPrice: 40000, soldSeatsCount: 80, usedCount: 75, refundCount: 1 },
    ];

    for (let slotIdx = 0; slotIdx < showtimeSlots.length; slotIdx++) {
      const slot = showtimeSlots[slotIdx];
      const movie = moviesMap[slot.movieSlug];
      const startDateTime = new Date(showDate.getTime());
      startDateTime.setHours(slot.hour, slot.min, 0, 0);

      const endDateTime = new Date(startDateTime.getTime() + (movie.durationMinutes || 120) * 60 * 1000);

      // Check if showtime already exists
      let showtime = await prisma.showtime.findFirst({
        where: {
          movieId: movie.id,
          studioId: slot.studio.id,
          startTime: startDateTime,
        },
      });

      if (!showtime) {
        showtime = await prisma.showtime.create({
          data: {
            movieId: movie.id,
            studioId: slot.studio.id,
            businessDate: showDate,
            startTime: startDateTime,
            endTime: endDateTime,
            ticketPrice: slot.ticketPrice,
            status: "PUBLISHED",
          },
        });

        // Initialize ShowtimeSeats
        const showtimeSeatsData = slot.seats.map((seat: any) => ({
          showtimeId: showtime!.id,
          seatId: seat.id,
          status: "AVAILABLE",
        }));
        await prisma.showtimeSeat.createMany({ data: showtimeSeatsData });
      }

      // Fetch created showtime seats
      const createdShowtimeSeats = await prisma.showtimeSeat.findMany({
        where: { showtimeId: showtime.id },
        orderBy: { id: "asc" },
      });

      // Check if orders already seeded for this showtime
      const existingOrdersCount = await prisma.order.count({ where: { scheduleId: showtime.id } });
      if (existingOrdersCount > 0) continue;

      // Create realistic orders (groups of 1 to 4 tickets per order)
      let seatPointer = 0;
      let currentSoldCount = 0;

      while (currentSoldCount < slot.soldSeatsCount && seatPointer < createdShowtimeSeats.length) {
        const orderTicketsQty = Math.min(Math.floor(Math.random() * 3) + 1, slot.soldSeatsCount - currentSoldCount);
        const orderNumber = `TKT-${dateStr.replace(/-/g, "")}-${showtime.id.substring(0, 4)}-${seatPointer}`;
        const isQris = Math.random() > 0.4;
        const paymentMethod = isQris ? "QRIS" : "CASH";
        const orderTotal = orderTicketsQty * slot.ticketPrice;

        const isRefunded = currentSoldCount < slot.refundCount;

        const order = await prisma.order.create({
          data: {
            orderNumber,
            bookingNumber: `BKG-${orderNumber.substring(4)}`,
            cashierId: cashierUser.id,
            scheduleId: showtime.id,
            branchId: mainBranch.id,
            totalAmount: orderTotal,
            paymentMethod,
            paymentStatus: isRefunded ? "REFUNDED" : "PAID",
            orderStatus: isRefunded ? "REFUNDED" : "PAID",
            customerName: `Pelanggan UAT ${seatPointer + 1}`,
            customerPhone: "081234567890",
            customerEmail: `customer${seatPointer}@uat.local`,
            createdAt: startDateTime,
          },
        });
        totalOrdersCreated++;

        // Payment record
        await prisma.payment.create({
          data: {
            orderId: order.id,
            amount: orderTotal,
            amountReceived: isQris ? orderTotal : orderTotal + 10000,
            change: isQris ? 0 : 10000,
            paidAt: startDateTime,
            status: isRefunded ? "REFUNDED" : "PAID",
          },
        });

        // Ticket records
        for (let t = 0; t < orderTicketsQty; t++) {
          const stSeat = createdShowtimeSeats[seatPointer];
          seatPointer++;
          currentSoldCount++;

          const ticketNumber = `TCK-${orderNumber.substring(4)}-${t + 1}`;
          const isUsed = !isRefunded && currentSoldCount <= slot.usedCount;

          await prisma.ticket.create({
            data: {
              ticketNumber,
              orderId: order.id,
              showtimeSeatId: stSeat.id,
              qrCode: `QR-${ticketNumber}`,
              status: isRefunded ? "CANCELLED" : isUsed ? "USED" : "ACTIVE",
              createdAt: startDateTime,
            },
          });
          totalTicketsCreated++;

          // Update seat status
          await prisma.showtimeSeat.update({
            where: { id: stSeat.id },
            data: { status: isRefunded ? "AVAILABLE" : "BOOKED" },
          });
        }
      }
    }

    // Daily closing for past dates
    if (daysAgo > 0) {
      const existingClosing = await prisma.dailyClosing.findUnique({ where: { businessDate: showDate } });
      if (!existingClosing) {
        await prisma.dailyClosing.create({
          data: {
            businessDate: showDate,
            totalTicketsSold: 280,
            totalRevenue: 13500000,
            cashRevenue: 5500000,
            qrisRevenue: 8000000,
            totalRefunds: 250000,
            totalTransactions: 110,
            closedById: cashierUser.id,
            closedAt: new Date(showDate.getTime() + 23 * 3600 * 1000),
          },
        });
      }
    }
  }

  console.log(`✓ Seeded ${totalOrdersCreated} Orders & ${totalTicketsCreated} Tickets across 6 business dates`);

  console.log("==================================================");
  console.log("  Kasir Ticket UAT Seeding Completed!             ");
  console.log("==================================================");
}

if (require.main === module) {
  const isReset = process.argv.includes("--reset");
  const action = isReset ? resetUat() : seedUat();

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
