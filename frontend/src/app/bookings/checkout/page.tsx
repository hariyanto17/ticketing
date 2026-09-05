"use client";

import React, { useState, useEffect, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import {
  useGetPublicSeatsQuery,
  useHoldPublicSeatsMutation,
  useReleasePublicSeatsMutation,
  useCreateBookingMutation,
  useGetPublicSchedulesQuery,
} from "@/services/bookingApi";
import { useToast } from "@/components/ui/toast";
import { Spinner } from "@/components/ui/spinner";
import { io } from "socket.io-client";
import { SOCKET_BASE_URL } from "@/lib/api/api";
import { ArrowLeft, User, Phone, Mail, Ticket, Monitor, Armchair, HelpCircle } from "lucide-react";
import Link from "next/link";
import { getVisualRowOrder, groupSeatsByRow } from "@/lib/seatLayout";
import { useTranslation } from "@/lib/i18n";

function GuestCheckout() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const scheduleId = searchParams.get("scheduleId") || "";

  const { data: seatsResponse, isLoading: seatsLoading, refetch } = useGetPublicSeatsQuery(scheduleId, {
    skip: !scheduleId,
  });

  const { data: schedulesResponse } = useGetPublicSchedulesQuery();
  const activeSchedule = schedulesResponse?.data?.find((s) => s.id === scheduleId);
  const ticketPrice = activeSchedule?.ticketPrice || 0;

  const [holdSeats] = useHoldPublicSeatsMutation();
  const [releaseSeats] = useReleasePublicSeatsMutation();
  const [createBooking, { isLoading: isSubmitting }] = useCreateBookingMutation();
  const { success: toastSuccess, error: toastError } = useToast();
  const { t, formatCurrency } = useTranslation();

  // Local selected seat IDs
  const [selectedSeatIds, setSelectedSeatIds] = useState<string[]>([]);

  // Guest Form info
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [customerEmail, setCustomerEmail] = useState("");

  // Socket.IO sync
  useEffect(() => {
    if (!scheduleId) return;

    const socket = io(SOCKET_BASE_URL, {
      transports: ["websocket", "polling"],
      reconnection: true,
      reconnectionAttempts: 10,
    });

    socket.on("seats_held", (data: any) => {
      if (data.showtimeId === scheduleId) refetch();
    });

    socket.on("seats_released", (data: any) => {
      if (data.showtimeId === scheduleId) refetch();
    });

    socket.on("seats_sold", (data: any) => {
      if (data.showtimeId === scheduleId) refetch();
    });

    return () => {
      socket.disconnect();
    };
  }, [scheduleId, refetch]);

  if (!scheduleId) {
    return (
      <div className="text-center py-20 bg-zinc-50 dark:bg-zinc-950 min-h-screen">
        <h2 className="text-xl font-bold">{t("booking.noSchedule")}</h2>
        <Link href="/" className="text-indigo-600 hover:underline mt-2 inline-block">Back to home</Link>
      </div>
    );
  }

  if (seatsLoading) {
    return (
      <div className="flex justify-center items-center min-h-screen bg-zinc-50 dark:bg-zinc-950">
        <Spinner className="w-12 h-12" />
      </div>
    );
  }

  const showtimeSeats = seatsResponse?.data || [];

  // Group seats by row and compute grid width
  const seatsByRow = groupSeatsByRow(showtimeSeats.map((s) => ({ ...s, row: s.seat.row })));

  const rows = getVisualRowOrder(Object.keys(seatsByRow));
  const maxColumn = showtimeSeats.length > 0 ? Math.max(...showtimeSeats.map((s) => s.seat.column)) : 12;

  const handleSeatClick = async (seat: typeof showtimeSeats[0]) => {
    const isSelected = selectedSeatIds.includes(seat.seatId);

    if (isSelected) {
      // Unselect
      try {
        await releaseSeats({ scheduleId, seatIds: [seat.seatId] }).unwrap();
        setSelectedSeatIds((prev) => prev.filter((id) => id !== seat.seatId));
      } catch (err: any) {
        toastError(err?.data?.message || t("errors.somethingWentWrong"));
      }
    } else {
      // Select
      if (seat.status === "SOLD") return;
      if (seat.status === "DISABLED") return;
      if (seat.status === "HOLD" && seat.reservedUntil && new Date(seat.reservedUntil) > new Date()) {
        toastError(t("booking.heldSeats"));
        return;
      }

      try {
        await holdSeats({ scheduleId, seatIds: [seat.seatId] }).unwrap();
        setSelectedSeatIds((prev) => [...prev, seat.seatId]);
      } catch (err: any) {
        toastError(err?.data?.message || t("errors.somethingWentWrong"));
      }
    }
  };

  const handleCheckoutSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedSeatIds.length === 0) {
      toastError(t("booking.selectSeat"));
      return;
    }

    try {
      const response = await createBooking({
        scheduleId,
        seatIds: selectedSeatIds,
        customerName,
        customerPhone,
        customerEmail,
      }).unwrap();

      toastSuccess(t("booking.checkoutSuccess"));
      router.push(`/bookings/success?orderId=${response.order.id}`);
    } catch (err: any) {
      toastError(err?.data?.message || t("booking.checkoutFailed"));
    }
  };

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 font-sans pb-20">
      {/* Header */}
      <header className="sticky top-0 z-40 w-full bg-white/80 dark:bg-zinc-900/80 backdrop-blur-md border-b border-zinc-150 dark:border-zinc-800">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button onClick={() => router.back()} className="p-2 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-xl cursor-pointer">
              <ArrowLeft className="w-5 h-5 text-zinc-600 dark:text-zinc-400" />
            </button>
            <span className="font-bold text-zinc-850 dark:text-zinc-200">{t("booking.seatSelection")}</span>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 mt-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
          {/* Seat Layout (Left) */}
          <div className="lg:col-span-2 bg-white dark:bg-zinc-900 border border-zinc-250 dark:border-zinc-800 rounded-3xl p-6 md:p-8 space-y-8 flex flex-col items-center">
            {/* Grid */}
            <div className="space-y-2.5 w-full overflow-x-auto pb-4 flex flex-col items-center">
              <div className="w-full max-w-md text-center space-y-2 mb-4">
                <div className="h-2 bg-zinc-250 dark:bg-zinc-800 rounded-full shadow-inner" />
                <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest block">{t("booking.screen")}</span>
              </div>
              {rows.map((row) => {
                // Build full row with possible nulls for aisles
                const cols = Array.from({ length: maxColumn }, (_, i) => i + 1);
                return (
                  <div key={row} className="flex gap-2 items-center justify-center min-w-[400px]">
                    <span className="w-6 text-xs font-bold text-zinc-400 text-center">{row}</span>
                    {cols.map((col) => {
                      const sSeat = seatsByRow[row].find((x) => x.seat.column === col) || null;
                      if (!sSeat) {
                        return <div key={`gap-${row}-${col}`} className="w-8 h-8" />;
                      }

                      const isSelected = selectedSeatIds.includes(sSeat.seatId);
                      const now = new Date();
                      const isHeld = sSeat.status === "HOLD" && sSeat.reservedUntil && new Date(sSeat.reservedUntil) > now;
                      const isSold = sSeat.status === "SOLD";
                      const isDisabled = sSeat.status === "DISABLED";

                      return (
                        <button
                          key={sSeat.id}
                          onClick={() => handleSeatClick(sSeat)}
                          disabled={isSold || isDisabled}
                          className={`w-8 h-8 rounded-xl flex items-center justify-center text-[10px] font-bold transition-all cursor-pointer select-none ${
                            isSelected
                              ? "bg-indigo-600 text-white"
                              : isSold
                              ? "bg-rose-100 dark:bg-rose-950/40 text-rose-500 cursor-not-allowed"
                              : isHeld
                              ? "bg-amber-100 text-amber-600"
                              : isDisabled
                              ? "bg-zinc-200 dark:bg-zinc-800 text-zinc-400 cursor-not-allowed"
                              : "bg-zinc-50 hover:bg-zinc-150 border border-zinc-250 text-zinc-800 dark:bg-zinc-950 dark:text-zinc-250 dark:border-zinc-800"
                          }`}
                        >
                          {sSeat.seat.column}
                        </button>
                      );
                    })}
                    <span className="w-6 text-xs font-bold text-zinc-400 text-center">{row}</span>
                  </div>
                );
              })}
            </div>

            {/* Legend */}
            <div className="flex flex-wrap gap-4 text-xs font-semibold justify-center pt-4 border-t border-zinc-100 dark:border-zinc-800 w-full">
              <div className="flex items-center gap-1.5">
                <div className="w-4 h-4 bg-zinc-50 border border-zinc-250 rounded-lg" />
                <span>{t("booking.available")}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-4 h-4 bg-indigo-600 rounded-lg" />
                <span>{t("booking.selected")}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-4 h-4 bg-amber-100 rounded-lg" />
                <span>{t("booking.held")}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-4 h-4 bg-rose-100 rounded-lg" />
                <span>{t("booking.sold")}</span>
              </div>
            </div>
          </div>

          {/* Form & Checkout Details (Right) */}
          <div className="space-y-6">
            <form onSubmit={handleCheckoutSubmit} className="bg-white dark:bg-zinc-900 border border-zinc-250 dark:border-zinc-800 rounded-3xl p-6 md:p-8 space-y-6">
              <h2 className="text-lg font-bold text-zinc-900 dark:text-zinc-50 flex items-center gap-2">
                <User className="w-5 h-5 text-indigo-600" /> {t("booking.guestInformation")}
              </h2>

              <div className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-zinc-500 uppercase tracking-wider block">{t("booking.fullName")}</label>
                  <div className="relative">
                    <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
                    <input
                      type="text"
                      placeholder="e.g. John Doe"
                      value={customerName}
                      onChange={(e) => setCustomerName(e.target.value)}
                      className="w-full pl-10 pr-4 py-2.5 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                      required
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-zinc-500 uppercase tracking-wider block">{t("booking.phoneNumber")}</label>
                  <div className="relative">
                    <Phone className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
                    <input
                      type="tel"
                      placeholder="e.g. 08123456789"
                      value={customerPhone}
                      onChange={(e) => setCustomerPhone(e.target.value)}
                      className="w-full pl-10 pr-4 py-2.5 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                      required
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-zinc-500 uppercase tracking-wider block">Email Address (Optional)</label>
                  <div className="relative">
                    <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
                    <input
                      type="email"
                      placeholder="e.g. john@example.com"
                      value={customerEmail}
                      onChange={(e) => setCustomerEmail(e.target.value)}
                      className="w-full pl-10 pr-4 py-2.5 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                    />
                  </div>
                </div>
              </div>

              {/* Booking Info snapshot */}
              <div className="p-4 bg-zinc-50 dark:bg-zinc-955/20 border border-zinc-150 dark:border-zinc-850 rounded-2xl space-y-2.5 text-xs">
                <div className="flex justify-between">
                  <span className="text-zinc-500 font-medium">Selected Seats:</span>
                  <span className="font-bold text-zinc-900 dark:text-zinc-50">
                    {selectedSeatIds.length > 0 ? selectedSeatIds.length : 0} seat(s)
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-zinc-500 font-medium">Subtotal Tiket:</span>
                  <span className="font-bold text-zinc-900 dark:text-zinc-50">
                    Rp {(ticketPrice * selectedSeatIds.length).toLocaleString()}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-zinc-500 font-medium">Biaya Layanan Online:</span>
                  <span className="font-bold text-zinc-900 dark:text-zinc-50">
                    Rp {selectedSeatIds.length > 0 ? (4000).toLocaleString() : "0"}
                  </span>
                </div>
                <div className="flex justify-between border-t border-zinc-100 dark:border-zinc-800 pt-2.5 text-sm">
                  <span className="font-semibold text-zinc-850">Estimated Total:</span>
                  <span className="font-extrabold text-indigo-600 dark:text-indigo-400">
                    Rp {selectedSeatIds.length > 0 ? (ticketPrice * selectedSeatIds.length + 4000).toLocaleString() : "0"}
                  </span>
                </div>
              </div>

              <button
                type="submit"
                disabled={isSubmitting || selectedSeatIds.length === 0}
                className="w-full py-3.5 bg-indigo-600 hover:bg-indigo-700 disabled:bg-zinc-300 text-white font-bold rounded-2xl cursor-pointer shadow-sm text-sm"
              >
                {isSubmitting ? <Spinner className="w-5 h-5 mx-auto" /> : "Reserve Seats & Checkout"}
              </button>
            </form>
          </div>
        </div>
      </main>
    </div>
  );
}

export default function GuestCheckoutPage() {
  return (
    <Suspense fallback={<div className="flex justify-center items-center min-h-screen bg-zinc-50 dark:bg-zinc-950"><Spinner className="w-12 h-12" /></div>}>
      <GuestCheckout />
    </Suspense>
  );
}
