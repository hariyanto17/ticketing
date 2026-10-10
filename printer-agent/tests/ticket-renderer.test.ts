import test from "node:test";
import assert from "node:assert/strict";
import { TicketRenderer } from "../src/printer/TicketRenderer.js";

const payload = {
  ticketNumber: "PCM-20260821-0001",
  orderNumber: "ORDER-1",
  movie: "Agak Laen",
  studio: "Studio 1",
  showDate: "2026-08-21",
  showTime: "19:30",
  seat: "A1",
  row: "A",
  seatNumber: 1,
  price: 50000,
  qrCode: "https://example.com/ticket/PCM-20260821-0001",
};

test("TicketRenderer emits deterministic ESC/POS initialization, text, feed, and cut", () => {
  const buffer = new TicketRenderer().render(payload, { paperWidth: 80, autoCut: true });
  assert.deepEqual(buffer.subarray(0, 9), Buffer.from([0x1b, 0x40, 0x1d, 0x4c, 0x18, 0x00, 0x1b, 0x61, 0x00]));
  assert.match(buffer.toString("utf8"), /PLANET CINEMA/);
  assert.match(buffer.toString("utf8"), /Agak Laen/);
  assert.match(buffer.toString("utf8"), /tanggal tayang : 21\/08\/2026/);
  assert.match(buffer.toString("utf8"), /harga : Rp 50\.000/);
  assert.match(buffer.toString("utf8"), /row:\s*.*A.*seat\s*.*1.*studio\s*.*1/);
  const boldSeatInfo = Buffer.from([
    ...Buffer.from("row: ", "utf8"),
    0x1b, 0x45, 0x01, ...Buffer.from("A", "utf8"), 0x1b, 0x45, 0x00,
    ...Buffer.from(" seat ", "utf8"),
    0x1b, 0x45, 0x01, ...Buffer.from("1", "utf8"), 0x1b, 0x45, 0x00,
    ...Buffer.from(" studio ", "utf8"),
    0x1b, 0x45, 0x01, ...Buffer.from("1", "utf8"), 0x1b, 0x45, 0x00, 0x0a,
  ]);
  const normalSeatInfo = Buffer.from("   row: A seat 1 studio 1\n", "utf8");
  assert.ok(buffer.indexOf(boldSeatInfo) >= 0);
  assert.ok(buffer.indexOf(normalSeatInfo, buffer.indexOf(Buffer.from("- CUT HERE -", "utf8"))) >= 0);
  assert.match(buffer.toString("utf8"), /CUT HERE/);
  assert.equal(buffer.includes(Buffer.from("https://example.com/ticket/PCM-20260821-0001", "utf8")), false);
  assert.equal(buffer.includes(Buffer.from([0x1d, 0x28, 0x6b])), false);
  assert.ok(buffer.includes(Buffer.from([0x1b, 0x64, 0x03])));
  assert.ok(buffer.includes(Buffer.from([0x1d, 0x56, 0x42, 0x00])));
});

test("TicketRenderer omits the cut command when autoCut is disabled", () => {
  const buffer = new TicketRenderer().render(payload, { paperWidth: 58, autoCut: false });
  assert.equal(buffer.includes(Buffer.from([0x1d, 0x56, 0x42, 0x00])), false);
});
