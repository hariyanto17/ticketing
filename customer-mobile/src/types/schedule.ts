import { Movie } from "./movie";

export interface Studio {
  id: string;
  branchId: string;
  name: string;
  code: string;
  capacity: number;
  type: "REGULAR" | "PREMIERE" | "VIP";
  status: "ACTIVE" | "MAINTENANCE" | "CLOSED";
}

export interface Seat {
  id: string;
  studioId: string;
  row: string;
  column: number;
  seatNumber: number;
  seatLabel: string;
  seatType: "REGULAR" | "VIP" | "COUPLE" | "WHEELCHAIR";
  status: "ACTIVE" | "DISABLED";
}

export interface ShowtimeSeat {
  id: string;
  showtimeId: string;
  seatId: string;
  status: "AVAILABLE" | "HOLD" | "SOLD" | "DISABLED";
  reservedUntil?: string | null;
  ticketId?: string | null;
  seat: Seat;
}

export interface Showtime {
  id: string;
  movieId: string;
  studioId: string;
  businessDate: string;
  startTime: string;
  endTime?: string | null;
  ticketPrice: number;
  status: "DRAFT" | "PUBLISHED" | "CLOSED";
  movie?: Movie;
  studio?: Studio;
}
