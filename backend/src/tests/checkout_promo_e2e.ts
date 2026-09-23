import { prisma } from "../utils/prisma";
import * as orderService from "../modules/orders/service";
import * as promotionService from "../modules/promotions/service";

async function runE2ETest() {
  console.log("=== Starting Checkout with Promo End-to-End Test ===");

  const branch = await prisma.branch.findFirst() || await prisma.branch.create({
    data: {
      name: "Branch Test",
      code: `BR_${Date.now()}`,
      address: "Jl Test",
      city: "Jakarta",
      province: "DKI",
      phone: "08123456789",
      email: "branch@test.com",
      timezone: "Asia/Jakarta",
      status: "ACTIVE",
    },
  });

  const role = await prisma.role.findFirst() || await prisma.role.create({
    data: {
      name: "Cashier",
      status: "ACTIVE",
    },
  });

  const cashier = await prisma.user.create({
    data: {
      branchId: branch.id,
      roleId: role.id,
      username: `cashier_test_${Date.now()}`,
      name: "Cashier Test",
      email: `cashier_${Date.now()}@test.com`,
      passwordHash: "dummy",
      status: "ACTIVE",
    },
  });

  const drawer = await prisma.cashDrawer.create({
    data: {
      openedById: cashier.id,
      openingBalance: 100000,
      status: "OPEN",
    },
  });

  const ph = await prisma.productionHouse.findFirst() || await prisma.productionHouse.create({
    data: { name: "PH Test" },
  });

  const movie = await prisma.movie.create({
    data: {
      title: "Movie Promo Test",
      slug: `movie-promo-${Date.now()}`,
      productionHouseId: ph.id,
      status: "NOW_SHOWING",
    },
  });

  const studio = await prisma.studio.create({
    data: {
      branchId: branch.id,
      name: "Studio Test",
      code: `ST_${Date.now()}`,
      capacity: 2,
      seats: {
        create: [
          { row: "A", column: 1, seatNumber: 1, seatLabel: "A1" },
          { row: "A", column: 2, seatNumber: 2, seatLabel: "A2" },
        ],
      },
    },
    include: { seats: true },
  });

  const showtime = await prisma.showtime.create({
    data: {
      movieId: movie.id,
      studioId: studio.id,
      ticketPrice: 50000,
      status: "PUBLISHED",
      startTime: new Date(),
      businessDate: new Date(),
      showtimeSeats: {
        create: studio.seats.map((st) => ({
          seatId: st.id,
          status: "AVAILABLE",
        })),
      },
    },
    include: {
      showtimeSeats: {
        include: { seat: true },
      },
    },
  });

  const seatIds = showtime.showtimeSeats.map((s) => s.seatId);
  const now = new Date();
  const nextWeek = new Date();
  nextWeek.setDate(nextWeek.getDate() + 7);

  // 1. Create BOGO Promo with quota 100
  console.log("\n[Step 1] Creating BOGO Promo with quota 100...");
  const promo = await promotionService.createPromotion({
    name: "E2E BOGO Promo 100 Quota",
    code: `E2EBOGO_${Date.now()}`,
    promoType: "BUY_X_GET_Y",
    buyQty: 1,
    getQty: 1,
    quota: 100,
    startDate: now.toISOString(),
    endDate: nextWeek.toISOString(),
    isActive: true,
  });
  console.log(`Created promo ${promo.name}, initial usedQuota: ${promo.usedQuota}/${promo.quota}`);

  // 2. Checkout 2 tickets using the BOGO promo
  console.log("\n[Step 2] Performing checkout for 2 seats with BOGO promo...");
  const checkoutResult = await orderService.createCheckoutOrder(cashier.id, cashier.branchId, {
    scheduleId: showtime.id,
    seatIds,
    paymentMethod: "CASH",
    amountReceived: showtime.ticketPrice, // Pays for 1 ticket only
    promotionId: promo.id,
  });

  console.log("✓ Order created:", checkoutResult.order.orderNumber);
  console.log("  Subtotal:", checkoutResult.order.subtotal);
  console.log("  Discount Amount:", checkoutResult.order.discountAmount);
  console.log("  Total Amount:", checkoutResult.order.totalAmount);
  console.log("  Tickets generated:", checkoutResult.tickets.length);
  for (const t of checkoutResult.tickets) {
    console.log(`    Ticket ${t.ticketNumber}: price=${t.price}, discount=${t.discountAmount}, isFree=${t.isFree}`);
  }

  // 3. Verify quota incremented in DB
  console.log("\n[Step 3] Verifying Promotion usedQuota increment in DB...");
  const updatedPromo = await prisma.promotion.findUnique({
    where: { id: promo.id },
  });
  console.log(`Updated usedQuota: ${updatedPromo?.usedQuota}/${updatedPromo?.quota}`);
  if (updatedPromo?.usedQuota === 1) {
    console.log("✓ PASSED: Promotion usedQuota correctly incremented by 1 (1 free ticket)");
  } else {
    throw new Error(`FAILED: Expected usedQuota 1, got ${updatedPromo?.usedQuota}`);
  }

  // 4. Void order and verify quota restoration
  console.log("\n[Step 4] Voiding order and verifying quota restoration...");
  await orderService.voidOrder(checkoutResult.order.id);
  const restoredPromo = await prisma.promotion.findUnique({
    where: { id: promo.id },
  });
  console.log(`Restored usedQuota after void: ${restoredPromo?.usedQuota}/${restoredPromo?.quota}`);
  if (restoredPromo?.usedQuota === 0) {
    console.log("✓ PASSED: Promotion usedQuota restored back to 0 on order cancellation");
  } else {
    throw new Error(`FAILED: Expected usedQuota 0 after void, got ${restoredPromo?.usedQuota}`);
  }

  // Cleanup
  console.log("\n[Cleanup] Cleaning up test records...");
  await prisma.ticket.deleteMany({ where: { orderId: checkoutResult.order.id } });
  await prisma.payment.deleteMany({ where: { orderId: checkoutResult.order.id } });
  await prisma.order.delete({ where: { id: checkoutResult.order.id } });
  await prisma.promotion.delete({ where: { id: promo.id } });
  // Restore seat status to AVAILABLE
  await prisma.showtimeSeat.updateMany({
    where: { id: { in: showtime.showtimeSeats.map((s) => s.id) } },
    data: { status: "AVAILABLE" },
  });
  console.log("✓ Cleanup finished.");

  console.log("\n=== E2E PROMO CHECKOUT TEST COMPLETED SUCCESSFULLY ===");
}

runE2ETest()
  .catch((e) => {
    console.error("E2E Test Failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
