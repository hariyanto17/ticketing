import React, { createContext, useContext, useState } from "react";
import { Showtime, ShowtimeSeat } from "../types/schedule";

interface CustomerInfo {
  name: string;
  phone: string;
  email: string;
}

interface BookingContextType {
  selectedSchedule: Showtime | null;
  setSelectedSchedule: (schedule: Showtime | null) => void;
  selectedSeats: ShowtimeSeat[];
  setSelectedSeats: React.Dispatch<React.SetStateAction<ShowtimeSeat[]>>;
  toggleSeat: (seat: ShowtimeSeat) => boolean;
  clearSelectedSeats: () => void;
  customerInfo: CustomerInfo;
  setCustomerInfo: React.Dispatch<React.SetStateAction<CustomerInfo>>;
  reservedUntil: Date | null;
  setReservedUntil: (date: Date | null) => void;
  resetBooking: () => void;
  ticketSubtotal: number;
  serviceFee: number;
  estimatedTotal: number;
}

const BookingContext = createContext<BookingContextType | undefined>(undefined);

export const BookingProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [selectedSchedule, setSelectedSchedule] = useState<Showtime | null>(null);
  const [selectedSeats, setSelectedSeats] = useState<ShowtimeSeat[]>([]);
  const [customerInfo, setCustomerInfo] = useState<CustomerInfo>({
    name: "",
    phone: "",
    email: "",
  });
  const [reservedUntil, setReservedUntil] = useState<Date | null>(null);

  const toggleSeat = (showtimeSeat: ShowtimeSeat): boolean => {
    const isSelected = selectedSeats.some((s) => s.seatId === showtimeSeat.seatId);
    if (isSelected) {
      setSelectedSeats((prev) => prev.filter((s) => s.seatId !== showtimeSeat.seatId));
      return false;
    } else {
      if (selectedSeats.length >= 8) {
        return false; // Max 8 seats limit per transaction
      }
      setSelectedSeats((prev) => [...prev, showtimeSeat]);
      return true;
    }
  };

  const clearSelectedSeats = () => {
    setSelectedSeats([]);
    setReservedUntil(null);
  };

  const resetBooking = () => {
    setSelectedSchedule(null);
    setSelectedSeats([]);
    setCustomerInfo({ name: "", phone: "", email: "" });
    setReservedUntil(null);
  };

  const ticketSubtotal = (selectedSchedule?.ticketPrice || 0) * selectedSeats.length;
  const serviceFee = selectedSeats.length > 0 ? 4000 : 0;
  const estimatedTotal = selectedSeats.length > 0 ? ticketSubtotal + serviceFee : 0;

  return (
    <BookingContext.Provider
      value={{
        selectedSchedule,
        setSelectedSchedule,
        selectedSeats,
        setSelectedSeats,
        toggleSeat,
        clearSelectedSeats,
        customerInfo,
        setCustomerInfo,
        reservedUntil,
        setReservedUntil,
        resetBooking,
        ticketSubtotal,
        serviceFee,
        estimatedTotal,
      }}
    >
      {children}
    </BookingContext.Provider>
  );
};

export const useBooking = () => {
  const context = useContext(BookingContext);
  if (!context) {
    throw new Error("useBooking must be used within a BookingProvider");
  }
  return context;
};
