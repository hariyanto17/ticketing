import test from "node:test";
import assert from "node:assert/strict";
import { prisma } from "../utils/prisma";
import * as bookingService from "../modules/bookings/service";
import * as ticketService from "../modules/tickets/service";

test("Self-Service Ticket Printing Kiosk Lookup & Log", async (t) => {
  // 1. Setup Fixtures
  let branch = await prisma.branch.findFirst();
  if (!branch) {
    branch = await prisma.branch.create({
      data: {
        name: "Kiosk Test Branch",
        code: "KTB01",
        address: "Test Address",
        city: "Jakarta",
        province: "DKI Jakarta",
        phone: "08123456789",
        email: "kiosk@planetcinema.id",
        timezone: "Asia/Jakarta",
        status: "ACTIVE",
      },
    });
  }

  let studio = await prisma.studio.findFirst({
    where: { branchId: branch.id },
    include: { seats: true },
  });

  if (!studio) {
    studio = await prisma.studio.create({
      data: {
        branchId: branch.id,
        name: "Studio Kiosk",
        code: "STK01",
        capacity: 10,
        status: "ACTIVE",
      },
      include: { seats: true },
    });
  }

  let seats = studio.seats;
  if (seats.length < 2) {
    await prisma.seat.createMany({
      data: [
        { studioId: studio.id, row: "K", column: 1, seatNumber: 1, seatLabel: "K1", seatType: "REGULAR", status: "ACTIVE" },
        { studioId: studio.id, row: "K", column: 2, seatNumber: 2, seatLabel: "K2", seatType: "REGULAR", status: "ACTIVE" },
      ],
    });
    seats = await prisma.seat.findMany({ where: { studioId: studio.id } });
  }

  let prodHouse = await prisma.productionHouse.findFirst();
  if (!prodHouse) {
    prodHouse = await prisma.productionHouse.create({
      data: { name: "Kiosk Pictures", isActive: true },
    });
  }

  let movie = await prisma.movie.findFirst();
  if (!movie) {
    movie = await prisma.movie.create({
      data: {
        title: "Kiosk Feature Film",
        slug: `kiosk-film-${Date.now()}`,
        productionHouseId: prodHouse.id,
        status: "NOW_SHOWING",
        durationMinutes: 120,
        censorshipRating: "13+",
      },
    });
  }

  const showtime = await prisma.showtime.create({
    data: {
      movieId: movie.id,
      studioId: studio.id,
      startTime: new Date(Date.now() + 3600000),
      ticketPrice: 50000,
      status: "PUBLISHED",
    },
  });

  const showtimeSeats = await Promise.all(
    seats.slice(0, 2).map((s) =>
      prisma.showtimeSeat.create({
        data: {
          showtimeId: showtime.id,
          seatId: s.id,
          status: "AVAILABLE",
        },
      })
    )
  );

  // 2. Create online booking
  const booking = await bookingService.createGuestBooking({
    scheduleId: showtime.id,
    seatIds: [seats[0].id, seats[1].id],
    customerName: "Kiosk Visitor",
    customerPhone: "081987654321",
    customerEmail: "kiosk@visitor.test",
  });

  const orderId = booking.order.id;
  const orderNumber = booking.order.orderNumber;

  // 3. Test Lookup while PENDING -> Expect rejection (unpaid)
  await t.test("1. Kiosk lookup rejects UNPAID / PENDING order", async () => {
    await assert.rejects(
      async () => {
        await ticketService.kioskLookupOrder(orderNumber);
      },
      (err: any) => {
        assert.ok(err.message.includes("belum lunas") || err.message.includes("pembayaran"));
        return true;
      }
    );
  });

  // 4. Simulate Payment Settlement
  await prisma.order.update({
    where: { id: orderId },
    data: {
      orderStatus: "PAID",
      paymentStatus: "PAID",
    },
  });

  const tickets = await prisma.ticket.findMany({ where: { orderId } });
  const firstTicket = tickets[0];

  // 5. Test Lookup by Order Number
  await t.test("2. Kiosk lookup by Order Number successfully returns order & tickets", async () => {
    const res = await ticketService.kioskLookupOrder(orderNumber);
    assert.equal(res.orderId, orderId);
    assert.equal(res.orderNumber, orderNumber);
    assert.equal(res.customerName, "Kiosk Visitor");
    assert.equal(res.movie.title, movie.title);
    assert.equal(res.tickets.length, 2);
    assert.ok(res.tickets[0].seatLabel);
  });

  // 6. Test Lookup by Ticket Number / QR Code
  await t.test("3. Kiosk lookup by individual Ticket Number returns full order bundle", async () => {
    const res = await ticketService.kioskLookupOrder(firstTicket.ticketNumber);
    assert.equal(res.orderId, orderId);
    assert.equal(res.tickets.length, 2);
  });

  // 7. Test Lookup by Customer Phone
  await t.test("4. Kiosk lookup by Customer Phone Number", async () => {
    const res = await ticketService.kioskLookupOrder("081987654321");
    assert.equal(res.orderId, orderId);
    assert.equal(res.orderNumber, orderNumber);
  });

  // 8. Test Log Kiosk Print
  await t.test("5. Log Kiosk Printing confirms print event", async () => {
    const logRes = await ticketService.logKioskPrint(orderId);
    assert.equal(logRes.success, true);
    assert.equal(logRes.orderId, orderId);
    assert.equal(logRes.ticketsCount, 2);
    assert.ok(logRes.printedAt);
  });

  // 9. Test Rejection when showtime is older than 2 hours
  await t.test("6. Kiosk lookup rejects order when showtime passed > 2 hours", async () => {
    // Set showtime to 3 hours ago
    await prisma.showtime.update({
      where: { id: showtime.id },
      data: { startTime: new Date(Date.now() - 3 * 3600000) },
    });

    await assert.rejects(
      async () => {
        await ticketService.kioskLookupOrder(orderNumber);
      },
      (err: any) => {
        assert.ok(err.message.includes("lebih dari 2 jam") || err.message.includes("tidak ditemukan"));
        return true;
      }
    );

    await assert.rejects(
      async () => {
        await ticketService.kioskLookupOrder("081987654321");
      },
      (err: any) => {
        assert.ok(err.message.includes("tidak ditemukan") || err.message.includes("lebih dari 2 jam"));
        return true;
      }
    );
  });

  // Cleanup
  await prisma.ticketScan.deleteMany({ where: { ticket: { orderId } } }).catch(() => {});
  await prisma.ticketReprint.deleteMany({ where: { ticket: { orderId } } }).catch(() => {});
  await prisma.ticket.deleteMany({ where: { orderId } }).catch(() => {});
  await prisma.payment.deleteMany({ where: { orderId } }).catch(() => {});
  await prisma.order.deleteMany({ where: { id: orderId } }).catch(() => {});
  await prisma.showtimeSeat.deleteMany({ where: { showtimeId: showtime.id } }).catch(() => {});
  await prisma.showtime.deleteMany({ where: { id: showtime.id } }).catch(() => {});
});
