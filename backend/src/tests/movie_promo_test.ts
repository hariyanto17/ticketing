import { prisma } from "../utils/prisma";
import * as promotionService from "../modules/promotions/service";
import * as orderService from "../modules/orders/service";

async function runMoviePromoTest() {
  console.log("=== Starting Movie-Specific Promotion Test ===");

  const now = new Date();
  const nextMonth = new Date();
  nextMonth.setMonth(nextMonth.getMonth() + 1);

  // 1. Setup Branch, User/Cashier, Drawer, Production House
  const branch = await prisma.branch.findFirst() || await prisma.branch.create({
    data: {
      name: "Branch Movie Promo Test",
      code: `BR_MOV_${Date.now()}`,
      address: "Jl Bioskop",
      city: "Jakarta",
      province: "DKI",
      phone: "08123456789",
      email: "branch_mov@test.com",
      timezone: "Asia/Jakarta",
      status: "ACTIVE",
    },
  });

  const role = await prisma.role.findFirst() || await prisma.role.create({
    data: { name: "Cashier", status: "ACTIVE" },
  });

  const cashier = await prisma.user.create({
    data: {
      branchId: branch.id,
      roleId: role.id,
      username: `cashier_mov_${Date.now()}`,
      name: "Cashier Movie Test",
      email: `cashier_mov_${Date.now()}@test.com`,
      passwordHash: "dummy",
      status: "ACTIVE",
    },
  });

  await prisma.cashDrawer.create({
    data: {
      openedById: cashier.id,
      openingBalance: 100000,
      status: "OPEN",
    },
  });

  const ph = await prisma.productionHouse.findFirst() || await prisma.productionHouse.create({
    data: { name: "PH Movie Test" },
  });

  // 2. Create 2 Distinct Movies (Movie A and Movie B)
  console.log("\n[Step 1] Creating 2 Movies (Film A & Film B)...");
  const movieA = await prisma.movie.create({
    data: {
      title: "Film Petualangan Angkasa (Film A)",
      slug: `film-a-${Date.now()}`,
      productionHouseId: ph.id,
      status: "NOW_SHOWING",
    },
  });

  const movieB = await prisma.movie.create({
    data: {
      title: "Film Drama Romantis (Film B)",
      slug: `film-b-${Date.now()}`,
      productionHouseId: ph.id,
      status: "NOW_SHOWING",
    },
  });

  console.log(`✓ Movie A created: ${movieA.title} (${movieA.id})`);
  console.log(`✓ Movie B created: ${movieB.title} (${movieB.id})`);

  // 3. Create Studio & Showtimes for both movies
  const studio = await prisma.studio.create({
    data: {
      branchId: branch.id,
      name: "Studio Promo Test",
      code: `ST_MOV_${Date.now()}`,
      capacity: 4,
      seats: {
        create: [
          { row: "A", column: 1, seatNumber: 1, seatLabel: "A1" },
          { row: "A", column: 2, seatNumber: 2, seatLabel: "A2" },
          { row: "A", column: 3, seatNumber: 3, seatLabel: "A3" },
          { row: "A", column: 4, seatNumber: 4, seatLabel: "A4" },
        ],
      },
    },
    include: { seats: true },
  });

  const showtimeA = await prisma.showtime.create({
    data: {
      movieId: movieA.id,
      studioId: studio.id,
      ticketPrice: 50000,
      status: "PUBLISHED",
      startTime: now,
      businessDate: now,
      showtimeSeats: {
        create: studio.seats.slice(0, 2).map((st) => ({
          seatId: st.id,
          status: "AVAILABLE",
        })),
      },
    },
    include: { showtimeSeats: true },
  });

  const showtimeB = await prisma.showtime.create({
    data: {
      movieId: movieB.id,
      studioId: studio.id,
      ticketPrice: 50000,
      status: "PUBLISHED",
      startTime: now,
      businessDate: now,
      showtimeSeats: {
        create: studio.seats.slice(2, 4).map((st) => ({
          seatId: st.id,
          status: "AVAILABLE",
        })),
      },
    },
    include: { showtimeSeats: true },
  });

  // 4. Create Promo BOGO that only applies to Movie A
  console.log("\n[Step 2] Creating Promo Buy 1 Get 1 ONLY for Movie A...");
  const promoForA = await promotionService.createPromotion({
    name: "Promo BOGO Khusus Film A",
    code: `BOGO_A_${Date.now()}`,
    promoType: "BUY_X_GET_Y",
    buyQty: 1,
    getQty: 1,
    quota: 100,
    startDate: now.toISOString(),
    endDate: nextMonth.toISOString(),
    isActive: true,
    movieIds: [movieA.id],
  });
  console.log(`✓ Promo created with ID: ${promoForA.id}, assigned movies count: ${promoForA.movies.length}`);

  // 5. Test getActivePromotions filtering by movieId
  console.log("\n[Step 3] Testing getActivePromotions filtering...");
  const activeForA = await promotionService.getActivePromotions(branch.id, movieA.id);
  const activeForB = await promotionService.getActivePromotions(branch.id, movieB.id);

  const foundInA = activeForA.some((p) => p.id === promoForA.id);
  const foundInB = activeForB.some((p) => p.id === promoForA.id);

  if (foundInA && !foundInB) {
    console.log("✓ PASSED: Promo appears for Movie A and is excluded for Movie B in active list");
  } else {
    throw new Error(`FAILED: Active filtering incorrect. foundInA: ${foundInA}, foundInB: ${foundInB}`);
  }

  // 6. Test Calculation Preview
  console.log("\n[Step 4] Testing calculation preview validation...");
  // Calculate for Movie A -> should succeed
  const previewA = promotionService.calculatePromotionDiscount(promoForA, 2, 50000, movieA.id);
  console.log(`  Preview for Movie A: Subtotal=${previewA.subtotal}, Discount=${previewA.discountAmount}, Final=${previewA.finalAmount}`);
  if (previewA.discountAmount === 50000) {
    console.log("✓ PASSED: Calculation for Movie A succeeded with Rp 50,000 discount");
  }

  // Calculate for Movie B -> should fail with error
  try {
    promotionService.calculatePromotionDiscount(promoForA, 2, 50000, movieB.id);
    throw new Error("FAILED: Calculation preview for Movie B should have failed");
  } catch (err: any) {
    if (err.message.includes("tidak berlaku untuk film ini")) {
      console.log("✓ PASSED: Calculation for Movie B was successfully blocked:", err.message);
    } else {
      throw err;
    }
  }

  // 7. Test Actual Checkout with Movie B (Should Fail)
  console.log("\n[Step 5] Testing actual checkout on Movie B schedule with Promo A (Should Fail)...");
  try {
    await orderService.createCheckoutOrder(cashier.id, branch.id, {
      scheduleId: showtimeB.id,
      seatIds: showtimeB.showtimeSeats.map((s) => s.seatId),
      paymentMethod: "CASH",
      amountReceived: 50000,
      promotionId: promoForA.id,
    });
    throw new Error("FAILED: Checkout on Movie B should have been rejected");
  } catch (err: any) {
    if (err.message.includes("tidak berlaku untuk film ini")) {
      console.log("✓ PASSED: Checkout on Movie B was rejected with message:", err.message);
    } else {
      throw err;
    }
  }

  // 8. Test Actual Checkout with Movie A (Should Succeed)
  console.log("\n[Step 6] Testing actual checkout on Movie A schedule with Promo A (Should Succeed)...");
  const orderA = await orderService.createCheckoutOrder(cashier.id, branch.id, {
    scheduleId: showtimeA.id,
    seatIds: showtimeA.showtimeSeats.map((s) => s.seatId),
    paymentMethod: "CASH",
    amountReceived: 50000,
    promotionId: promoForA.id,
  });

  console.log("✓ Order for Movie A created successfully:", orderA.order.orderNumber);
  console.log(`  Subtotal: ${orderA.order.subtotal}, Discount: ${orderA.order.discountAmount}, Total: ${orderA.order.totalAmount}`);
  const freeTickets = orderA.tickets.filter((t) => t.isFree);
  console.log(`  Total tickets: ${orderA.tickets.length}, Free tickets (BOGO): ${freeTickets.length}`);
  if (orderA.order.discountAmount === 50000 && freeTickets.length === 1) {
    console.log("✓ PASSED: Checkout on Movie A successfully applied BOGO promo and free ticket");
  } else {
    throw new Error("FAILED: Order A amounts or tickets mismatch");
  }

  // Cleanup
  console.log("\n[Cleanup] Cleaning up test records...");
  await prisma.ticket.deleteMany({ where: { orderId: orderA.order.id } });
  await prisma.payment.deleteMany({ where: { orderId: orderA.order.id } });
  await prisma.order.delete({ where: { id: orderA.order.id } });
  await prisma.promotionMovie.deleteMany({ where: { promotionId: promoForA.id } });
  await prisma.promotion.delete({ where: { id: promoForA.id } });
  console.log("✓ Cleanup finished.");

  console.log("\n=== ALL MOVIE-SPECIFIC PROMO TESTS PASSED SUCCESSFULLY ===");
}

runMoviePromoTest()
  .catch((e) => {
    console.error("Test failed with error:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
