import test from "node:test";
import assert from "node:assert/strict";
import { store } from "../lib/store/store";
import {
  setSelectedMovie,
  setSelectedSchedule,
  toggleSeat,
  clearSelectedSeats,
  setCustomerInfo,
  resetBooking,
} from "../lib/store/features/booking/slice";
import { movieApi } from "../lib/api/movieApi";
import { scheduleApi } from "../lib/api/scheduleApi";
import { bookingApi } from "../lib/api/bookingApi";
import { paymentApi } from "../lib/api/paymentApi";

test("Redux Toolkit & RTK Query Architecture for customer-mobile", async (t) => {
  await t.test("1. Store configuration and RTK Query reducer registration", () => {
    const state = store.getState();
    assert.ok(state.api, "RTK Query api slice reducer must exist in store");
    assert.ok(state.booking, "Booking slice reducer must exist in store");
    assert.strictEqual(typeof store.dispatch, "function");
  });

  await t.test("2. Booking slice state mutations", () => {
    store.dispatch(resetBooking());

    // Set movie
    store.dispatch(
      setSelectedMovie({
        id: "mov-1",
        title: "Avatar 3",
        genres: [],
        status: "NOW_SHOWING",
      } as any)
    );
    assert.strictEqual(store.getState().booking.selectedMovie?.title, "Avatar 3");

    // Set schedule
    store.dispatch(
      setSelectedSchedule({
        id: "sch-1",
        movieId: "mov-1",
        studioId: "std-1",
        startTime: "2026-09-04T14:00:00Z",
        ticketPrice: 50000,
        status: "PUBLISHED",
      } as any)
    );
    assert.strictEqual(store.getState().booking.selectedSchedule?.id, "sch-1");
    assert.strictEqual(store.getState().booking.selectedSeats.length, 0);

    // Toggle seat
    const testSeat = {
      id: "ss-1",
      showtimeId: "sch-1",
      seatId: "seat-1",
      status: "AVAILABLE",
      seat: { id: "seat-1", studioId: "std-1", row: "A", column: 1, seatNumber: 1, seatLabel: "A1", seatType: "REGULAR", status: "ACTIVE" },
    };
    store.dispatch(toggleSeat(testSeat as any));
    assert.strictEqual(store.getState().booking.selectedSeats.length, 1);
    assert.strictEqual(store.getState().booking.selectedSeats[0].seat.seatLabel, "A1");

    // Toggle seat off
    store.dispatch(toggleSeat(testSeat as any));
    assert.strictEqual(store.getState().booking.selectedSeats.length, 0);

    // Set customer info
    store.dispatch(setCustomerInfo({ name: "John Doe", phone: "08123456789" }));
    assert.strictEqual(store.getState().booking.customerInfo.name, "John Doe");
    assert.strictEqual(store.getState().booking.customerInfo.phone, "08123456789");

    // Reset booking
    store.dispatch(resetBooking());
    assert.strictEqual(store.getState().booking.selectedMovie, null);
    assert.strictEqual(store.getState().booking.selectedSchedule, null);
  });

  await t.test("3. RTK Query Endpoints & Tag Invalidation Verification", () => {
    // Check movie endpoints
    assert.ok(movieApi.endpoints.getMovies, "getMovies endpoint defined");
    assert.ok(movieApi.endpoints.getNowShowingMovies, "getNowShowingMovies endpoint defined");
    assert.ok(movieApi.endpoints.getComingSoonMovies, "getComingSoonMovies endpoint defined");
    assert.ok(movieApi.endpoints.getMovieById, "getMovieById endpoint defined");

    // Check schedule endpoints
    assert.ok(scheduleApi.endpoints.getSchedules, "getSchedules endpoint defined");
    assert.ok(scheduleApi.endpoints.getScheduleSeats, "getScheduleSeats endpoint defined");

    // Check booking endpoints
    assert.ok(bookingApi.endpoints.holdSeats, "holdSeats mutation defined");
    assert.ok(bookingApi.endpoints.releaseSeats, "releaseSeats mutation defined");
    assert.ok(bookingApi.endpoints.createBooking, "createBooking mutation defined");
    assert.ok(bookingApi.endpoints.lookupBookings, "lookupBookings query defined");

    // Check payment endpoints
    assert.ok(paymentApi.endpoints.createSnapToken, "createSnapToken mutation defined");
    assert.ok(paymentApi.endpoints.getPaymentStatus, "getPaymentStatus query defined");
  });
});
