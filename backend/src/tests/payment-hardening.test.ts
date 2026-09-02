import test from "node:test";
import assert from "node:assert/strict";
import { prisma } from "../utils/prisma";
import * as bookingService from "../modules/bookings/service";
import * as scheduleService from "../modules/schedules/service";
import * as ticketService from "../modules/tickets/service";

test("Phase 8A: Payment Gateway Readiness & Lifecycle Hardening", async (t) => {
  // 1. Ensure a Branch and Studio with seats exist
  let branch = await prisma.branch.findFirst();
  if (!branch) {
    branch = await prisma.branch.create({
      data: {
        name: "Test Branch",
        code: "TB01",
        address: "Test Address",
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
    include: { seats: true },
  });

  if (!studio) {
    studio = await prisma.studio.create({
      data: {
        branchId: branch.id,
        name: "Studio Test",
        code: "ST01",
        capacity: 10,
        status: "ACTIVE",
      },
      include: { seats: true },
    });
  }

  // Ensure at least 2 seats exist
  let seats = studio.seats;
  if (seats.length < 2) {
    await prisma.seat.createMany({
      data: [
        { studioId: studio.id, row: "A", column: 1, seatNumber: 1, seatLabel: "A1", seatType: "REGULAR", status: "ACTIVE" },
        { studioId: studio.id, row: "A", column: 2, seatNumber: 2, seatLabel: "A2", seatType: "REGULAR", status: "ACTIVE" },
      ],
    });
    seats = await prisma.seat.findMany({ where: { studioId: studio.id } });
  }

  const seat1 = seats[0];
  const seat2 = seats[1];

  // 2. Ensure a Production House & Movie exist
  let prodHouse = await prisma.productionHouse.findFirst();
  if (!prodHouse) {
    prodHouse = await prisma.productionHouse.create({
      data: { name: "Test Studio Pictures", isActive: true },
    });
  }

  let movie = await prisma.movie.findFirst();
  if (!movie) {
    movie = await prisma.movie.create({
      data: {
        title: "Inception Hardened",
        slug: `inception-test-${Date.now()}`,
        durationMinutes: 148,
        censorshipRating: "13+",
        productionHouseId: prodHouse.id,
        status: "NOW_SHOWING",
      },
    });
  }

  // 3. Create an isolated fresh Showtime for this test run
  const schedule = await prisma.showtime.create({
    data: {
      movieId: movie.id,
      studioId: studio.id,
      businessDate: new Date(),
      startTime: new Date(Date.now() + Math.floor(Math.random() * 1000000 + 1000) * 1000),
      ticketPrice: 50000,
      status: "PUBLISHED",
    },
  });

  await t.test("1. Online Booking Lifecycle & Delayed Ticket Activation", async () => {
    // A. Create Guest Booking
    const bookingResult = await bookingService.createGuestBooking({
      scheduleId: schedule.id,
      seatIds: [seat1.id],
      customerName: "Audited Guest",
      customerPhone: "081299998888",
      customerEmail: "guest@example.com",
    });

    assert.ok(bookingResult.order, "Order should be created");
    assert.strictEqual(bookingResult.order.orderStatus, "PENDING", "Order must start in PENDING status");
    assert.strictEqual(bookingResult.order.paymentStatus, "PENDING", "PaymentStatus on Order must be PENDING");

    // Check payment record
    const payment = await prisma.payment.findFirst({
      where: { orderId: bookingResult.order.id },
    });
    assert.ok(payment, "Payment record must be created in PENDING status");
    assert.strictEqual(payment.status, "PENDING", "Payment record status must be PENDING");
    assert.strictEqual(payment.paidAt, null, "Payment paidAt MUST be null for pending bookings");
    assert.strictEqual(payment.provider, "MANUAL", "Default provider should be MANUAL");

    // Check tickets: MUST NOT BE ACTIVE
    assert.strictEqual(bookingResult.tickets.length, 1);
    const ticket = bookingResult.tickets[0];
    assert.strictEqual(ticket.status, "PENDING", "Tickets must start in PENDING status, never ACTIVE!");

    // Check showtime seat status
    const showtimeSeat = await prisma.showtimeSeat.findFirst({
      where: { showtimeId: schedule.id, seatId: seat1.id },
    });
    assert.ok(showtimeSeat);
    assert.strictEqual(showtimeSeat.status, "HOLD", "Seat must be in HOLD status during checkout");
    assert.ok(showtimeSeat.reservedUntil, "reservedUntil must be populated");

    // B. Ticket Validation MUST reject pending ticket
    const validationResult = await ticketService.validateTicket(ticket.ticketNumber);
    assert.strictEqual(
      validationResult.status,
      "PENDING_PAYMENT",
      "Validating a PENDING ticket must reject with PENDING_PAYMENT"
    );

    // Verify ticket did not get marked as USED
    const ticketStillPending = await prisma.ticket.findUnique({ where: { id: ticket.id } });
    assert.strictEqual(ticketStillPending?.status, "PENDING", "Ticket must remain PENDING after failed scan");

    // C. Confirm Booking Payment
    const confirmedOrder = await bookingService.confirmBookingPayment(bookingResult.order.id, {
      provider: "MANUAL",
      paymentType: "QRIS",
      providerTransactionId: `TEST-TX-${Date.now()}`,
    });

    assert.strictEqual(confirmedOrder.orderStatus, "PAID", "Order must transition to PAID");
    assert.strictEqual(confirmedOrder.paymentStatus, "PAID", "Order paymentStatus must transition to PAID");

    // Check Payment is updated
    const updatedPayment = await prisma.payment.findFirst({
      where: { orderId: bookingResult.order.id },
    });
    assert.strictEqual(updatedPayment?.status, "PAID");
    assert.ok(updatedPayment?.paidAt instanceof Date, "paidAt must be recorded upon payment confirmation");

    // Check Tickets are activated
    const activatedTicket = await prisma.ticket.findUnique({ where: { id: ticket.id } });
    assert.strictEqual(activatedTicket?.status, "ACTIVE", "Ticket must transition to ACTIVE after payment confirmation");

    // Check Seat is SOLD
    const soldSeat = await prisma.showtimeSeat.findFirst({
      where: { showtimeId: schedule.id, seatId: seat1.id },
    });
    assert.strictEqual(soldSeat?.status, "SOLD", "ShowtimeSeat must transition to SOLD");
    assert.strictEqual(soldSeat?.reservedUntil, null, "reservedUntil must be cleared on SOLD");

    // D. Ticket Validation should now succeed
    const validScan = await ticketService.validateTicket(ticket.ticketNumber);
    assert.strictEqual(validScan.status, "VALID", "Active ticket must successfully validate");
    assert.strictEqual(validScan.ticket?.status, "USED", "Ticket must transition to USED on valid entry scan");
  });

  await t.test("2. Payment Confirmation Idempotency", async () => {
    // Create another booking and confirm it
    const booking = await bookingService.createGuestBooking({
      scheduleId: schedule.id,
      seatIds: [seat2.id],
      customerName: "Idempotency Tester",
      customerPhone: "081277776666",
    });

    const firstConfirm = await bookingService.confirmBookingPayment(booking.order.id);
    assert.strictEqual(firstConfirm.orderStatus, "PAID");

    // Call confirm again (simulating duplicate webhook or double callback)
    const secondConfirm = await bookingService.confirmBookingPayment(booking.order.id);
    assert.strictEqual(secondConfirm.orderStatus, "PAID", "Second confirmation must succeed idempotently");

    // Verify payments count is still 1
    const payments = await prisma.payment.findMany({ where: { orderId: booking.order.id } });
    assert.strictEqual(payments.length, 1, "Duplicate confirmation must not create extra Payment records");
  });

  await t.test("3. Concurrency-Safe Seat Holding", async () => {
    // Pick an additional seat (e.g. seat 3) or reset seat2 status
    let seat3 = seats[2];
    if (!seat3) {
      seat3 = await prisma.seat.create({
        data: { studioId: studio.id, row: "B", column: 1, seatNumber: 3, seatLabel: "B1", seatType: "REGULAR", status: "ACTIVE" },
      });
    }

    // Ensure seat3 is AVAILABLE
    await prisma.showtimeSeat.updateMany({
      where: { showtimeId: schedule.id, seatId: seat3.id },
      data: { status: "AVAILABLE", reservedUntil: null },
    });

    // Session A holds seat3
    const holdA = await scheduleService.holdSeats(schedule.id, [seat3.id], 5);
    assert.ok(holdA.reservedUntil);

    // Session B tries to hold same seat3 -> MUST THROW CONFLICT
    await assert.rejects(
      async () => {
        await scheduleService.holdSeats(schedule.id, [seat3.id], 5);
      },
      /already held|not available/i,
      "Concurrent hold on active seat must fail with conflict"
    );

    // Session A releases seat3
    await scheduleService.releaseSeats(schedule.id, [seat3.id]);

    // Session B can now hold seat3
    const holdB = await scheduleService.holdSeats(schedule.id, [seat3.id], 5);
    assert.ok(holdB.reservedUntil, "Seat should be holdable after release");

    // Cleanup
    await scheduleService.releaseSeats(schedule.id, [seat3.id]);
  });
});
