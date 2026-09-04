import AsyncStorage from "@react-native-async-storage/async-storage";

const RECENT_BOOKINGS_KEY = "planet_cinema_recent_bookings";
const LAST_PHONE_KEY = "planet_cinema_last_phone";

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
      if (ref.customerPhone) {
        await this.saveLastPhone(ref.customerPhone);
      }
      const existing = await this.getRecentBookings();
      const filtered = existing.filter((b) => b.orderId !== ref.orderId);
      const updated = [ref, ...filtered].slice(0, 10); // Keep last 10 bookings
      await AsyncStorage.setItem(RECENT_BOOKINGS_KEY, JSON.stringify(updated));
    } catch (e) {
      console.error("Failed to save booking reference", e);
    }
  },

  async getLastPhone(): Promise<string | null> {
    try {
      return await AsyncStorage.getItem(LAST_PHONE_KEY);
    } catch {
      return null;
    }
  },

  async saveLastPhone(phone: string): Promise<void> {
    try {
      if (phone?.trim()) {
        await AsyncStorage.setItem(LAST_PHONE_KEY, phone.trim());
      }
    } catch (e) {
      console.error("Failed to save last phone", e);
    }
  },
};
