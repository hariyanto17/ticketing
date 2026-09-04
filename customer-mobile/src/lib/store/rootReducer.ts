import { combineReducers } from "@reduxjs/toolkit";
import bookingReducer from "./features/booking/slice";
import ticketsReducer from "./features/tickets/slice";
import { baseApi } from "../api/baseApi";

export const rootReducer = combineReducers({
  booking: bookingReducer,
  tickets: ticketsReducer,
  [baseApi.reducerPath]: baseApi.reducer,
});

export type RootReducerState = ReturnType<typeof rootReducer>;
