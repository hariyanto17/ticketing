import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import { Movie } from "../../../../types/movie";
import { Showtime, ShowtimeSeat } from "../../../../types/schedule";

export interface BookingState {
  selectedMovie: Movie | null;
  selectedSchedule: Showtime | null;
  selectedSeats: ShowtimeSeat[];
  customerInfo: {
    name: string;
    phone: string;
    email: string;
  };
  reservedUntil: string | null;
}

const initialState: BookingState = {
  selectedMovie: null,
  selectedSchedule: null,
  selectedSeats: [],
  customerInfo: {
    name: "",
    phone: "",
    email: "",
  },
  reservedUntil: null,
};

export const bookingSlice = createSlice({
  name: "booking",
  initialState,
  reducers: {
    setSelectedMovie: (state, action: PayloadAction<Movie | null>) => {
      state.selectedMovie = action.payload;
    },
    setSelectedSchedule: (state, action: PayloadAction<Showtime | null>) => {
      state.selectedSchedule = action.payload;
      state.selectedSeats = [];
      state.reservedUntil = null;
    },
    toggleSeat: (state, action: PayloadAction<ShowtimeSeat>) => {
      const seat = action.payload;
      const exists = state.selectedSeats.some((s) => s.seatId === seat.seatId);
      if (exists) {
        state.selectedSeats = state.selectedSeats.filter((s) => s.seatId !== seat.seatId);
      } else {
        // Limit to max 6 seats per transaction
        if (state.selectedSeats.length < 6) {
          state.selectedSeats.push(seat);
        }
      }
    },
    setSelectedSeats: (state, action: PayloadAction<ShowtimeSeat[]>) => {
      state.selectedSeats = action.payload;
    },
    clearSelectedSeats: (state) => {
      state.selectedSeats = [];
      state.reservedUntil = null;
    },
    setCustomerInfo: (
      state,
      action: PayloadAction<Partial<{ name: string; phone: string; email: string }>>
    ) => {
      state.customerInfo = { ...state.customerInfo, ...action.payload };
    },
    setReservedUntil: (state, action: PayloadAction<string | null>) => {
      state.reservedUntil = action.payload;
    },
    resetBooking: () => initialState,
  },
});

export const {
  setSelectedMovie,
  setSelectedSchedule,
  toggleSeat,
  setSelectedSeats,
  clearSelectedSeats,
  setCustomerInfo,
  setReservedUntil,
  resetBooking,
} = bookingSlice.actions;

export default bookingSlice.reducer;
