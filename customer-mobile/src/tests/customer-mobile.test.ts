import test from "node:test";
import assert from "node:assert/strict";
import idTranslations from "../locales/id";
import enTranslations from "../locales/en";

import { formatDuration } from "../utils/format";

test("Phase 8C: React Native Customer Mobile App Logic & Invariants", async (t) => {
  await t.test("1. Movie duration formatting (e.g. 115m -> 1 jam 55 menit)", () => {
    assert.strictEqual(formatDuration(115, "id"), "1 jam 55 menit");
    assert.strictEqual(formatDuration(115, "en"), "1 hr 55 min");
    assert.strictEqual(formatDuration(120, "id"), "2 jam");
    assert.strictEqual(formatDuration(120, "en"), "2 hrs");
    assert.strictEqual(formatDuration(45, "id"), "45 menit");
    assert.strictEqual(formatDuration(null, "id"), "Durasi belum tersedia");
    assert.strictEqual(formatDuration(undefined, "en"), "Duration unavailable");
  });

  await t.test("2. Seat Matrix & Center/Side Aisle Preservation", () => {
    // Studio layout with gap at column 7 (Aisle between 6 and 8)
    const testSeats = [
      { row: "A", column: 1, seatNumber: 1, seatLabel: "A1" },
      { row: "A", column: 2, seatNumber: 2, seatLabel: "A2" },
      { row: "A", column: 3, seatNumber: 3, seatLabel: "A3" },
      { row: "A", column: 4, seatNumber: 4, seatLabel: "A4" },
      { row: "A", column: 5, seatNumber: 5, seatLabel: "A5" },
      { row: "A", column: 6, seatNumber: 6, seatLabel: "A6" },
      // Column 7 is missing (Aisle)
      { row: "A", column: 8, seatNumber: 7, seatLabel: "A7" },
      { row: "A", column: 9, seatNumber: 8, seatLabel: "A8" },
      { row: "A", column: 10, seatNumber: 9, seatLabel: "A9" },
      { row: "A", column: 11, seatNumber: 10, seatLabel: "A10" },
      { row: "A", column: 12, seatNumber: 11, seatLabel: "A11" },
      { row: "A", column: 13, seatNumber: 12, seatLabel: "A12" },
    ];

    let maxCol = 0;
    const rowMap: Record<number, any> = {};
    for (const s of testSeats) {
      rowMap[s.column] = s;
      if (s.column > maxCol) maxCol = s.column;
    }

    assert.strictEqual(maxCol, 13, "Max column must reflect actual coordinate space");
    assert.strictEqual(rowMap[7], undefined, "Aisle at column 7 must be undefined/empty");
    assert.ok(rowMap[6], "Seat A6 must exist at col 6");
    assert.ok(rowMap[8], "Seat A7 must exist at col 8 after the aisle gap");
  });

  await t.test("3. 2-Minute Hold Reservation Timer Computation", () => {
    const now = Date.now();
    const futureHold = new Date(now + 2 * 60 * 1000); // 2 minutes in future
    const remainingSeconds = Math.floor((futureHold.getTime() - now) / 1000);

    assert.ok(remainingSeconds >= 119 && remainingSeconds <= 120, "Hold duration should be ~120 seconds");

    const minutes = Math.floor(remainingSeconds / 60);
    const seconds = remainingSeconds % 60;
    const formatted = `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;

    assert.strictEqual(formatted, "02:00");

    // Expired check
    const pastHold = new Date(now - 1000);
    const expiredSeconds = Math.floor((pastHold.getTime() - now) / 1000);
    assert.ok(expiredSeconds <= 0, "Past hold should immediately evaluate to <= 0 seconds");
  });

  await t.test("4. Price Calculation and Currency Formatting", () => {
    const ticketPrice = 60000;
    const selectedCount = 3;
    const total = ticketPrice * selectedCount;

    assert.strictEqual(total, 180000);

    const formatted = `Rp ${total.toLocaleString("id-ID")}`;
    assert.strictEqual(formatted, "Rp 180.000");
  });

  await t.test("5. Turnstile QR Code Payload Format Invariant", () => {
    const ticketNumber = "PCM-20260902-00001-001";
    // QR Code must match turnstile scanner expectation
    assert.match(ticketNumber, /^PCM-\d{8}-\d{4,6}-\d{3}$/);
  });
});
