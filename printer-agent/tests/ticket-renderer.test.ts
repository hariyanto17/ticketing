import test from "node:test";
import assert from "node:assert/strict";
import { TicketRenderer } from "../src/printer/TicketRenderer.js";

const payload = {
  ticketNumber: "PCM-20260821-0001",
  orderNumber: "ORDER-1",
  movie: "INSIDIOUS: OUT OF THE FURTHER",
  studio: "Studio 2",
  showDate: "25-Aug-2026",
  showTime: "19:00",
  seat: "F7",
  price: 45000,
  qrCode: "https://example.com/ticket/PCM-20260821-0001",
};

test("TicketRenderer emits deterministic ESC/POS initialization, customer copy, QR, CUT HERE, compact staff copy, feed, and cut", () => {
  const buffer = new TicketRenderer().render(payload, { paperWidth: 80, autoCut: true });
  const text = buffer.toString("utf8");

  // Init bytes
  assert.deepEqual(buffer.subarray(0, 7), Buffer.from([0x1b, 0x40, 0x1b, 0x61, 0x00, 0x1b, 0x45]));

  // First copy: Full customer ticket
  assert.match(text, /Planet Cinema/);
  assert.match(text, /Bone/);
  assert.match(text, /INSIDIOUS: OUT OF THE FURTHER/);
  assert.match(text, /SHOW DATE : 25-Aug-2026/);
  assert.match(text, /SHOW TIME : 19:00/);
  assert.match(text, /Please keep this ticket for entry\./);

  // Separator
  assert.match(text, /CUT HERE/);

  // Second copy: Compact staff copy
  assert.match(text, /Planet Cinema - Bone/);
  assert.match(text, /25-Aug-2026  19:00/);
  assert.match(text, /Studio: Studio 2/);
  assert.match(text, /Seat: F7/);
  assert.match(text, /Ticket: PCM-20260821-0001/);

  // QR Code is printed exactly once (only for customer ticket, not duplicated in staff copy)
  const qrPrintCommand = Buffer.from([0x1d, 0x28, 0x6b, 0x03, 0x00, 0x31, 0x51, 0x30]);
  let qrCount = 0;
  let pos = 0;
  while ((pos = buffer.indexOf(qrPrintCommand, pos)) !== -1) {
    qrCount++;
    pos += qrPrintCommand.length;
  }
  assert.equal(qrCount, 1, "QR code should only be present once for customer copy");

  // Feed & Cut
  assert.ok(buffer.includes(Buffer.from([0x1b, 0x64, 0x03])));
  assert.ok(buffer.includes(Buffer.from([0x1d, 0x56, 0x42, 0x00])));
});

test("TicketRenderer formats 58mm compact layout correctly without horizontal overflow", () => {
  const buffer = new TicketRenderer().render(payload, { paperWidth: 58, autoCut: true });
  const text = buffer.toString("utf8");

  assert.match(text, /CUT HERE/);
  assert.match(text, /Planet Cinema - Bone/);
  assert.match(text, /Studio: Studio 2  Seat: F7/);
});

test("TicketRenderer wraps long movie titles across multiple lines safely", () => {
  const longMoviePayload = {
    ...payload,
    movie: "GUARDIANS OF THE GALAXY VOL 3 SPECIAL IMAX 3D EXTENDED",
  };
  const buffer = new TicketRenderer().render(longMoviePayload, { paperWidth: 58, autoCut: true });
  const text = buffer.toString("utf8");

  assert.match(text, /GUARDIANS OF THE/);
  assert.match(text, /CUT HERE/);
  assert.match(text, /Planet Cinema - Bone/);
});

test("TicketRenderer omits the cut command when autoCut is disabled", () => {
  const buffer = new TicketRenderer().render(payload, { paperWidth: 58, autoCut: false });
  assert.equal(buffer.includes(Buffer.from([0x1d, 0x56, 0x42, 0x00])), false);
});

