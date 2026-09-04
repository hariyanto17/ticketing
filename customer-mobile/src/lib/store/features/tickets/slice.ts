import { createSlice, PayloadAction } from "@reduxjs/toolkit";

export interface StoredBookingRef {
  orderId: string;
  orderNumber: string;
  bookingNumber?: string | null;
  customerPhone: string;
  movieTitle: string;
  studioName: string;
  startTime: string;
  seatLabels: string[];
  createdAt: string;
}

export interface TicketsState {
  recentBookings: StoredBookingRef[];
  lastCustomerPhone: string;
  lastCustomerName: string;
  lastCustomerEmail: string;
}

const initialState: TicketsState = {
  recentBookings: [],
  lastCustomerPhone: "",
  lastCustomerName: "",
  lastCustomerEmail: "",
};

export const ticketsSlice = createSlice({
  name: "tickets",
  initialState,
  reducers: {
    addRecentBooking: (state, action: PayloadAction<StoredBookingRef>) => {
      const ref = action.payload;
      if (ref.customerPhone) {
        state.lastCustomerPhone = ref.customerPhone;
      }
      state.recentBookings = [
        ref,
        ...state.recentBookings.filter((b) => b.orderId !== ref.orderId),
      ].slice(0, 10);
    },
    setLastCustomerInfo: (
      state,
      action: PayloadAction<{ phone?: string; name?: string; email?: string }>
    ) => {
      if (action.payload.phone !== undefined) state.lastCustomerPhone = action.payload.phone;
      if (action.payload.name !== undefined) state.lastCustomerName = action.payload.name;
      if (action.payload.email !== undefined) state.lastCustomerEmail = action.payload.email;
    },
    clearRecentBookings: (state) => {
      state.recentBookings = [];
    },
  },
});

export const { addRecentBooking, setLastCustomerInfo, clearRecentBookings } = ticketsSlice.actions;

export default ticketsSlice.reducer;
