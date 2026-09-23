import { prisma } from "../utils/prisma";
import * as promotionService from "../modules/promotions/service";
import { PromoType } from "@prisma/client";

async function runVerification() {
  console.log("=== Starting Promo System Verification ===");

  const now = new Date();
  const nextMonth = new Date();
  nextMonth.setMonth(nextMonth.getMonth() + 1);

  const pastDate = new Date();
  pastDate.setDate(pastDate.getDate() - 10);
  const pastEndDate = new Date();
  pastEndDate.setDate(pastEndDate.getDate() - 1);

  // 1. Create BOGO Promotion (Buy 1 Get 1, Quota: 100)
  console.log("\n[Test 1] Creating BOGO Promo (100 quota)...");
  const bogoPromo = await promotionService.createPromotion({
    name: "Promo Buy 1 Get 1 Test",
    code: `BOGO100_${Date.now()}`,
    promoType: "BUY_X_GET_Y",
    buyQty: 1,
    getQty: 1,
    quota: 100,
    startDate: now.toISOString(),
    endDate: nextMonth.toISOString(),
    isActive: true,
  });
  console.log("✓ BOGO Promo created:", bogoPromo.id, bogoPromo.name, `Quota: ${bogoPromo.quota}`);

  // 2. Create Percentage Promotion (20% Off, Quota: 100)
  console.log("\n[Test 2] Creating Percentage Promo (20% Off, 100 quota)...");
  const percentPromo = await promotionService.createPromotion({
    name: "Promo Diskon 20% Test",
    code: `DISKON20_${Date.now()}`,
    promoType: "PERCENTAGE",
    discountPercent: 20,
    quota: 100,
    startDate: now.toISOString(),
    endDate: nextMonth.toISOString(),
    isActive: true,
  });
  console.log("✓ Percentage Promo created:", percentPromo.id, percentPromo.name, `Discount: ${percentPromo.discountPercent}%`);

  // 3. Test BOGO Calculation for 2 tickets @ 50,000
  console.log("\n[Test 3] Calculating BOGO for 2 tickets @ Rp 50.000...");
  const bogoCalc2 = promotionService.calculatePromotionDiscount(bogoPromo, 2, 50000);
  console.log("  Subtotal:", bogoCalc2.subtotal);
  console.log("  Discount:", bogoCalc2.discountAmount);
  console.log("  Final Amount:", bogoCalc2.finalAmount);
  console.log("  Free Tickets:", bogoCalc2.freeTicketsCount);
  console.log("  Quota Increment:", bogoCalc2.usedQuotaIncrement);
  if (bogoCalc2.discountAmount === 50000 && bogoCalc2.finalAmount === 50000 && bogoCalc2.freeTicketsCount === 1) {
    console.log("✓ PASSED: BOGO for 2 tickets is correct (1 ticket free, Rp 50,000 off)");
  } else {
    throw new Error("FAILED: BOGO calculation mismatch");
  }

  // 4. Test BOGO Calculation for 4 tickets @ 50,000
  console.log("\n[Test 4] Calculating BOGO for 4 tickets @ Rp 50.000...");
  const bogoCalc4 = promotionService.calculatePromotionDiscount(bogoPromo, 4, 50000);
  console.log("  Subtotal:", bogoCalc4.subtotal);
  console.log("  Discount:", bogoCalc4.discountAmount);
  console.log("  Final Amount:", bogoCalc4.finalAmount);
  console.log("  Free Tickets:", bogoCalc4.freeTicketsCount);
  if (bogoCalc4.discountAmount === 100000 && bogoCalc4.finalAmount === 100000 && bogoCalc4.freeTicketsCount === 2) {
    console.log("✓ PASSED: BOGO for 4 tickets is correct (2 tickets free, Rp 100,000 off)");
  } else {
    throw new Error("FAILED: BOGO calculation mismatch for 4 tickets");
  }

  // 5. Test Percentage Calculation for 2 tickets @ 50,000
  console.log("\n[Test 5] Calculating Percentage 20% for 2 tickets @ Rp 50.000...");
  const pctCalc = promotionService.calculatePromotionDiscount(percentPromo, 2, 50000);
  console.log("  Subtotal:", pctCalc.subtotal);
  console.log("  Discount:", pctCalc.discountAmount);
  console.log("  Final Amount:", pctCalc.finalAmount);
  if (pctCalc.discountAmount === 20000 && pctCalc.finalAmount === 80000) {
    console.log("✓ PASSED: 20% discount on Rp 100,000 is correct (Rp 20,000 off, final Rp 80,000)");
  } else {
    throw new Error("FAILED: Percentage discount calculation mismatch");
  }

  // 6. Test Expired Promo
  console.log("\n[Test 6] Testing expired promo validation...");
  const expiredPromo = await promotionService.createPromotion({
    name: "Expired Promo Test",
    code: `EXPIRED_${Date.now()}`,
    promoType: "PERCENTAGE",
    discountPercent: 10,
    quota: 50,
    startDate: pastDate.toISOString(),
    endDate: pastEndDate.toISOString(),
    isActive: true,
  });

  try {
    promotionService.calculatePromotionDiscount(expiredPromo, 2, 50000);
    throw new Error("FAILED: Expired promo should have thrown an error");
  } catch (err: any) {
    if (err.message.includes("expired")) {
      console.log("✓ PASSED: Expired promo was successfully rejected with message:", err.message);
    } else {
      throw err;
    }
  }

  // 7. Test Quota Exhausted Promo
  console.log("\n[Test 7] Testing quota exhausted promo validation...");
  const exhaustedPromo = await prisma.promotion.create({
    data: {
      name: "Exhausted Promo Test",
      code: `EXHAUSTED_${Date.now()}`,
      promoType: "BUY_X_GET_Y",
      buyQty: 1,
      getQty: 1,
      quota: 10,
      usedQuota: 10,
      startDate: now,
      endDate: nextMonth,
      isActive: true,
    },
  });

  try {
    promotionService.calculatePromotionDiscount(exhaustedPromo, 2, 50000);
    throw new Error("FAILED: Exhausted quota promo should have thrown an error");
  } catch (err: any) {
    if (err.message.includes("habis")) {
      console.log("✓ PASSED: Exhausted quota promo was successfully rejected with message:", err.message);
    } else {
      throw err;
    }
  }

  // Cleanup test promos
  console.log("\n[Cleanup] Cleaning up test promos...");
  await prisma.promotion.deleteMany({
    where: {
      id: { in: [bogoPromo.id, percentPromo.id, expiredPromo.id, exhaustedPromo.id] },
    },
  });
  console.log("✓ Cleanup completed.");

  console.log("\n=== ALL PROMO VERIFICATION TESTS PASSED SUCCESSFULLY ===");
}

runVerification()
  .catch((e) => {
    console.error("Verification failed with error:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
