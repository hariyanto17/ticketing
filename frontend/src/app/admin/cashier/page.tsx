"use client";

import React, { useState, useEffect } from "react";
import { useGetMoviesQuery, Movie } from "@/services/movieApi";
import { useGetSchedulesQuery, useGetScheduleSeatsQuery, useHoldSeatsMutation, useReleaseSeatsMutation, Schedule, ShowtimeSeat } from "@/services/studioApi";
import { useCheckoutOrderMutation } from "@/services/orderApi";
import { useToast } from "@/components/ui/toast";
import { Button, SearchableSelect } from "@/components/ui/form-controls";
import { Spinner } from "@/components/ui/spinner";
import { getVisualRowOrder, groupSeatsByRow } from "@/lib/seatLayout";
import { Film, Clock, Armchair, Ticket, Check, Receipt, Printer, X } from "lucide-react";
import { Modal } from "@/components/ui/modal";
import { io } from "socket.io-client";
import Link from "next/link";
import { useGetActiveDrawerQuery, useOpenDrawerMutation, useCloseDrawerMutation } from "@/services/opsApi";
import { createPrinterAgentClient, getPrinterAgentDeviceId } from "@/services/printerAgentClient";
import { useTranslation } from "@/lib/i18n";

const getRowIndex = (row: string): number => {
  let index = 0;
  for (let i = 0; i < row.length; i++) {
    index = index * 26 + (row.charCodeAt(i) - 64);
  }
  return index - 1;
};

export default function CashierWorkspace() {
  const { success: toastSuccess, error: toastError } = useToast();
  const { t, formatDate, formatCurrency } = useTranslation();

  // Cash drawer hooks & local state
  const { data: activeDrawer, isLoading: drawerLoading } = useGetActiveDrawerQuery();
  const [openDrawer, { isLoading: isOpeningDrawer }] = useOpenDrawerMutation();
  const [closeDrawer, { isLoading: isClosingDrawer }] = useCloseDrawerMutation();
  const [drawerOpeningBalance, setDrawerOpeningBalance] = useState<number>(0);
  const [drawerActualBalance, setDrawerActualBalance] = useState<number>(0);
  const [isCloseDrawerModalOpen, setIsCloseDrawerModalOpen] = useState(false);
  const [drawerSummary, setDrawerSummary] = useState<any | null>(null);

  // Selected state
  const [selectedMovie, setSelectedMovie] = useState<Movie | null>(null);
  const [selectedSchedule, setSelectedSchedule] = useState<Schedule | null>(null);
  const [selectedSeats, setSelectedSeats] = useState<ShowtimeSeat[]>([]);

  // Checkout states
  const [paymentMethod, setPaymentMethod] = useState<"CASH" | "QRIS">("CASH");
  const [amountReceived, setAmountReceived] = useState<number | "">("");
  const [isSuccessModalOpen, setIsSuccessModalOpen] = useState(false);
  const [checkoutResult, setCheckoutResult] = useState<any | null>(null);
  const [isPrinting, setIsPrinting] = useState(false);

  // Queries
  const { data: moviesResponse, isLoading: moviesLoading, error: moviesError } = useGetMoviesQuery({
    status: "NOW_SHOWING",
    hasSchedule: true,
    limit: 100,
  });
  const { data: schedulesResponse, isLoading: schedulesLoading } = useGetSchedulesQuery(
    { movieId: selectedMovie?.id || undefined, status: "PUBLISHED" },
    { skip: !selectedMovie }
  );

  const { data: seatsResponse, isLoading: seatsLoading, refetch: refetchSeats } = useGetScheduleSeatsQuery(
    selectedSchedule?.id || "",
    { skip: !selectedSchedule }
  );

  // Mutations
  const [holdSeats] = useHoldSeatsMutation();
  const [releaseSeats] = useReleaseSeatsMutation();
  const [checkoutOrder, { isLoading: isCheckingOut }] = useCheckoutOrderMutation();

  // Socket.IO synchronization
  useEffect(() => {
    if (!selectedSchedule) return;

    // Connect to backend Socket.IO server
    const socket = io("http://localhost:3000");

    socket.on("seats_held", (data: any) => {
      if (data.showtimeId === selectedSchedule.id) {
        refetchSeats();
      }
    });

    socket.on("seats_released", (data: any) => {
      if (data.showtimeId === selectedSchedule.id) {
        refetchSeats();
      }
    });

    socket.on("seats_sold", (data: any) => {
      if (data.showtimeId === selectedSchedule.id) {
        refetchSeats();
      }
    });

    return () => {
      socket.disconnect();
    };
  }, [selectedSchedule, refetchSeats]);

  useEffect(() => {
    if (moviesError) {
      toastError(t("cashier.loadFailed"));
    }
  }, [moviesError, toastError]);

  // When movie changes, reset downstream selections
  const handleMovieSelect = (movie: Movie | null) => {
    setSelectedMovie(movie);
    setSelectedSchedule(null);
    setSelectedSeats([]);
  };

  // When schedule changes, reset seat selections
  const handleScheduleSelect = (sched: Schedule) => {
    setSelectedSchedule(sched);
    setSelectedSeats([]);
  };

  // Toggle seat selection
  const handleSeatClick = async (seat: ShowtimeSeat) => {
    if (seat.status === "SOLD" || seat.status === "DISABLED") return;

    const isAlreadySelected = selectedSeats.some((s) => s.id === seat.id);

    try {
      if (isAlreadySelected) {
        // Release hold on backend
        await releaseSeats({ scheduleId: selectedSchedule!.id, seatIds: [seat.seatId] }).unwrap();
        setSelectedSeats((prev) => prev.filter((s) => s.id !== seat.id));
      } else {
        // Hold seat on backend
        await holdSeats({ scheduleId: selectedSchedule!.id, seatIds: [seat.seatId] }).unwrap();
        setSelectedSeats((prev) => [...prev, seat]);
      }
    } catch (err: any) {
      toastError(err?.data?.message || t("cashier.checkoutFailed"));
    }
  };

  // Clear all selections
  const handleClearSelection = async () => {
    setSelectedSeats([]);
  };

  const handleOpenDrawerSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await openDrawer({ openingBalance: drawerOpeningBalance }).unwrap();
      toastSuccess(t("cashier.drawerOpened"));
    } catch (err: any) {
      toastError(err?.data?.message || t("cashier.drawerFailed"));
    }
  };

  const handleCloseDrawerSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const summary = await closeDrawer({ actualBalance: drawerActualBalance }).unwrap();
      setDrawerSummary(summary);
      setIsCloseDrawerModalOpen(false);
      toastSuccess(t("cashier.drawerClosed"));
    } catch (err: any) {
      toastError(err?.data?.message || t("cashier.drawerFailed"));
    }
  };

  // Calculations
  const ticketPrice = selectedSchedule?.ticketPrice || 0;
  const quantity = selectedSeats.length;
  const totalAmount = quantity * ticketPrice;
  const change = amountReceived !== "" && Number(amountReceived) >= totalAmount ? Number(amountReceived) - totalAmount : 0;

  const handleCheckoutSubmit = async () => {
    if (!selectedSchedule || selectedSeats.length === 0) return;

    if (paymentMethod === "CASH") {
      if (amountReceived === "" || Number(amountReceived) < totalAmount) {
        toastError(t("cashier.amountError"));
        return;
      }
    }

    try {
      const response = await checkoutOrder({
        scheduleId: selectedSchedule.id,
        seatIds: selectedSeats.map((s) => s.seatId),
        paymentMethod,
        amountReceived: paymentMethod === "CASH" ? Number(amountReceived) : null,
      }).unwrap();

      setCheckoutResult(response.data);
      setIsSuccessModalOpen(true);
      toastSuccess(t("cashier.transactionSuccess"));

      // Clear selections
      setSelectedSeats([]);
      setAmountReceived("");
    } catch (err: any) {
      toastError(err?.data?.message || t("cashier.checkoutFailed"));
    }
  };

  const handlePrintTickets = async () => {
    const order = checkoutResult?.order;
    const tickets = checkoutResult?.tickets;
    if (!order || !selectedSchedule || !tickets?.length) {
      toastError("Data tiket belum tersedia untuk dicetak.");
      return;
    }

    if (!getPrinterAgentDeviceId()) {
      toastError("Printer agent belum terhubung ke perangkat ini.");
      return;
    }

    try {
      setIsPrinting(true);
      const client = createPrinterAgentClient();
      const startTime = new Date(selectedSchedule.startTime).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
      const showDate = new Date(selectedSchedule.businessDate).toLocaleDateString("en-CA");
      const price = order.totalAmount / tickets.length;

      for (const ticket of tickets) {
        await client.printTicket({
          mode: "print",
          ticketNumber: ticket.ticketNumber,
          orderNumber: order.orderNumber,
          movie: selectedSchedule.movie.title,
          studio: `${selectedSchedule.studio.name} (${selectedSchedule.studio.code})`,
          showDate,
          showTime: startTime,
          seat: ticket.showtimeSeat?.seat?.seatLabel || "TBD",
          price,
          totalAmount: order.totalAmount,
          qrCode: ticket.qrCode,
          customerName: order.customerName || undefined,
        });
      }

      toastSuccess(`${tickets.length} tiket berhasil dikirim ke printer.`);
    } catch (error: any) {
      toastError(error?.message || "Gagal mencetak tiket melalui printer agent.");
    } finally {
      setIsPrinting(false);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 font-sans items-start">

      {/* LEFT PANEL: SELECTORS & SEAT MAP */}
      <div className="lg:col-span-8 space-y-6">

        {/* Movie Selector */}
        <div className="p-6 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl space-y-4">
          <h2 className="text-lg font-bold text-zinc-900 dark:text-zinc-50 flex items-center gap-2">
            <Film className="w-5 h-5 text-indigo-600" /> {t("cashier.movie")}
          </h2>

          {moviesLoading ? (
            <div className="flex justify-center py-6"><Spinner className="w-8 h-8" /></div>
          ) : moviesResponse?.data?.length === 0 ? (
            <p className="text-sm text-zinc-400 italic">{t("cashier.noMovies")}</p>
          ) : (
            <div className="max-w-md">
              <SearchableSelect
                label={t("cashier.movie")}
                value={selectedMovie?.id || ""}
                onChange={(movieId) => {
                  if (!movieId) {
                    handleMovieSelect(null);
                    return;
                  }

                  const movie = moviesResponse?.data?.find((item) => item.id === movieId) || null;
                  handleMovieSelect(movie);
                }}
                options={(moviesResponse?.data || []).map((movie) => ({
                  value: movie.id,
                  label: movie.title,
                  searchText: movie.censorshipRating,
                }))}
                placeholder={t("cashier.movie")}
                searchPlaceholder={t("cashier.movie")}
                clearable
              />
            </div>
          )}
        </div>

        {/* Schedule Selector */}
        {selectedMovie && (
          <div className="p-6 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl space-y-4">
            <h2 className="text-lg font-bold text-zinc-900 dark:text-zinc-50 flex items-center gap-2">
              <Clock className="w-5 h-5 text-emerald-600" /> {t("cashier.schedule")}
            </h2>
            {schedulesLoading ? (
              <div className="flex justify-center py-6"><Spinner className="w-8 h-8" /></div>
            ) : schedulesResponse?.data?.length === 0 ? (
              <p className="text-zinc-400 text-sm">{t("cashier.noSchedules")}</p>
            ) : (
              <div className="flex flex-wrap gap-2.5">
                {schedulesResponse?.data?.map((sched) => {
                  const start = new Date(sched.startTime).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
                  const date = new Date(sched.businessDate).toLocaleDateString([], { month: "short", day: "numeric" });
                  return (
                    <button
                      key={sched.id}
                      onClick={() => handleScheduleSelect(sched)}
                      className={`px-4 py-3 rounded-2xl border text-sm font-semibold transition-all cursor-pointer flex items-center gap-2 ${selectedSchedule?.id === sched.id
                          ? "border-emerald-600 bg-emerald-50/30 dark:bg-emerald-950/20 text-emerald-600 dark:text-emerald-400"
                          : "border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 hover:border-zinc-300"
                        }`}
                    >
                      <Clock className="w-4 h-4" />
                      <span>{start}</span>
                      <span className="text-xs opacity-60">({date})</span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Interactive Seat Map */}
        {selectedSchedule && (
          <div className="p-8 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl flex flex-col items-center">
            <h2 className="text-lg font-bold text-zinc-900 dark:text-zinc-50 flex items-center gap-2 self-start mb-6">
              <Armchair className="w-5 h-5 text-amber-500" /> {t("cashier.seatLayout")}
            </h2>

            {seatsLoading ? (
              <Spinner className="w-8 h-8 py-10" />
            ) : (
              <div className="w-full flex flex-col items-center">
                {/* Seat Grid */}
                {(() => {
                  const showtimeSeats = seatsResponse?.data || [];
                  const seatsByRow = groupSeatsByRow(showtimeSeats.map((s) => ({ ...s, row: s.seat.row })));
                  const rows = getVisualRowOrder(Object.keys(seatsByRow));
                  const maxColumn = showtimeSeats.length > 0 ? Math.max(...showtimeSeats.map((s) => s.seat.column)) : 12;
                  const cols = Array.from({ length: maxColumn }, (_, i) => i + 1);

                  return (
                    <div className="grid gap-2.5 overflow-x-auto w-full pb-4">
                      <div className="w-full max-w-md bg-zinc-200 dark:bg-zinc-800 text-zinc-400 dark:text-zinc-500 text-center py-1.5 rounded-b-2xl font-bold tracking-widest text-[10px] uppercase mb-4">
                        {t("cashier.screen")}
                      </div>
                      {rows.map((row) => (
                        <div key={row} className="flex gap-2.5 items-center justify-center min-w-[400px]">
                          <span className="w-6 text-center font-bold text-zinc-400 text-xs">{row}</span>
                          {cols.map((col) => {
                            const seat = seatsByRow[row]?.find((x) => x.seat.column === col) || null;
                            if (!seat) {
                              return <div key={`gap-${row}-${col}`} className="w-9 h-9" />;
                            }

                            const isSelected = selectedSeats.some((s) => s.id === seat.id);
                            const isHold = seat.status === "HOLD" && !isSelected;

                            // Determine colors
                            let seatColor = "bg-emerald-600 hover:bg-emerald-700 text-white cursor-pointer"; // AVAILABLE
                            if (seat.status === "DISABLED") seatColor = "bg-zinc-200 dark:bg-zinc-800 text-zinc-400 dark:text-zinc-650 cursor-not-allowed";
                            else if (seat.status === "SOLD") seatColor = "bg-rose-500 text-white cursor-not-allowed";
                            else if (isHold) seatColor = "bg-amber-400 text-white cursor-not-allowed";
                            else if (isSelected) seatColor = "bg-indigo-600 hover:bg-indigo-700 text-white ring-4 ring-indigo-500/20";

                            return (
                              <button
                                key={seat.id}
                                onClick={() => handleSeatClick(seat)}
                                disabled={seat.status === "SOLD" || seat.status === "DISABLED" || isHold}
                                className={`w-9 h-9 rounded-xl text-[10px] font-bold border transition-all flex items-center justify-center ${seatColor}`}
                              >
                                {seat.seat.seatLabel}
                              </button>
                            );
                          })}
                          <span className="w-6 text-center font-bold text-zinc-400 text-xs">{row}</span>
                        </div>
                      ))}
                    </div>
                  );
                })()}

                {/* Legend */}
                <div className="flex flex-wrap gap-4 justify-center mt-10 pt-4 border-t border-zinc-100 dark:border-zinc-800 w-full max-w-md text-[11px] font-semibold text-zinc-400">
                  <div className="flex items-center gap-1.5"><div className="w-3.5 h-3.5 bg-emerald-600 rounded-sm" /> {t("cashier.available")}</div>
                  <div className="flex items-center gap-1.5"><div className="w-3.5 h-3.5 bg-amber-400 rounded-sm" /> {t("cashier.hold")}</div>
                  <div className="flex items-center gap-1.5"><div className="w-3.5 h-3.5 bg-rose-500 rounded-sm" /> {t("cashier.sold")}</div>
                  <div className="flex items-center gap-1.5"><div className="w-3.5 h-3.5 bg-indigo-600 rounded-sm" /> {t("cashier.selected")}</div>
                  <div className="flex items-center gap-1.5"><div className="w-3.5 h-3.5 bg-zinc-200 dark:bg-zinc-800 rounded-sm" /> {t("cashier.disabled")}</div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* RIGHT PANEL: BILLING & CHECKOUT */}
      <div className="lg:col-span-4 p-6 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl space-y-6">
        <div className="border-b border-zinc-100 dark:border-zinc-800 pb-5 space-y-3">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="text-sm font-bold text-zinc-900 dark:text-zinc-50">Cash Drawer</h2>
              <p className="text-xs text-zinc-400 mt-1">
                {drawerLoading
                  ? "Checking drawer status..."
                  : activeDrawer
                    ? `Opened with ${formatCurrency(activeDrawer.openingBalance)}`
                    : "Open a drawer before processing checkout."}
              </p>
            </div>
            <span className={`text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full ${activeDrawer
              ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400"
              : "bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400"
              }`}>
              {activeDrawer ? "Open" : "Closed"}
            </span>
          </div>

          {activeDrawer ? (
            <button
              type="button"
              onClick={() => setIsCloseDrawerModalOpen(true)}
              className="w-full px-3 py-2 border border-rose-200 dark:border-rose-900/50 text-rose-600 dark:text-rose-400 rounded-xl text-xs font-bold hover:bg-rose-50 dark:hover:bg-rose-950/20"
            >
              Close Cash Drawer
            </button>
          ) : (
            <form onSubmit={handleOpenDrawerSubmit} className="space-y-2">
              <label className="text-xs font-semibold text-zinc-500">Opening Balance (IDR)</label>
              <div className="flex gap-2">
                <input
                  type="number"
                  min="0"
                  value={drawerOpeningBalance}
                  onChange={(e) => setDrawerOpeningBalance(Number(e.target.value))}
                  className="min-w-0 flex-1 px-3 py-2 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl text-sm font-semibold"
                />
                <button
                  type="submit"
                  disabled={isOpeningDrawer || drawerLoading}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:bg-zinc-300 text-white rounded-xl text-xs font-bold"
                >
                  {isOpeningDrawer ? "Opening..." : "Open Drawer"}
                </button>
              </div>
            </form>
          )}
        </div>

        <h2 className="text-xl font-bold text-zinc-900 dark:text-zinc-50 border-b border-zinc-100 dark:border-zinc-800 pb-4 flex items-center gap-2">
          <Ticket className="w-5.5 h-5.5 text-indigo-600" /> {t("cashier.summary")}
        </h2>

        {/* Selected Movie details */}
        {selectedMovie ? (
          <div className="space-y-1">
            <h3 className="font-bold text-zinc-900 dark:text-zinc-50 text-sm leading-tight">{selectedMovie.title}</h3>
            {selectedSchedule && (
              <p className="text-xs text-zinc-400 flex items-center gap-1">
                <span>{selectedSchedule.studio.name} ({selectedSchedule.studio.code})</span>
                <span>•</span>
                <span>{new Date(selectedSchedule.startTime).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
              </p>
            )}
          </div>
        ) : (
          <p className="text-sm text-zinc-400">{t("cashier.selectPrompt")}</p>
        )}

        {/* Seats List */}
        <div className="space-y-2">
          <div className="flex justify-between text-xs font-semibold text-zinc-400">
            <span>{t("cashier.seatsSelected")} ({quantity})</span>
            {quantity > 0 && (
              <button onClick={handleClearSelection} className="text-rose-500 hover:underline cursor-pointer">
                {t("cashier.clear")}
              </button>
            )}
          </div>
          {quantity > 0 ? (
            <div className="flex flex-wrap gap-1.5">
              {selectedSeats.map((s) => (
                <span
                  key={s.id}
                  className="px-2.5 py-1 bg-zinc-50 dark:bg-zinc-950 border border-zinc-150 dark:border-zinc-850 rounded-xl text-xs font-bold text-zinc-800 dark:text-zinc-200"
                >
                  {s.seat.seatLabel}
                </span>
              ))}
            </div>
          ) : (
            <p className="text-xs text-zinc-400 italic">{t("cashier.noSeats")}</p>
          )}
        </div>

        {/* Pricing Math */}
        <div className="border-t border-b border-zinc-100 dark:border-zinc-800 py-4 space-y-2">
          <div className="flex justify-between text-sm text-zinc-500">
            <span>{t("cashier.ticketPrice")}</span>
            <span>Rp {ticketPrice.toLocaleString()}</span>
          </div>
          <div className="flex justify-between text-sm text-zinc-500">
            <span>{t("cashier.quantity")}</span>
            <span>x{quantity}</span>
          </div>
          <div className="flex justify-between text-base font-bold text-zinc-900 dark:text-zinc-50 pt-1">
            <span>{t("cashier.total")}</span>
            <span>Rp {totalAmount.toLocaleString()}</span>
          </div>
        </div>

        {/* Payment Configuration */}
        {quantity > 0 && (
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-xs font-bold text-zinc-400 uppercase tracking-wider">{t("cashier.paymentMethod")}</label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => setPaymentMethod("CASH")}
                  className={`py-2 text-xs font-bold rounded-xl border cursor-pointer transition-all ${paymentMethod === "CASH"
                      ? "border-indigo-600 bg-indigo-50/20 text-indigo-600 dark:text-indigo-400 font-bold"
                      : "border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-zinc-500 hover:border-zinc-300"
                    }`}
                >
                  CASH / TUNAI
                </button>
                <button
                  onClick={() => setPaymentMethod("QRIS")}
                  className={`py-2 text-xs font-bold rounded-xl border cursor-pointer transition-all ${paymentMethod === "QRIS"
                      ? "border-indigo-600 bg-indigo-50/20 text-indigo-600 dark:text-indigo-400 font-bold"
                      : "border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-zinc-500 hover:border-zinc-300"
                    }`}
                >
                  QRIS CODE
                </button>
              </div>
            </div>

            {/* CASH Payment UI details */}
            {paymentMethod === "CASH" && (
              <div className="space-y-3.5">
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-semibold text-zinc-500">{t("cashier.amountReceived")}</label>
                  <input
                    type="number"
                    value={amountReceived}
                    onChange={(e) => setAmountReceived(e.target.value === "" ? "" : Number(e.target.value))}
                    placeholder={t("cashier.cashPlaceholder")}
                    className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl text-sm font-semibold text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                  />
                </div>
                {/* Change calculator representation */}
                <div className="flex justify-between text-sm font-semibold p-3 bg-zinc-50 dark:bg-zinc-950 border border-zinc-150 dark:border-zinc-850 rounded-2xl">
                  <span className="text-zinc-500">{t("cashier.change")}</span>
                  <span className={change > 0 ? "text-indigo-600 dark:text-indigo-400 font-bold" : "text-zinc-400"}>
                    Rp {change.toLocaleString()}
                  </span>
                </div>
              </div>
            )}

            {/* QRIS Simulated QR Display */}
            {paymentMethod === "QRIS" && (
              <div className="p-4 bg-zinc-50 dark:bg-zinc-950 border border-zinc-150 dark:border-zinc-850 rounded-2xl flex flex-col items-center gap-2">
                <div className="w-32 h-32 bg-white p-2 rounded-xl border border-zinc-200 flex items-center justify-center">
                  {/* Simplistic mock QR code layout */}
                  <div className="grid grid-cols-4 gap-2 w-full h-full opacity-65">
                    {Array.from({ length: 16 }).map((_, i) => (
                      <div key={i} className={`rounded-xs ${i % 3 === 0 || i % 7 === 1 ? "bg-black" : "bg-white"}`} />
                    ))}
                  </div>
                </div>
                <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider text-center">
                  {t("cashier.scan")} {formatCurrency(totalAmount)}
                </span>
              </div>
            )}

            {/* Checkout CTA */}
            <Button
              onClick={handleCheckoutSubmit}
              isLoading={isCheckingOut}
              className="w-full py-2.5 font-bold tracking-wide rounded-2xl flex items-center justify-center gap-2"
            >
              <Check className="w-4 h-4" /> {t("cashier.process")}
            </Button>
          </div>
        )}
      </div>

      {/* Transaction Complete Modal */}
      <Modal isOpen={isSuccessModalOpen} onClose={() => setIsSuccessModalOpen(false)} title={t("cashier.completed")}>
        <div className="space-y-6 text-center py-4">
          <div className="w-16 h-16 bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600 dark:text-emerald-400 rounded-full flex items-center justify-center mx-auto mb-4 border border-emerald-100 dark:border-emerald-950/40">
            <Receipt className="w-8 h-8" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-zinc-900 dark:text-zinc-50">{t("cashier.confirmed")}</h3>
            <p className="text-zinc-500 text-sm mt-1">
              Order **{checkoutResult?.order?.orderNumber}** generated successfully.
            </p>
          </div>

          <div className="flex gap-3 justify-center">
            {checkoutResult?.order?.id && (
              <button
                type="button"
                onClick={() => void handlePrintTickets()}
                disabled={isPrinting}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-zinc-300 text-white rounded-xl text-xs font-semibold flex items-center gap-2 cursor-pointer"
              >
                <Printer className="w-4 h-4" /> {isPrinting ? "Printing..." : t("cashier.print")}
              </button>
            )}
            <button
              onClick={() => setIsSuccessModalOpen(false)}
              className="px-4 py-2 border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-900 text-zinc-700 dark:text-zinc-300 rounded-xl text-xs font-semibold cursor-pointer"
            >
              Done
            </button>
          </div>
        </div>
      </Modal>

      {/* Close Cash Drawer Modal */}
      <Modal isOpen={isCloseDrawerModalOpen} onClose={() => setIsCloseDrawerModalOpen(false)} title="Close Cash Drawer Session">
        <form onSubmit={handleCloseDrawerSubmit} className="space-y-6 py-4">
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-zinc-500 uppercase tracking-wider">
              Enter Actual Cash Balance in Drawer (IDR)
            </label>
            <input
              type="number"
              value={drawerActualBalance || ""}
              onChange={(e) => setDrawerActualBalance(Number(e.target.value))}
              placeholder="0"
              className="w-full px-4 py-3 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl text-zinc-900 dark:text-zinc-50 font-bold focus:outline-none focus:ring-2 focus:ring-rose-500/20 text-lg"
              min="0"
              required
            />
          </div>

          <p className="text-xs text-zinc-400 leading-relaxed">
            Upon submitting, the system will calculate the expected sales balance against your cash count and record the overage/shortage variance.
          </p>

          <div className="flex gap-3 justify-end">
            <button
              type="button"
              onClick={() => setIsCloseDrawerModalOpen(false)}
              className="px-4 py-2.5 border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-900 text-zinc-700 dark:text-zinc-300 rounded-xl text-xs font-semibold cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isClosingDrawer}
              className="px-4 py-2.5 bg-rose-600 hover:bg-rose-700 disabled:bg-zinc-350 text-white font-bold rounded-xl text-xs cursor-pointer flex items-center gap-2"
            >
              {isClosingDrawer ? <Spinner className="w-4 h-4" /> : "Close Drawer & Submit"}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
