"use client";

import React, { useState, useEffect, useMemo, useRef, useCallback, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import {
  useGetPublicSeatsQuery,
  useHoldPublicSeatsMutation,
  useReleasePublicSeatsMutation,
  useCreateBookingMutation,
  useGetPublicSchedulesQuery,
  useGetPublicConfigQuery,
} from "@/services/bookingApi";
import { ShowtimeSeat } from "@/services/studioApi";
import { useToast } from "@/components/ui/toast";
import { Spinner } from "@/components/ui/spinner";
import { io } from "socket.io-client";
import { SOCKET_BASE_URL } from "@/lib/api/api";
import {
  ArrowLeft,
  User,
  Phone,
  Mail,
  Ticket,
  Armchair,
  Clock,
  Calendar,
  Sparkles,
  ZoomIn,
  ZoomOut,
  X,
  Film,
  CheckCircle2,
  ShieldCheck,
} from "lucide-react";
import Link from "next/link";
import { getVisualRowOrder, groupSeatsByRow } from "@/lib/seatLayout";
import { useTranslation } from "@/lib/i18n";
import { ThemeToggle } from "@/components/ui/ThemeToggle";
import { LanguageToggle } from "@/components/ui/LanguageToggle";

function GuestCheckout() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const scheduleId = searchParams.get("scheduleId") || "";

  const { t, formatDate, formatCurrency } = useTranslation();
  const { success: toastSuccess, error: toastError } = useToast();

  // Queries
  const { data: configResponse } = useGetPublicConfigQuery();
  const { data: schedulesResponse, isLoading: schedulesLoading } = useGetPublicSchedulesQuery(undefined, {
    skip: !scheduleId,
  });
  const { data: seatsResponse, isLoading: seatsLoading, refetch: refetchSeats } = useGetPublicSeatsQuery(scheduleId, {
    skip: !scheduleId,
  });

  const [holdSeats] = useHoldPublicSeatsMutation();
  const [releaseSeats] = useReleasePublicSeatsMutation();
  const [createBooking, { isLoading: isSubmitting }] = useCreateBookingMutation();

  // Selected schedule data
  const activeSchedule = useMemo(() => {
    return schedulesResponse?.data?.find((s) => s.id === scheduleId) || null;
  }, [schedulesResponse?.data, scheduleId]);

  const ticketPrice = activeSchedule?.ticketPrice || 0;
  const onlineFee = configResponse?.onlineServiceFee !== undefined ? Number(configResponse.onlineServiceFee) : 4000;

  // Selected seats state
  const [selectedSeats, setSelectedSeats] = useState<ShowtimeSeat[]>([]);

  // Form state
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [customerEmail, setCustomerEmail] = useState("");

  // Refs for cleanup on unmount
  const selectedSeatsRef = useRef<ShowtimeSeat[]>([]);
  useEffect(() => {
    selectedSeatsRef.current = selectedSeats;
  }, [selectedSeats]);

  // Clean up held seats on unmount / navigate away
  useEffect(() => {
    return () => {
      if (scheduleId && selectedSeatsRef.current.length > 0) {
        releaseSeats({
          scheduleId,
          seatIds: selectedSeatsRef.current.map((s) => s.seatId),
        });
      }
    };
  }, [scheduleId, releaseSeats]);

  // Socket.IO realtime sync
  useEffect(() => {
    if (!scheduleId) return;

    const socket = io(SOCKET_BASE_URL, {
      transports: ["websocket", "polling"],
      reconnection: true,
      reconnectionAttempts: 10,
    });

    socket.emit("join_showtime", scheduleId);

    const handleUpdate = () => {
      refetchSeats();
    };

    socket.on("seat_update", handleUpdate);
    socket.on("seats_held", handleUpdate);
    socket.on("seats_released", handleUpdate);
    socket.on("seats_sold", handleUpdate);
    socket.on("order_updated", handleUpdate);

    return () => {
      socket.emit("leave_showtime", scheduleId);
      socket.disconnect();
    };
  }, [scheduleId, refetchSeats]);

  // Group seats by visual rows & columns
  const showtimeSeats = useMemo(() => seatsResponse?.data || [], [seatsResponse?.data]);

  const { rows, cols, seatsByRow } = useMemo(() => {
    const grouped = groupSeatsByRow(showtimeSeats.map((s) => ({ ...s, row: s.seat.row })));
    const visualRows = getVisualRowOrder(Object.keys(grouped));
    const maxColumn = showtimeSeats.length > 0 ? Math.max(...showtimeSeats.map((s) => s.seat.column), 12) : 12;
    const columns = Array.from({ length: maxColumn }, (_, i) => i + 1);

    return { rows: visualRows, cols: columns, seatsByRow: grouped };
  }, [showtimeSeats]);

  // Matrix auto-scaling dimensions
  const SEAT_SIZE = 38;
  const SEAT_GAP = 6;
  const ROW_LABEL_WIDTH = 24;
  const SCREEN_BAR_HEIGHT = 44;
  const MATRIX_PADDING = 20;

  const naturalWidth = useMemo(() => {
    const numCols = cols.length || 1;
    return numCols * SEAT_SIZE + Math.max(0, numCols - 1) * SEAT_GAP + ROW_LABEL_WIDTH * 2 + MATRIX_PADDING;
  }, [cols.length]);

  const naturalHeight = useMemo(() => {
    const numRows = rows.length || 1;
    return SCREEN_BAR_HEIGHT + numRows * SEAT_SIZE + Math.max(0, numRows - 1) * SEAT_GAP + MATRIX_PADDING;
  }, [rows.length]);

  const seatViewportRef = useRef<HTMLDivElement>(null);
  const [seatScale, setSeatScale] = useState<number>(1);
  const [manualZoom, setManualZoom] = useState<number>(1);

  const updateScale = useCallback(() => {
    if (!seatViewportRef.current || naturalWidth <= 0 || naturalHeight <= 0) return;
    const container = seatViewportRef.current;
    const availableWidth = container.clientWidth - 24;
    const availableHeight = container.clientHeight - 24;

    if (availableWidth > 0 && availableHeight > 0) {
      const scaleX = availableWidth / naturalWidth;
      const scaleY = availableHeight / naturalHeight;
      const fit = Math.min(scaleX, scaleY);
      setSeatScale(Math.max(0.25, Math.min(fit, 1.35)));
    }
  }, [naturalWidth, naturalHeight]);

  useEffect(() => {
    updateScale();
    const el = seatViewportRef.current;
    if (!el) return;

    const observer = new ResizeObserver(() => {
      updateScale();
    });
    observer.observe(el);
    window.addEventListener("resize", updateScale);

    return () => {
      observer.disconnect();
      window.removeEventListener("resize", updateScale);
    };
  }, [updateScale]);

  // Handle seat clicks
  const handleSeatClick = async (seat: ShowtimeSeat) => {
    if (seat.status === "SOLD" || seat.status === "DISABLED") return;

    const isAlreadySelected = selectedSeats.some((s) => s.id === seat.id);

    try {
      if (isAlreadySelected) {
        await releaseSeats({ scheduleId, seatIds: [seat.seatId] }).unwrap();
        setSelectedSeats((prev) => prev.filter((s) => s.id !== seat.id));
      } else {
        const isHeldByOther =
          seat.status === "HOLD" && seat.reservedUntil && new Date(seat.reservedUntil) > new Date();
        if (isHeldByOther) {
          toastError(t("booking.heldSeats") || "Kursi sedang dipilih oleh pengunjung lain.");
          return;
        }

        await holdSeats({ scheduleId, seatIds: [seat.seatId] }).unwrap();
        setSelectedSeats((prev) => [...prev, seat]);
      }
    } catch (err: any) {
      toastError(err?.data?.message || t("errors.somethingWentWrong"));
    }
  };

  const handleRemoveSeat = async (seat: ShowtimeSeat) => {
    try {
      await releaseSeats({ scheduleId, seatIds: [seat.seatId] }).unwrap();
      setSelectedSeats((prev) => prev.filter((s) => s.id !== seat.id));
    } catch (err: any) {
      toastError(err?.data?.message || t("errors.somethingWentWrong"));
    }
  };

  // Submit checkout
  const handleCheckoutSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedSeats.length === 0) {
      toastError(t("booking.selectSeat") || "Pilih minimal 1 kursi sebelum melanjutkan.");
      return;
    }

    try {
      const response = await createBooking({
        scheduleId,
        seatIds: selectedSeats.map((s) => s.seatId),
        customerName: customerName.trim(),
        customerPhone: customerPhone.trim(),
        customerEmail: customerEmail.trim() || undefined,
        channel: "ONLINE",
      }).unwrap();

      toastSuccess(t("booking.checkoutSuccess") || "Pemesanan berhasil dibuat!");
      router.push(`/bookings/${response.order.id}/success`);
    } catch (err: any) {
      toastError(err?.data?.message || t("booking.checkoutFailed") || "Gagal membuat pemesanan.");
    }
  };

  if (!scheduleId) {
    return (
      <div className="text-center py-20 bg-zinc-50 dark:bg-zinc-950 min-h-screen">
        <h2 className="text-xl font-bold">{t("booking.noSchedule")}</h2>
        <Link href="/" className="text-indigo-600 hover:underline mt-2 inline-block">
          Back to home
        </Link>
      </div>
    );
  }

  if (seatsLoading || schedulesLoading) {
    return (
      <div className="flex justify-center items-center min-h-screen bg-zinc-50 dark:bg-zinc-950">
        <Spinner className="w-12 h-12" />
      </div>
    );
  }

  const subtotalTickets = ticketPrice * selectedSeats.length;
  const totalAmount = subtotalTickets + (selectedSeats.length > 0 ? onlineFee : 0);

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 font-sans pb-20">
      {/* Header */}
      <header className="sticky top-0 z-40 w-full bg-white/80 dark:bg-zinc-900/80 backdrop-blur-md border-b border-zinc-150 dark:border-zinc-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => router.back()}
              className="p-2 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-xl cursor-pointer transition-colors"
            >
              <ArrowLeft className="w-5 h-5 text-zinc-600 dark:text-zinc-400" />
            </button>
            <div className="flex items-center gap-2">
              <span className="font-bold text-zinc-900 dark:text-zinc-50 text-sm sm:text-base">
                {t("booking.seatSelection")}
              </span>
              {activeSchedule?.movie?.title && (
                <>
                  <span className="text-zinc-300 dark:text-zinc-700 hidden sm:inline">•</span>
                  <span className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 hidden sm:inline truncate max-w-[200px]">
                    {activeSchedule.movie.title}
                  </span>
                </>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <LanguageToggle />
            <ThemeToggle />
            <Link href="/" className="flex items-center pl-1">
              <img
                src="/PLANET-CINEMA-LOGO-2-COLOR.png"
                alt="Planet Cinema"
                className="h-7 w-auto object-contain"
              />
            </Link>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 mt-6 space-y-6">
        {/* Movie Info Snapshot Card */}
        {activeSchedule && (
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl p-4 sm:p-5 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="w-14 h-18 sm:w-16 sm:h-22 rounded-2xl overflow-hidden bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 shrink-0">
                {activeSchedule.movie?.poster ? (
                  <img
                    src={activeSchedule.movie.poster}
                    alt={activeSchedule.movie.title}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-zinc-400">
                    <Film className="w-6 h-6" />
                  </div>
                )}
              </div>
              <div className="space-y-1">
                <h1 className="text-base sm:text-lg font-black text-zinc-900 dark:text-zinc-50 line-clamp-1">
                  {activeSchedule.movie?.title}
                </h1>
                <div className="flex flex-wrap items-center gap-2 text-xs text-zinc-500 dark:text-zinc-400">
                  <span className="px-2 py-0.5 rounded-md bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 font-bold border border-indigo-150 dark:border-indigo-900">
                    {activeSchedule.studio?.name}
                  </span>
                  <span>•</span>
                  <div className="flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5 text-zinc-400" />
                    <span>{formatDate(activeSchedule.businessDate || activeSchedule.startTime)}</span>
                  </div>
                  <span>•</span>
                  <div className="flex items-center gap-1 font-bold text-zinc-800 dark:text-zinc-200">
                    <Clock className="w-3.5 h-3.5 text-emerald-500" />
                    <span>
                      {new Date(activeSchedule.startTime).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex sm:flex-col items-center sm:items-end justify-between w-full sm:w-auto border-t sm:border-t-0 border-zinc-150 dark:border-zinc-800 pt-3 sm:pt-0">
              <span className="text-[11px] text-zinc-400 uppercase font-bold tracking-wider">Harga per Tiket</span>
              <span className="text-base font-black text-emerald-600 dark:text-emerald-400">
                {formatCurrency(ticketPrice)}
              </span>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Seat Layout (Left Panel) */}
          <div className="lg:col-span-8 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl p-4 sm:p-6 flex flex-col shadow-sm">
            {/* Studio Header & Zoom Controls */}
            <div className="shrink-0 flex items-center justify-between flex-wrap gap-3 pb-4 mb-3 border-b border-zinc-200 dark:border-zinc-800/80">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-800/80 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
                  <Armchair className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-base sm:text-lg font-bold text-zinc-900 dark:text-zinc-50 flex items-center gap-2">
                    {t("cashier.seatLayout")}
                  </h2>
                  <div className="flex items-center gap-2 text-xs text-zinc-500 dark:text-zinc-400">
                    <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                      {activeSchedule?.studio?.name || "Studio"}
                    </span>
                    <span>•</span>
                    <span>{showtimeSeats.length} Kursi</span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2">
                {selectedSeats.length > 0 && (
                  <span className="px-3 py-1 rounded-xl bg-indigo-600 text-white text-xs font-black shadow-sm">
                    {selectedSeats.length} {t("cashier.selected") || "Dipilih"}
                  </span>
                )}

                {/* Zoom Controls */}
                <div className="flex items-center bg-zinc-100 dark:bg-zinc-800/80 border border-zinc-200 dark:border-zinc-700/60 rounded-xl p-0.5">
                  <button
                    type="button"
                    onClick={() => setManualZoom((z) => Math.max(0.4, Number((z - 0.1).toFixed(2))))}
                    title="Zoom Out"
                    className="p-1.5 text-zinc-600 dark:text-zinc-300 hover:bg-white dark:hover:bg-zinc-700 rounded-lg transition cursor-pointer"
                  >
                    <ZoomOut className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setManualZoom(1);
                      updateScale();
                    }}
                    title="Fit to Screen"
                    className="px-2 py-1 text-[11px] font-bold text-zinc-600 dark:text-zinc-300 hover:bg-white dark:hover:bg-zinc-700 rounded-lg transition cursor-pointer"
                  >
                    Fit
                  </button>
                  <button
                    type="button"
                    onClick={() => setManualZoom((z) => Math.min(1.8, Number((z + 0.1).toFixed(2))))}
                    title="Zoom In"
                    className="p-1.5 text-zinc-600 dark:text-zinc-300 hover:bg-white dark:hover:bg-zinc-700 rounded-lg transition cursor-pointer"
                  >
                    <ZoomIn className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>

            {/* SEAT GRID VIEWPORT */}
            <div className="w-full flex flex-col items-center">
              <div
                ref={seatViewportRef}
                className="w-full min-h-[380px] sm:min-h-[460px] h-[58vh] max-h-[640px] flex items-center justify-center overflow-auto p-2 sm:p-4 relative bg-zinc-50/50 dark:bg-zinc-950/40 rounded-2xl border border-zinc-150 dark:border-zinc-800/60"
              >
                {rows.length > 0 && cols.length > 0 && (
                  <div
                    style={{
                      width: `${naturalWidth * seatScale * manualZoom}px`,
                      height: `${naturalHeight * seatScale * manualZoom}px`,
                      position: "relative",
                      flexShrink: 0,
                    }}
                    className="transition-all duration-150 ease-out"
                  >
                    <div
                      style={{
                        width: `${naturalWidth}px`,
                        height: `${naturalHeight}px`,
                        transform: `scale(${seatScale * manualZoom})`,
                        transformOrigin: "top left",
                        position: "absolute",
                        top: 0,
                        left: 0,
                      }}
                      className="flex flex-col items-center justify-center select-none"
                    >
                      {/* SCREEN CURVE */}
                      <div className="w-full max-w-sm shrink-0 mb-4 flex flex-col items-center">
                        <div className="w-full h-3 bg-gradient-to-b from-indigo-500/40 via-indigo-500/20 to-transparent rounded-t-[120px] border-t-2 border-indigo-500 dark:border-indigo-400 shadow-md shadow-indigo-500/20" />
                        <span className="text-[10px] font-extrabold text-indigo-700 dark:text-indigo-300/80 tracking-[0.28em] uppercase mt-1">
                          {t("cashier.screen") || "LAYAR / SCREEN"}
                        </span>
                      </div>

                      {/* Rows & Seats */}
                      <div className="flex flex-col gap-1.5 justify-center items-center w-full">
                        {rows.map((row) => (
                          <div key={row} className="flex gap-1.5 items-center justify-center">
                            <span className="w-6 text-center font-bold text-zinc-400 dark:text-zinc-500 text-xs select-none">
                              {row}
                            </span>
                            {cols.map((col) => {
                              const seat = seatsByRow[row]?.find((x) => x.seat.column === col) || null;

                              if (!seat) {
                                return <div key={`gap-${row}-${col}`} className="w-9 h-9" />;
                              }

                              const isSelected = selectedSeats.some((s) => s.id === seat.id);
                              const isHold = seat.status === "HOLD" && !isSelected;

                              let seatClasses =
                                "bg-emerald-600 dark:bg-emerald-600/90 text-white border-emerald-500/50 hover:bg-emerald-700 active:scale-95 cursor-pointer shadow-sm";
                              let seatTooltip = seat.seat.seatLabel;

                              if (seat.status === "DISABLED") {
                                seatClasses =
                                  "bg-zinc-100 dark:bg-zinc-800/80 text-zinc-400 dark:text-zinc-600 border-zinc-200 dark:border-zinc-700/50 opacity-40 cursor-not-allowed";
                                seatTooltip = `${seat.seat.seatLabel} • Nonaktif`;
                              } else if (seat.status === "SOLD") {
                                seatClasses =
                                  "bg-rose-100 dark:bg-rose-950/80 text-rose-700 dark:text-rose-300 border-rose-300 dark:border-rose-800/70 opacity-80 cursor-not-allowed line-through";
                                seatTooltip = `${seat.seat.seatLabel} • Terisi`;
                              } else if (isHold) {
                                seatClasses =
                                  "bg-amber-500 dark:bg-amber-500/90 text-white border-amber-400/60 animate-pulse cursor-not-allowed";
                                seatTooltip = `${seat.seat.seatLabel} • Sedang Diproses`;
                              } else if (isSelected) {
                                seatClasses =
                                  "bg-indigo-600 text-white border-indigo-400 ring-4 ring-indigo-500/30 scale-105 shadow-md shadow-indigo-500/40 font-black cursor-pointer";
                                seatTooltip = `${seat.seat.seatLabel} • Dipilih`;
                              }

                              return (
                                <button
                                  key={seat.id}
                                  type="button"
                                  onClick={() => handleSeatClick(seat)}
                                  disabled={seat.status === "SOLD" || seat.status === "DISABLED" || isHold}
                                  title={seatTooltip}
                                  className={`w-9 h-9 rounded-xl text-xs font-bold border transition-transform duration-100 flex items-center justify-center ${seatClasses}`}
                                >
                                  {seat.seat.seatLabel}
                                </button>
                              );
                            })}
                            <span className="w-6 text-center font-bold text-zinc-400 dark:text-zinc-500 text-xs select-none">
                              {row}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Legend (Bottom) */}
              <div className="flex flex-wrap gap-4 justify-center mt-5 pt-3.5 border-t border-zinc-200 dark:border-zinc-800/80 w-full text-[11px] font-semibold text-zinc-600 dark:text-zinc-400">
                <div className="flex items-center gap-1.5">
                  <div className="w-3.5 h-3.5 bg-emerald-600 rounded-md border border-emerald-500/50" />
                  <span>{t("cashier.available") || "Tersedia"}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="w-3.5 h-3.5 bg-indigo-600 rounded-md border border-indigo-400" />
                  <span>{t("cashier.selected") || "Dipilih"}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="w-3.5 h-3.5 bg-amber-500 rounded-md border border-amber-400 animate-pulse" />
                  <span>{t("cashier.hold") || "Sedang Dipesan"}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="w-3.5 h-3.5 bg-rose-100 dark:bg-rose-950/80 rounded-md border border-rose-300 dark:border-rose-800/70" />
                  <span>{t("cashier.sold") || "Terisi"}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Form & Order Summary (Right Panel) */}
          <div className="lg:col-span-4 space-y-6">
            <form
              onSubmit={handleCheckoutSubmit}
              className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl p-6 space-y-6 shadow-sm"
            >
              {/* Header */}
              <div className="space-y-1">
                <h2 className="text-base font-bold text-zinc-900 dark:text-zinc-50 flex items-center gap-2">
                  <User className="w-5 h-5 text-indigo-600" /> {t("booking.guestInformation")}
                </h2>
                <p className="text-xs text-zinc-400">Lengkapi informasi untuk pengiriman e-ticket.</p>
              </div>

              {/* Selected Seats Chips */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wider text-zinc-400">
                  <span>Kursi Dipilih ({selectedSeats.length})</span>
                  {selectedSeats.length > 0 && (
                    <button
                      type="button"
                      onClick={() => {
                        if (selectedSeats.length > 0) {
                          releaseSeats({ scheduleId, seatIds: selectedSeats.map((s) => s.seatId) });
                          setSelectedSeats([]);
                        }
                      }}
                      className="text-[10px] text-rose-600 dark:text-rose-400 hover:underline cursor-pointer lowercase"
                    >
                      hapus semua
                    </button>
                  )}
                </div>

                {selectedSeats.length === 0 ? (
                  <div className="p-4 rounded-2xl border border-dashed border-zinc-200 dark:border-zinc-800 text-center text-xs text-zinc-400">
                    Silakan klik kursi pada denah untuk memilih tempat duduk.
                  </div>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {selectedSeats.map((seat) => (
                      <div
                        key={seat.id}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800 text-indigo-700 dark:text-indigo-300 text-xs font-bold"
                      >
                        <Armchair className="w-3.5 h-3.5 text-indigo-500" />
                        <span>{seat.seat.seatLabel}</span>
                        <button
                          type="button"
                          onClick={() => handleRemoveSeat(seat)}
                          className="hover:text-rose-600 transition-colors ml-0.5 cursor-pointer"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Form Inputs */}
              <div className="space-y-4 pt-2 border-t border-zinc-150 dark:border-zinc-800">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-zinc-600 dark:text-zinc-300 uppercase tracking-wider block">
                    {t("booking.fullName")} <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
                    <input
                      type="text"
                      placeholder="e.g. John Doe"
                      value={customerName}
                      onChange={(e) => setCustomerName(e.target.value)}
                      className="w-full pl-10 pr-4 py-2.5 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 text-zinc-900 dark:text-zinc-50"
                      required
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-zinc-600 dark:text-zinc-300 uppercase tracking-wider block">
                    {t("booking.phoneNumber")} (WhatsApp) <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <Phone className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
                    <input
                      type="tel"
                      placeholder="e.g. 081234567890"
                      value={customerPhone}
                      onChange={(e) => setCustomerPhone(e.target.value)}
                      className="w-full pl-10 pr-4 py-2.5 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 text-zinc-900 dark:text-zinc-50"
                      required
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-zinc-600 dark:text-zinc-300 uppercase tracking-wider block">
                    Email (Opsional)
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
                    <input
                      type="email"
                      placeholder="e.g. john@example.com"
                      value={customerEmail}
                      onChange={(e) => setCustomerEmail(e.target.value)}
                      className="w-full pl-10 pr-4 py-2.5 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 text-zinc-900 dark:text-zinc-50"
                    />
                  </div>
                </div>
              </div>

              {/* Price Calculation Box */}
              <div className="p-4 bg-zinc-50 dark:bg-zinc-950/60 border border-zinc-200 dark:border-zinc-800 rounded-2xl space-y-2.5 text-xs">
                <div className="flex justify-between text-zinc-600 dark:text-zinc-400">
                  <span>
                    Kursi ({selectedSeats.length}x{selectedSeats.length > 0 ? ` @ ${formatCurrency(ticketPrice)}` : ""})
                  </span>
                  <span className="font-semibold text-zinc-900 dark:text-zinc-100">
                    {formatCurrency(subtotalTickets)}
                  </span>
                </div>
                <div className="flex justify-between text-zinc-600 dark:text-zinc-400">
                  <span>Biaya Layanan</span>
                  <span className="font-semibold text-zinc-900 dark:text-zinc-100">
                    {selectedSeats.length > 0 ? formatCurrency(onlineFee) : formatCurrency(onlineFee)}
                  </span>
                </div>
                <div className="flex justify-between border-t border-zinc-200 dark:border-zinc-800 pt-3 text-sm">
                  <span className="font-bold text-zinc-800 dark:text-zinc-200">Total Pembayaran</span>
                  <span className="font-black text-indigo-600 dark:text-indigo-400 text-base">
                    {formatCurrency(totalAmount)}
                  </span>
                </div>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={isSubmitting || selectedSeats.length === 0}
                className="w-full py-3.5 bg-indigo-600 hover:bg-indigo-700 disabled:bg-zinc-300 dark:disabled:bg-zinc-800 disabled:text-zinc-500 text-white font-bold rounded-2xl cursor-pointer shadow-md shadow-indigo-500/20 transition-all flex items-center justify-center gap-2 text-sm"
              >
                {isSubmitting ? (
                  <Spinner className="w-5 h-5 mx-auto" />
                ) : (
                  <>
                    <Ticket className="w-4 h-4" />
                    <span>Lanjutkan Pemesanan ({selectedSeats.length})</span>
                  </>
                )}
              </button>

              <div className="flex items-center gap-2 justify-center text-[11px] text-zinc-400 text-center">
                <ShieldCheck className="w-4 h-4 text-emerald-500 shrink-0" />
                <span>Kursi Anda akan ditahan selama 10 menit untuk pembayaran.</span>
              </div>
            </form>
          </div>
        </div>
      </main>
    </div>
  );
}

export default function GuestCheckoutPage() {
  return (
    <Suspense
      fallback={
        <div className="flex justify-center items-center min-h-screen bg-zinc-50 dark:bg-zinc-950">
          <Spinner className="w-12 h-12" />
        </div>
      }
    >
      <GuestCheckout />
    </Suspense>
  );
}
