import { Movie } from "./movie";
import { Showtime } from "./schedule";

export type RootStackParamList = {
  MainTabs: undefined;
  Movies: { initialFilter?: "NOW_SHOWING" | "COMING_SOON" };
  MovieDetail: { movieId: string };
  Showtime: { movie: Movie; selectedDate?: string };
  SeatSelection: { schedule: Showtime };
  BookingSummary: undefined;
  Payment: {
    orderId: string;
    qrUrl?: string;
    qrString?: string;
    amount?: number;
    expiredAt?: string;
    snapUrl?: string;
  };
  BookingSuccess: { orderId: string; bookingNumber: string };
  MyTickets: { autoQuery?: string };
};

export type MainTabParamList = {
  HomeTab: undefined;
  MoviesTab: undefined;
  MyTicketsTab: undefined;
};
