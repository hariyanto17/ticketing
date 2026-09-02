import AsyncStorage from "@react-native-async-storage/async-storage";

const RECENT_BOOKINGS_KEY = "planet_cinema_recent_bookings";

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

export const storageService = {
  async getRecentBookings(): Promise<StoredBookingRef[]> {
    try {
      const data = await AsyncStorage.getItem(RECENT_BOOKINGS_KEY);
      return data ? JSON.parse(data) : [];
    } catch {
      return [];
    }
  },

  async saveBookingRef(ref: StoredBookingRef): Promise<void> {
    try {
      const existing = await this.getRecentBookings();
      const filtered = existing.filter((b) => b.orderId !== ref.orderId);
      const updated = [ref, ...filtered].slice(0, 10); // Keep last 10 bookings
      await AsyncStorage.setItem(RECENT_BOOKINGS_KEY, JSON.stringify(updated));
    } catch (e) {
      console.error("Failed to save booking reference", e);
    }
  },
};
