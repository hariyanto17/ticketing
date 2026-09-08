import test from "node:test";
import assert from "node:assert/strict";
import { prisma } from "../utils/prisma";
import * as scheduleService from "../modules/schedules/service";

test("Schedule Copying Feature: Copy schedules from source date to target date", async (t) => {
  // 1. Setup test fixtures
  let branch = await prisma.branch.findFirst();
  if (!branch) {
    branch = await prisma.branch.create({
      data: {
        name: "Copy Schedule Branch",
        code: "CSB01",
        address: "Jl. Test",
        city: "Jakarta",
        province: "DKI Jakarta",
        phone: "08123456789",
        email: "test@planetcinema.id",
        timezone: "Asia/Jakarta",
        status: "ACTIVE",
      },
    });
  }

  let studio = await prisma.studio.findFirst({
    where: { branchId: branch.id },
  });
  if (!studio) {
    studio = await prisma.studio.create({
      data: {
        branchId: branch.id,
        name: "Studio Copy Test",
        code: "SCT01",
        capacity: 20,
        status: "ACTIVE",
      },
    });
  }

  let prodHouse = await prisma.productionHouse.findFirst();
  if (!prodHouse) {
    prodHouse = await prisma.productionHouse.create({
      data: { name: "PH Copy Test" },
    });
  }

  let movie = await prisma.movie.findFirst({
    where: { title: "Copy Test Movie" },
  });
  if (!movie) {
    movie = await prisma.movie.create({
      data: {
        title: "Copy Test Movie",
        slug: "copy-test-movie",
        synopsis: "Test movie for copy schedule",
        durationMinutes: 120,
        productionHouseId: prodHouse.id,
        status: "NOW_PLAYING",
      },
    });
  }

  const sourceDateStr = "2026-05-10";
  const targetDateStr = "2026-05-11";

  // Clean up any test showtimes on these dates for this studio
  const sMin = new Date(sourceDateStr);
  sMin.setHours(0, 0, 0, 0);
  const tMax = new Date(targetDateStr);
  tMax.setHours(23, 59, 59, 999);

  await prisma.showtime.deleteMany({
    where: {
      studioId: studio.id,
      businessDate: { gte: sMin, lte: tMax },
    },
  });

  // Create two source showtimes on 2026-05-10
  const sourceTime1 = new Date(`${sourceDateStr}T13:00:00.000Z`);
  const endTime1 = new Date(`${sourceDateStr}T15:00:00.000Z`);

  const sourceTime2 = new Date(`${sourceDateStr}T16:00:00.000Z`);
  const endTime2 = new Date(`${sourceDateStr}T18:00:00.000Z`);

  await prisma.showtime.create({
    data: {
      movieId: movie.id,
      studioId: studio.id,
      businessDate: new Date(sourceDateStr),
      startTime: sourceTime1,
      endTime: endTime1,
      ticketPrice: 50000,
      status: "PUBLISHED",
    },
  });

  await prisma.showtime.create({
    data: {
      movieId: movie.id,
      studioId: studio.id,
      businessDate: new Date(sourceDateStr),
      startTime: sourceTime2,
      endTime: endTime2,
      ticketPrice: 50000,
      status: "DRAFT",
    },
  });

  await t.test("1. Successfully copies all schedules from source date to target date", async () => {
    const res = await scheduleService.copySchedules({
      sourceDate: sourceDateStr,
      targetDate: targetDateStr,
    });

    assert.equal(res.totalFound, 2);
    assert.equal(res.created, 2);
    assert.equal(res.skipped, 0);
    assert.equal(res.createdSchedules.length, 2);

    // Verify times match (13:00 and 16:00 on target date)
    const expectedTime1 = new Date(`${targetDateStr}T13:00:00.000Z`);
    const expectedTime2 = new Date(`${targetDateStr}T16:00:00.000Z`);

    const created1 = res.createdSchedules.find(
      (s) => s.startTime.getTime() === expectedTime1.getTime()
    );
    const created2 = res.createdSchedules.find(
      (s) => s.startTime.getTime() === expectedTime2.getTime()
    );

    assert.ok(created1, "First schedule created at 13:00 on target date");
    assert.ok(created2, "Second schedule created at 16:00 on target date");
    assert.equal(created1.ticketPrice, 50000);
    assert.equal(created1.status, "PUBLISHED");
    assert.equal(created2.status, "DRAFT");
  });

  await t.test("2. Handles collision/overlap on target date gracefully (skips conflicting schedules)", async () => {
    // Attempting to copy again should find overlap for all target schedules
    const res = await scheduleService.copySchedules({
      sourceDate: sourceDateStr,
      targetDate: targetDateStr,
    });

    assert.equal(res.totalFound, 2);
    assert.equal(res.created, 0);
    assert.equal(res.skipped, 2);
    assert.equal(res.skippedReasons.length, 2);
  });

  await t.test("3. Handles empty source date", async () => {
    const res = await scheduleService.copySchedules({
      sourceDate: "2026-01-01",
      targetDate: "2026-01-02",
    });

    assert.equal(res.totalFound, 0);
    assert.equal(res.created, 0);
    assert.equal(res.skipped, 0);
  });

  // Clean up test data
  await prisma.showtime.deleteMany({
    where: {
      studioId: studio.id,
      businessDate: { gte: sMin, lte: tMax },
    },
  });
});
