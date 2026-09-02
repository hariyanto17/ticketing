import test from "node:test";
import assert from "node:assert/strict";
import { prisma } from "../utils/prisma";
import * as bookingService from "../modules/bookings/service";
import * as midtransService from "../modules/payments/midtransService";
import * as ticketService from "../modules/tickets/service";
import { MIDTRANS_SERVER_KEY } from "../config/constant";

test("Phase 8B: Midtrans Payment Gateway Integration", async (t) => {
  // 1. Setup test fixture (Branch, Studio, Seats, ProductionHouse, Movie, Showtime)
  let branch = await prisma.branch.findFirst();
  if (!branch) {
    branch = await prisma.branch.create({
      data: {
        name: "Midtrans Test Branch",
        code: "MTB01",
        address: "Test Address",
        city: "Jakarta",
        province: "DKI Jakarta",
        phone: "08123456789",
        email: "midtrans@planetcinema.id",
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
        name: "Studio Midtrans",
        code: "STM01",
        capacity: 10,
        status: "ACTIVE",
      },
      include: { seats: true },
    });
  }

  let seats = studio.seats;
  if (seats.length < 3) {
    await prisma.seat.createMany({
      data: [
        { studioId: studio.id, row: "M", column: 1, seatNumber: 1, seatLabel: "M1", seatType: "REGULAR", status: "ACTIVE" },
        { studioId: studio.id, row: "M", column: 2, seatNumber: 2, seatLabel: "M2", seatType: "REGULAR", status: "ACTIVE" },
        { studioId: studio.id, row: "M", column: 3, seatNumber: 3, seatLabel: "M3", seatType: "REGULAR", status: "ACTIVE" },
      ],
    });
    seats = await prisma.seat.findMany({ where: { studioId: studio.id } });
  }

  let prodHouse = await prisma.productionHouse.findFirst();
  if (!prodHouse) {
    prodHouse = await prisma.productionHouse.create({
      data: { name: "Midtrans Pictures", isActive: true },
    });
  }

  let movie = await prisma.movie.findFirst();
  if (!movie) {
    movie = await prisma.movie.create({
      data: {
        title: "Midtrans The Blockbuster",
        slug: `midtrans-movie-${Date.now()}`,
        durationMinutes: 120,
        censorshipRating: "SU",
        productionHouseId: prodHouse.id,
        status: "NOW_SHOWING",
      },
    });
  }

  // Create isolated fresh Showtime for this test
  const schedule = await prisma.showtime.create({
    data: {
      movieId: movie.id,
      studioId: studio.id,
      businessDate: new Date(),
      startTime: new Date(Date.now() + Math.floor(Math.random() * 1000000 + 1000) * 1000),
      ticketPrice: 60000,
      status: "PUBLISHED",
    },
  });

  const testSeat1 = seats[0];
  const testSeat2 = seats[1];
  const testSeat3 = seats[2];

  await t.test("1. Midtrans SHA512 Signature Generation & Verification", () => {
    const orderId = "ORD-20260902-12345";
    const statusCode = "200";
    const grossAmount = "120000.00";

    const signature = midtransService.generateMidtransSignature(
      orderId,
      statusCode,
      grossAmount,
      MIDTRANS_SERVER_KEY
    );

    assert.ok(signature, "Signature must be generated");
    assert.strictEqual(typeof signature, "string");
    assert.strictEqual(signature.length, 128, "SHA512 hex signature must be 128 characters");

    // Valid verification
    const isValid = midtransService.verifyMidtransSignature({
      order_id: orderId,
      status_code: statusCode,
      gross_amount: grossAmount,
      signature_key: signature,
      transaction_status: "settlement",
      transaction_id: "tx-test-1",
    });
    assert.strictEqual(isValid, true, "Signature verification must succeed for matching hash");

    // Tampered verification
    const isTampered = midtransService.verifyMidtransSignature({
      order_id: orderId,
      status_code: statusCode,
      gross_amount: "999999.00",
      signature_key: signature,
      transaction_status: "settlement",
      transaction_id: "tx-test-1",
    });
    assert.strictEqual(isTampered, false, "Signature verification must fail on tampered amount");
  });

  await t.test("2. Midtrans Snap Token Generation for Online Booking", async () => {
    const booking = await bookingService.createGuestBooking({
      scheduleId: schedule.id,
      seatIds: [testSeat1.id],
      customerName: "Midtrans Customer",
      customerPhone: "081211112222",
      customerEmail: "customer@example.com",
    });

    assert.strictEqual(booking.order.orderStatus, "PENDING");

    // Generate Snap token
    const snapResult = await midtransService.createSnapTransaction(booking.order.id);
    assert.ok(snapResult.token, "Snap token should be generated");
    assert.ok(snapResult.redirect_url, "Redirect URL should be generated");
    assert.strictEqual(snapResult.orderNumber, booking.order.orderNumber);

    // Verify Payment record was updated
    const payment = await prisma.payment.findFirst({
      where: { orderId: booking.order.id },
    });
    assert.strictEqual(payment?.provider, "MIDTRANS");
    assert.strictEqual(payment?.snapToken, snapResult.token);
    assert.strictEqual(payment?.redirectUrl, snapResult.redirect_url);
    assert.strictEqual(payment?.status, "PENDING");
  });

  await t.test("3. Webhook Settlement Lifecycle & Delayed Ticket Activation", async () => {
    // Create pending booking
    const booking = await bookingService.createGuestBooking({
      scheduleId: schedule.id,
      seatIds: [testSeat2.id],
      customerName: "Settlement Tester",
      customerPhone: "081233334444",
    });

    const ticket = booking.tickets[0];
    assert.strictEqual(ticket.status, "PENDING", "Ticket must start as PENDING");

    // Construct valid Midtrans settlement webhook notification
    const orderId = booking.order.orderNumber;
    const statusCode = "200";
    const grossAmount = `${Math.round(booking.order.totalAmount)}.00`;
    const txId = `MIDTRANS-TX-${Date.now()}`;
    const signature = midtransService.generateMidtransSignature(orderId, statusCode, grossAmount, MIDTRANS_SERVER_KEY);

    const notificationPayload: any = {
      order_id: orderId,
      status_code: statusCode,
      gross_amount: grossAmount,
      signature_key: signature,
      transaction_status: "settlement",
      transaction_id: txId,
      payment_type: "gopay",
      fraud_status: "accept",
      transaction_time: "2026-09-02 17:00:00",
    };

    // Process notification
    const result = await midtransService.handleMidtransNotification(notificationPayload);
    assert.strictEqual(result.status, "SUCCESS");

    // Verify DB mutations
    const updatedOrder = await prisma.order.findUnique({ where: { id: booking.order.id } });
    assert.strictEqual(updatedOrder?.orderStatus, "PAID");
    assert.strictEqual(updatedOrder?.paymentStatus, "PAID");

    const updatedPayment = await prisma.payment.findFirst({ where: { orderId: booking.order.id } });
    assert.strictEqual(updatedPayment?.status, "PAID");
    assert.ok(updatedPayment?.paidAt instanceof Date, "paidAt must be recorded");
    assert.strictEqual(updatedPayment?.providerTransactionId, txId);
    assert.strictEqual(updatedPayment?.paymentType, "gopay");

    const updatedTicket = await prisma.ticket.findUnique({ where: { id: ticket.id } });
    assert.strictEqual(updatedTicket?.status, "ACTIVE", "Ticket must transition to ACTIVE on settlement");

    const updatedSeat = await prisma.showtimeSeat.findFirst({
      where: { showtimeId: schedule.id, seatId: testSeat2.id },
    });
    assert.strictEqual(updatedSeat?.status, "SOLD", "Seat must transition to SOLD on settlement");

    // Valid entry scan check
    const scan = await ticketService.validateTicket(ticket.ticketNumber);
    assert.strictEqual(scan.status, "VALID");
    assert.strictEqual(scan.ticket?.status, "USED");
  });

  await t.test("4. Webhook Notification Idempotency Guard", async () => {
    // Re-send the exact settlement notification for already paid order
    const paidOrder = await prisma.order.findFirst({
      where: { scheduleId: schedule.id, orderStatus: "PAID" },
    });
    assert.ok(paidOrder);

    const grossAmount = `${Math.round(paidOrder.totalAmount)}.00`;
    const signature = midtransService.generateMidtransSignature(paidOrder.orderNumber, "200", grossAmount, MIDTRANS_SERVER_KEY);

    const duplicatePayload: any = {
      order_id: paidOrder.orderNumber,
      status_code: "200",
      gross_amount: grossAmount,
      signature_key: signature,
      transaction_status: "settlement",
      transaction_id: "duplicate-tx-123",
      payment_type: "qris",
    };

    const result = await midtransService.handleMidtransNotification(duplicatePayload);
    assert.strictEqual(result.status, "ALREADY_PROCESSED");

    // Verify no duplicate payments
    const payments = await prisma.payment.findMany({ where: { orderId: paidOrder.id } });
    assert.strictEqual(payments.length, 1);
  });

  await t.test("5. Webhook Expiry Lifecycle & Seat Release", async () => {
    // Create pending booking
    const booking = await bookingService.createGuestBooking({
      scheduleId: schedule.id,
      seatIds: [testSeat3.id],
      customerName: "Expiry Tester",
      customerPhone: "081255556666",
    });

    const orderId = booking.order.orderNumber;
    const statusCode = "200";
    const grossAmount = `${Math.round(booking.order.totalAmount)}.00`;
    const signature = midtransService.generateMidtransSignature(orderId, statusCode, grossAmount, MIDTRANS_SERVER_KEY);

    const expirePayload: any = {
      order_id: orderId,
      status_code: statusCode,
      gross_amount: grossAmount,
      signature_key: signature,
      transaction_status: "expire",
      transaction_id: `EXPIRE-TX-${Date.now()}`,
    };

    const result = await midtransService.handleMidtransNotification(expirePayload);
    assert.strictEqual(result.status, "CANCELLED");

    // Verify Order is CANCELLED and Seat is AVAILABLE
    const cancelledOrder = await prisma.order.findUnique({ where: { id: booking.order.id } });
    assert.strictEqual(cancelledOrder?.orderStatus, "CANCELLED");
    assert.strictEqual(cancelledOrder?.paymentStatus, "FAILED");

    const releasedSeat = await prisma.showtimeSeat.findFirst({
      where: { showtimeId: schedule.id, seatId: testSeat3.id },
    });
    assert.strictEqual(releasedSeat?.status, "AVAILABLE", "Expired hold seat must be released to AVAILABLE");
    assert.strictEqual(releasedSeat?.reservedUntil, null);
  });

  await t.test("6. Webhook Security: Rejects Gross Amount Mismatch", async () => {
    const booking = await bookingService.createGuestBooking({
      scheduleId: schedule.id,
      seatIds: [testSeat3.id],
      customerName: "Tamper Tester",
      customerPhone: "081299990000",
    });

    const orderId = booking.order.orderNumber;
    const tamperedAmount = "100.00"; // Real amount is 60000
    const signature = midtransService.generateMidtransSignature(orderId, "200", tamperedAmount, MIDTRANS_SERVER_KEY);

    const tamperedPayload: any = {
      order_id: orderId,
      status_code: "200",
      gross_amount: tamperedAmount,
      signature_key: signature,
      transaction_status: "settlement",
      transaction_id: "tamper-tx-1",
    };

    await assert.rejects(
      async () => {
        await midtransService.handleMidtransNotification(tamperedPayload);
      },
      /Gross amount mismatch/i,
      "Webhook must reject amount mismatch"
    );
  });
});
