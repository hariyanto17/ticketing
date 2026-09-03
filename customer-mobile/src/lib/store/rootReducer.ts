import { combineReducers } from "@reduxjs/toolkit";
import bookingReducer from "./features/booking/slice";
import { baseApi } from "../api/baseApi";

export const rootReducer = combineReducers({
  booking: bookingReducer,
  [baseApi.reducerPath]: baseApi.reducer,
});

export type RootReducerState = ReturnType<typeof rootReducer>;
