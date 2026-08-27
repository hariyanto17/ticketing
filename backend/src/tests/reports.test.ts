import test from "node:test";
import assert from "node:assert/strict";
import { validateReportQuery } from "../modules/internal/reports/validation";
import { getMoviePerformanceReport, getShowtimePerformanceReport } from "../modules/internal/reports/service";
import { prisma } from "../utils/prisma";

test("Ticketing Internal Reporting Validation & Logic", async (t) => {
  await t.test("Validation: rejects missing or invalid startDate/endDate", () => {
    assert.throws(
      () => validateReportQuery({}),
      /startDate is required/
    );

    assert.throws(
      () => validateReportQuery({ startDate: "invalid-date", endDate: "2026-08-27" }),
      /Invalid date format/
    );

    assert.throws(
      () => validateReportQuery({ startDate: "2026-08-30", endDate: "2026-08-01" }),
      /startDate cannot be after endDate/
    );

    assert.throws(
      () => validateReportQuery({ startDate: "2024-01-01", endDate: "2026-01-01" }),
      /Date range cannot exceed 366 days/
    );
  });

  await t.test("Validation: parses valid pagination and query flags", () => {
    const valid = validateReportQuery({
      startDate: "2026-08-01",
      endDate: "2026-08-27",
      page: "2",
      limit: "50",
      search: "Avatar",
      compare: "true",
    });

    assert.strictEqual(valid.startDate, "2026-08-01");
    assert.strictEqual(valid.endDate, "2026-08-27");
    assert.strictEqual(valid.page, 2);
    assert.strictEqual(valid.limit, 50);
    assert.strictEqual(valid.search, "Avatar");
    assert.strictEqual(valid.compare, true);
  });

  await t.test("Movie Report Service: handles query execution with valid schema return", async () => {
    const result = await getMoviePerformanceReport({
      startDate: "2026-08-01",
      endDate: "2026-08-31",
      page: 1,
      limit: 10,
    });

    assert.ok(result, "Result should exist");
    assert.ok(Array.isArray(result.data), "data must be an array");
    assert.ok(result.summary, "summary must exist");
    assert.ok(result.pagination, "pagination must exist");
    assert.strictEqual(typeof result.summary.totalRevenue, "number");
  });

  await t.test("Showtime Report Service: safely computes occupancy with zero-seat safe guards", async () => {
    const result = await getShowtimePerformanceReport({
      startDate: "2026-08-01",
      endDate: "2026-08-31",
      page: 1,
      limit: 10,
    });

    assert.ok(result, "Result should exist");
    assert.ok(Array.isArray(result.data), "data must be an array");
    assert.ok(result.summary, "summary must exist");
    for (const item of result.data) {
      if (item.totalSeats === 0) {
        assert.strictEqual(item.occupancyRate, null, "Zero totalSeats must produce null occupancyRate, never NaN or Infinity");
      } else {
        assert.ok(item.occupancyRate === null || (item.occupancyRate >= 0 && item.occupancyRate <= 100));
      }
    }
  });
});
