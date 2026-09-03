import test from "node:test";
import assert from "node:assert/strict";
import { prisma } from "../utils/prisma";
import * as bookingService from "../modules/bookings/service";
import * as midtransService from "../modules/payments/midtransService";
import { MIDTRANS_SERVER_KEY } from "../config/constant";

test("Phase 8B.1: Midtrans Direct QRIS Core API & Webhook Lifecycle", async (t) => {
  // 1. Setup test fixtures
  let branch = await prisma.branch.findFirst();
  if (!branch) {
    branch = await prisma.branch.create({
      data: {
        name: "QRIS Test Branch",
        code: "QTB01",
        address: "Test Address",
        city: "Jakarta",
        province: "DKI Jakarta",
        phone: "08123456789",
        email: "qris@planetcinema.id",
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
        name: "Studio QRIS",
        code: "STQ01",
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
        { studioId: studio.id, row: "Q", column: 1, seatNumber: 1, seatLabel: "Q1", seatType: "REGULAR", status: "ACTIVE" },
        { studioId: studio.id, row: "Q", column: 2, seatNumber: 2, seatLabel: "Q2", seatType: "REGULAR", status: "ACTIVE" },
        { studioId: studio.id, row: "Q", column: 3, seatNumber: 3, seatLabel: "Q3", seatType: "REGULAR", status: "ACTIVE" },
      ],
    });
    seats = await prisma.seat.findMany({ where: { studioId: studio.id } });
  }

  let prodHouse = await prisma.productionHouse.findFirst();
  if (!prodHouse) {
    prodHouse = await prisma.productionHouse.create({
      data: { name: "QRIS Pictures", isActive: true },
    });
  }

  let movie = await prisma.movie.findFirst();
  if (!movie) {
    movie = await prisma.movie.create({
      data: {
        title: "QRIS The Blockbuster",
        slug: `qris-movie-${Date.now()}`,
        durationMinutes: 120,
        censorshipRating: "SU",
        productionHouseId: prodHouse.id,
        status: "NOW_SHOWING",
      },
    });
  }

  // Create isolated fresh Showtime
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

  const testSeat1 = seats[0];
  const testSeat2 = seats[1];

  let testOrderId = "";
  let testOrderNumber = "";

  await t.test("1. Create Online Guest Booking in PENDING state", async () => {
    const booking = await bookingService.createGuestBooking({
      scheduleId: schedule.id,
      seatIds: [testSeat1.id],
      customerName: "Budi Santoso",
      customerPhone: "081299887766",
      customerEmail: "budi@example.com",
    });

    assert.ok(booking.order.id);
    assert.strictEqual(booking.order.orderStatus, "PENDING");
    assert.strictEqual(booking.order.paymentStatus, "PENDING");
    assert.strictEqual(booking.tickets.length, 1);
    assert.strictEqual(booking.tickets[0].status, "PENDING");

    testOrderId = booking.order.id;
    testOrderNumber = booking.order.orderNumber;
  });

  await t.test("2. Generate Direct Midtrans Core API QRIS charge", async () => {
    const qrisRes = await midtransService.createQrisCharge(testOrderId);

    assert.strictEqual(qrisRes.orderId, testOrderId);
    assert.strictEqual(qrisRes.orderNumber, testOrderNumber);
    assert.strictEqual(qrisRes.status, "PENDING");
    assert.strictEqual(qrisRes.amount, 50000);
    assert.ok(qrisRes.qrUrl || qrisRes.qrString, "QR URL or QR String must be present");
    assert.ok(qrisRes.expiredAt, "Expiration timestamp must be present");

    // Verify DB Payment state
    const payment = await prisma.payment.findUnique({
      where: { id: qrisRes.paymentId },
    });
    assert.ok(payment);
    assert.strictEqual(payment?.provider, "MIDTRANS");
    assert.strictEqual(payment?.paymentType, "QRIS");
    assert.strictEqual(payment?.status, "PENDING");
    assert.strictEqual(payment?.paidAt, null);
    assert.ok(payment?.providerTransactionId);
    assert.ok(payment?.rawResponse);
  });

  await t.test("3. Duplicate QRIS creation idempotency (returns existing active QRIS)", async () => {
    const secondQrisRes = await midtransService.createQrisCharge(testOrderId);

    assert.strictEqual(secondQrisRes.orderId, testOrderId);
    assert.strictEqual(secondQrisRes.orderNumber, testOrderNumber);
    assert.strictEqual(secondQrisRes.status, "PENDING");

    // Ensure no second payment record was spawned
    const paymentCount = await prisma.payment.count({
      where: { orderId: testOrderId },
    });
    assert.strictEqual(paymentCount, 1, "Must maintain exactly 1 active payment record");
  });

  await t.test("4. Webhook Security: Signature mismatch rejection", async () => {
    const invalidPayload = {
      order_id: testOrderNumber,
      status_code: "200",
      gross_amount: "50000.00",
      signature_key: "invalid-bogus-signature",
      transaction_id: "trx-invalid",
      transaction_status: "settlement",
      payment_type: "qris",
    };

    await assert.rejects(
      async () => {
        await midtransService.handleMidtransNotification(invalidPayload as any);
      },
      (err: any) => {
        assert.strictEqual(err.httpStatus, 401);
        assert.match(err.message, /Invalid Midtrans signature/i);
        return true;
      }
    );
  });

  await t.test("5. Webhook Security: Gross amount mismatch rejection", async () => {
    const statusCode = "200";
    const forgedAmount = "999999.00";
    const signature = midtransService.generateMidtransSignature(
      testOrderNumber,
      statusCode,
      forgedAmount,
      MIDTRANS_SERVER_KEY
    );

    const forgedPayload = {
      order_id: testOrderNumber,
      status_code: statusCode,
      gross_amount: forgedAmount,
      signature_key: signature,
      transaction_id: "trx-forged",
      transaction_status: "settlement",
      payment_type: "qris",
    };

    await assert.rejects(
      async () => {
        await midtransService.handleMidtransNotification(forgedPayload as any);
      },
      (err: any) => {
        assert.strictEqual(err.httpStatus, 400);
        assert.match(err.message, /Gross amount mismatch/i);
        return true;
      }
    );
  });

  await t.test("6. Webhook Settlement: Confirm Payment, Order, Tickets, and Seats", async () => {
    const statusCode = "200";
    const grossAmount = "50000.00";
    const signature = midtransService.generateMidtransSignature(
      testOrderNumber,
      statusCode,
      grossAmount,
      MIDTRANS_SERVER_KEY
    );

    const validPayload = {
      order_id: testOrderNumber,
      status_code: statusCode,
      gross_amount: grossAmount,
      signature_key: signature,
      transaction_id: `trx-qris-settled-${Date.now()}`,
      transaction_status: "settlement",
      payment_type: "qris",
    };

    const result = await midtransService.handleMidtransNotification(validPayload as any);
    assert.strictEqual(result.status, "SUCCESS");

    // Verify DB State
    const order = await prisma.order.findUnique({
      where: { id: testOrderId },
      include: {
        payments: true,
        tickets: {
          include: {
            showtimeSeat: true,
          },
        },
      },
    });

    assert.ok(order);
    assert.strictEqual(order.orderStatus, "PAID");
    assert.strictEqual(order.paymentStatus, "PAID");

    const payment = order.payments[0];
    assert.strictEqual(payment.status, "PAID");
    assert.ok(payment.paidAt !== null, "paidAt must be recorded");
    assert.strictEqual(payment.paymentType, "qris");

    const ticket = order.tickets[0];
    assert.strictEqual(ticket.status, "ACTIVE", "Ticket must become ACTIVE");
    assert.strictEqual(ticket.showtimeSeat.status, "SOLD", "Seat must become SOLD");
    assert.strictEqual(ticket.showtimeSeat.reservedUntil, null, "Hold reservation timer must be cleared");
  });

  await t.test("7. Webhook Idempotency: Duplicate settlement notification", async () => {
    const statusCode = "200";
    const grossAmount = "50000.00";
    const signature = midtransService.generateMidtransSignature(
      testOrderNumber,
      statusCode,
      grossAmount,
      MIDTRANS_SERVER_KEY
    );

    const validPayload = {
      order_id: testOrderNumber,
      status_code: statusCode,
      gross_amount: grossAmount,
      signature_key: signature,
      transaction_id: `trx-qris-settled-${Date.now()}`,
      transaction_status: "settlement",
      payment_type: "qris",
    };

    const result = await midtransService.handleMidtransNotification(validPayload as any);
    assert.strictEqual(result.status, "ALREADY_PROCESSED");

    // Ensure ticket count and payment count remained unchanged
    const ticketCount = await prisma.ticket.count({ where: { orderId: testOrderId } });
    assert.strictEqual(ticketCount, 1);
  });

  await t.test("8. Out-of-order Webhook: Stale pending cannot downgrade PAID order", async () => {
    const statusCode = "201";
    const grossAmount = "50000.00";
    const signature = midtransService.generateMidtransSignature(
      testOrderNumber,
      statusCode,
      grossAmount,
      MIDTRANS_SERVER_KEY
    );

    const stalePendingPayload = {
      order_id: testOrderNumber,
      status_code: statusCode,
      gross_amount: grossAmount,
      signature_key: signature,
      transaction_id: "trx-stale-pending",
      transaction_status: "pending",
      payment_type: "qris",
    };

    await midtransService.handleMidtransNotification(stalePendingPayload as any);

    const order = await prisma.order.findUnique({
      where: { id: testOrderId },
      include: { payments: true },
    });

    assert.strictEqual(order?.orderStatus, "PAID", "Order must remain PAID");
    assert.strictEqual(order?.payments[0].status, "PAID", "Payment must remain PAID");
  });

  await t.test("9. Webhook Expire / Cancel: Cancels Order and releases held seats", async () => {
    // Create new booking to test cancellation
    const booking2 = await bookingService.createGuestBooking({
      scheduleId: schedule.id,
      seatIds: [testSeat2.id],
      customerName: "Siti Rahma",
      customerPhone: "081233445566",
    });

    const orderId2 = booking2.order.id;
    const orderNum2 = booking2.order.orderNumber;

    // Generate QRIS
    await midtransService.createQrisCharge(orderId2);

    // Send 'expire' webhook
    const statusCode = "200";
    const grossAmount = "50000.00";
    const signature = midtransService.generateMidtransSignature(
      orderNum2,
      statusCode,
      grossAmount,
      MIDTRANS_SERVER_KEY
    );

    const expirePayload = {
      order_id: orderNum2,
      status_code: statusCode,
      gross_amount: grossAmount,
      signature_key: signature,
      transaction_id: `trx-qris-expired-${Date.now()}`,
      transaction_status: "expire",
      payment_type: "qris",
    };

    const cancelRes = await midtransService.handleMidtransNotification(expirePayload as any);
    assert.strictEqual(cancelRes.status, "CANCELLED");

    const order2 = await prisma.order.findUnique({
      where: { id: orderId2 },
      include: {
        payments: true,
        tickets: {
          include: { showtimeSeat: true },
        },
      },
    });

    assert.strictEqual(order2?.orderStatus, "CANCELLED");
    assert.strictEqual(order2?.paymentStatus, "FAILED");
    assert.strictEqual(order2?.tickets[0].status, "CANCELLED");
    assert.strictEqual(order2?.tickets[0].showtimeSeat.status, "AVAILABLE");
  });
});
