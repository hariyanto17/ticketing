import test from "node:test";
import assert from "node:assert/strict";
import { ShiftSummaryRenderer } from "../src/printer/ShiftSummaryRenderer.js";

test("ShiftSummaryRenderer emits deterministic ESC/POS initialization, text, breakdown and signature sections", () => {
  const renderer = new ShiftSummaryRenderer();
  const buffer = renderer.render(
    {
      jobId: "test-shift-1",
      cashierName: "Budi Kasir",
      openedAt: "2026-10-06T08:00:00.000Z",
      closedAt: "2026-10-06T16:00:00.000Z",
      openingBalance: 500000,
      expectedBalance: 1500000,
      actualBalance: 1500000,
      difference: 0,
      notes: "Semua uang tunai cocok dan klop",
      totalCashSales: 1000000,
      totalQrisSales: 200000,
      totalOtherSales: 0,
      totalSales: 1200000,
      totalTransactions: 15,
    },
    { paperWidth: 80, autoCut: true },
  );

  const text = buffer.toString("utf8");
  assert.match(text, /PLANET CINEMA/);
  assert.match(text, /REKONSILIASI TUTUP SHIFT/);
  assert.match(text, /Budi Kasir/);
  assert.match(text, /Penjualan Tunai/);
  assert.match(text, /Penjualan QRIS/);
  assert.match(text, /PAS \/ SESUAI \(KLOP\)/);
  assert.match(text, /Semua uang tunai cocok dan klop/);
  assert.match(text, /Kasir/);
  assert.match(text, /Supervisor/);
  // Auto-cut ESC/POS bytes
  assert.ok(buffer.includes(Buffer.from([0x1d, 0x56, 0x42, 0x00])));
});
