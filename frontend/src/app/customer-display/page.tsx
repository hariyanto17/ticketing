"use client";

import React, { useEffect, useState, useMemo, useRef } from "react";
import {
  CUSTOMER_DISPLAY_CHANNEL_NAME,
  CustomerDisplayMessage,
  CustomerDisplayStatePayload,
} from "@/lib/customerDisplay";
import { getVisualRowOrder, groupSeatsByRow } from "@/lib/seatLayout";
import { useTranslation } from "@/lib/i18n";
import { useTheme } from "@/components/ThemeProvider";
import { Film, Clock, Armchair, Ticket, Sparkles, CheckCircle2 } from "lucide-react";

export default function CustomerDisplayPage() {
  const { t, formatCurrency, setLocale, locale } = useTranslation();
  const { setTheme, theme: currentTheme } = useTheme();

  const [displayState, setDisplayState] = useState<CustomerDisplayStatePayload | null>(null);
  const [isConnected, setIsConnected] = useState(false);

  const localeRef = useRef(locale);
  const themeRef = useRef(currentTheme);

  useEffect(() => {
    localeRef.current = locale;
  }, [locale]);

  useEffect(() => {
    themeRef.current = currentTheme;
  }, [currentTheme]);

  // Sync theme changes across tabs/windows via storage event
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === "theme" && e.newValue) {
        setTheme(e.newValue as any);
      }
    };
    window.addEventListener("storage", handleStorageChange);
    return () => {
      window.removeEventListener("storage", handleStorageChange);
    };
  }, [setTheme]);

  // Set up BroadcastChannel communication with Cashier window
  useEffect(() => {
    if (typeof window === "undefined" || !("BroadcastChannel" in window)) {
      return;
    }

    const channel = new BroadcastChannel(CUSTOMER_DISPLAY_CHANNEL_NAME);

    const handleMessage = (event: MessageEvent<CustomerDisplayMessage>) => {
      const data = event.data;
      if (!data || !data.type) return;

      if (data.type === "CUSTOMER_DISPLAY_STATE") {
        setDisplayState(data.payload);
        setIsConnected(true);

        // Sync locale if changed by cashier
        if (data.payload.locale && data.payload.locale !== localeRef.current) {
          setLocale(data.payload.locale);
        }

        // Sync theme if changed by cashier
        if (data.payload.theme && data.payload.theme !== themeRef.current) {
          setTheme(data.payload.theme);
        }
      } else if (data.type === "CUSTOMER_DISPLAY_PING") {
        setIsConnected(true);
        channel.postMessage({ type: "CUSTOMER_DISPLAY_PONG" });
      }
    };

    channel.addEventListener("message", handleMessage);

    // Announce to cashier that customer display is ready and request current state
    channel.postMessage({ type: "CUSTOMER_DISPLAY_REQUEST_STATE" });

    const pingInterval = setInterval(() => {
      channel.postMessage({ type: "CUSTOMER_DISPLAY_PING" });
    }, 5000);

    const handleBeforeUnload = () => {
      channel.postMessage({ type: "CUSTOMER_DISPLAY_CLOSED" });
    };
    window.addEventListener("beforeunload", handleBeforeUnload);

    return () => {
      clearInterval(pingInterval);
      window.removeEventListener("beforeunload", handleBeforeUnload);
      channel.removeEventListener("message", handleMessage);
      channel.close();
    };
  }, [setLocale, setTheme]);

  const movie = displayState?.movie;
  const schedule = displayState?.schedule;
  const seats = displayState?.seats || [];
  const selectedSeats = displayState?.selectedSeats || [];
  const quantity = displayState?.quantity || 0;
  const ticketPrice = displayState?.ticketPrice || 0;
  const totalAmount = displayState?.totalAmount || 0;

  // Seat grid organization
  const { rows, cols, seatsByRow } = useMemo(() => {
    if (!seats || seats.length === 0) {
      return { rows: [], cols: [], seatsByRow: {} };
    }

    const grouped = groupSeatsByRow(seats.map((s) => ({ ...s, row: s.seat.row })));
    const visualRows = getVisualRowOrder(Object.keys(grouped));
    const maxColumn = Math.max(...seats.map((s) => s.seat.column), 12);
    const columns = Array.from({ length: maxColumn }, (_, i) => i + 1);

    return { rows: visualRows, cols: columns, seatsByRow: grouped };
  }, [seats]);

  return (
    <div className="h-screen w-screen bg-zinc-100 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 flex flex-col justify-between select-none overflow-hidden font-sans transition-colors duration-200">
      {/* 1. TOP BRANDING & STATUS (Fixed height: ~64px) */}
      <header className="h-16 shrink-0 w-full bg-white/95 dark:bg-zinc-900/90 backdrop-blur-md border-b border-zinc-200 dark:border-zinc-800/80 px-6 flex items-center justify-between shadow-sm dark:shadow-md transition-colors duration-200">
        {/* Brand */}
        <div className="flex items-center gap-3">
          <img
            src="/PLANET-CINEMA-LOGO-2-COLOR.png"
            alt="Planet Cinema"
            className="h-11 w-auto object-contain"
          />
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-50 dark:bg-indigo-500/20 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-500/30 uppercase">
                CUSTOMER DISPLAY
              </span>
            </div>
            <p className="text-[11px] text-zinc-500 dark:text-zinc-400 font-medium">Premium Theater Experience</p>
          </div>
        </div>

        {/* Status Indicator */}
        <div className="flex items-center gap-2 text-xs font-semibold text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60 px-3.5 py-1.5 rounded-full">
          <span className="w-2 h-2 rounded-full bg-emerald-500 dark:bg-emerald-400 animate-pulse" />
          <span>{isConnected ? t("customerDisplay.liveConnected") : "Connecting..."}</span>
        </div>
      </header>

      {/* 2. MAIN VIEWPORT (Occupies remaining viewport height, 0 scroll) */}
      <main className="flex-1 min-h-0 w-full max-w-[1920px] mx-auto p-4 xl:p-6 flex items-center justify-center overflow-hidden">
        {!schedule || !movie ? (
          /* IDLE / STANDBY STATE */
          <div className="max-w-xl text-center space-y-5 animate-in fade-in duration-300">
            <div className="w-20 h-20 mx-auto rounded-3xl bg-indigo-50 dark:bg-indigo-950/50 border border-indigo-200 dark:border-indigo-500/30 flex items-center justify-center shadow-lg dark:shadow-2xl shadow-indigo-500/10">
              <Sparkles className="w-10 h-10 text-indigo-600 dark:text-indigo-400 animate-pulse" />
            </div>
            <div className="space-y-1.5">
              <h2 className="text-3xl font-extrabold text-zinc-900 dark:text-white tracking-tight">
                {t("customerDisplay.welcome")}
              </h2>
              <p className="text-zinc-600 dark:text-zinc-400 text-sm leading-relaxed">
                {t("customerDisplay.standbyMessage")}
              </p>
            </div>
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-xs font-medium text-zinc-600 dark:text-zinc-400 shadow-sm">
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
              <span>{t("customerDisplay.liveConnected")}</span>
            </div>
          </div>
        ) : (
          /* ACTIVE TICKETING SEAT & SUMMARY VIEW (Full Height Grid) */
          <div className="w-full h-full flex flex-col lg:flex-row gap-5 items-stretch overflow-hidden">
            {/* LEFT / CENTER: SEAT MAP CONTAINER */}
            <div className="flex-1 min-h-0 h-full bg-white dark:bg-zinc-900/60 border border-zinc-200 dark:border-zinc-800/90 rounded-3xl p-4 xl:p-5 flex flex-col justify-between shadow-sm dark:shadow-xl overflow-hidden transition-colors duration-200">
              {/* Studio Header Information */}
              <div className="shrink-0 flex items-center justify-between pb-3 mb-2 border-b border-zinc-200 dark:border-zinc-800/80">
                <div className="flex items-center gap-3">
                  <h2 className="text-lg xl:text-xl font-black text-zinc-900 dark:text-white tracking-tight flex items-center gap-2">
                    <Armchair className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                    <span>{t("customerDisplay.screen")}</span>
                  </h2>
                  <span className="text-xs font-bold px-2.5 py-1 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/80">
                    {schedule.studioName}
                  </span>
                </div>

                <div className="px-3 py-1 rounded-xl bg-indigo-50 dark:bg-indigo-500/10 border border-indigo-200 dark:border-indigo-500/30 text-indigo-700 dark:text-indigo-400 font-bold text-xs flex items-center gap-1.5">
                  <span>{seats.length} Total Seats</span>
                </div>
              </div>

              {/* SEAT GRID SECTION (Centered vertically & horizontally) */}
              <div className="flex-1 min-h-0 flex flex-col items-center justify-center overflow-hidden">
                {/* SCREEN CURVE (BEFORE ROW A) */}
                <div className="w-full max-w-md shrink-0 mb-3 xl:mb-4 flex flex-col items-center">
                  <div className="w-full h-2.5 bg-gradient-to-b from-indigo-500/40 via-indigo-500/20 to-transparent rounded-t-[100px] border-t-2 border-indigo-500 dark:border-indigo-400 shadow-md shadow-indigo-500/20" />
                  <span className="text-[10px] font-extrabold text-indigo-700 dark:text-indigo-300/80 tracking-[0.25em] uppercase mt-0.5">
                    {t("customerDisplay.screen")}
                  </span>
                </div>

                {/* Rows & Seats Grid */}
                <div className="flex flex-col gap-1.5 xl:gap-2 justify-center items-center overflow-hidden w-full">
                  {rows.map((row) => (
                    <div key={row} className="flex gap-1.5 xl:gap-2 items-center justify-center">
                      <span className="w-5 text-center font-bold text-zinc-400 dark:text-zinc-500 text-[11px] xl:text-xs">{row}</span>
                      {cols.map((col) => {
                        const seat = seatsByRow[row]?.find((x) => x.seat.column === col) || null;

                        if (!seat) {
                          return <div key={`gap-${row}-${col}`} className="w-7 h-7 sm:w-8 sm:h-8 xl:w-9 xl:h-9" />;
                        }

                        const isSelected = selectedSeats.some((s) => s.id === seat.id);
                        const isHold = seat.status === "HOLD" && !isSelected;

                        // Distinct status styling
                        let seatClasses = "bg-emerald-600 dark:bg-emerald-600/90 text-white border-emerald-500/50 shadow-sm"; // AVAILABLE
                        if (seat.status === "DISABLED") {
                          seatClasses = "bg-zinc-100 dark:bg-zinc-800/80 text-zinc-400 dark:text-zinc-600 border-zinc-200 dark:border-zinc-700/50 opacity-40";
                        } else if (seat.status === "SOLD") {
                          seatClasses = "bg-rose-100 dark:bg-rose-950/80 text-rose-700 dark:text-rose-400/80 border-rose-200 dark:border-rose-900/60 opacity-60";
                        } else if (isHold) {
                          seatClasses = "bg-amber-500 dark:bg-amber-500/80 text-white border-amber-400/60 animate-pulse";
                        } else if (isSelected) {
                          seatClasses =
                            "bg-indigo-600 text-white border-indigo-400 ring-2 ring-indigo-400 scale-105 shadow-md shadow-indigo-500/30 font-black";
                        }

                        return (
                          <div
                            key={seat.id}
                            className={`w-7 h-7 sm:w-8 sm:h-8 xl:w-9 xl:h-9 rounded-lg text-[9px] sm:text-[10px] xl:text-xs font-bold border transition-all flex items-center justify-center ${seatClasses}`}
                          >
                            {seat.seat.seatLabel}
                          </div>
                        );
                      })}
                      <span className="w-5 text-center font-bold text-zinc-400 dark:text-zinc-500 text-[11px] xl:text-xs">{row}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Status Legend (Bottom) */}
              <div className="shrink-0 flex flex-wrap gap-4 justify-center pt-3 border-t border-zinc-200 dark:border-zinc-800/80 w-full text-[11px] font-semibold text-zinc-600 dark:text-zinc-400">
                <div className="flex items-center gap-1.5">
                  <div className="w-3 h-3 bg-emerald-600 rounded-sm border border-emerald-500/50" />
                  <span>{t("customerDisplay.available")}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="w-3 h-3 bg-indigo-600 rounded-sm ring-1 ring-indigo-400 border border-indigo-400" />
                  <span className="text-indigo-600 dark:text-indigo-400 font-bold">{t("customerDisplay.selected")}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="w-3 h-3 bg-amber-500 rounded-sm border border-amber-400/60" />
                  <span>{t("customerDisplay.held")}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="w-3 h-3 bg-rose-200 dark:bg-rose-950 rounded-sm border border-rose-300 dark:border-rose-900" />
                  <span>{t("customerDisplay.sold")}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="w-3 h-3 bg-zinc-200 dark:bg-zinc-800 rounded-sm border border-zinc-300 dark:border-zinc-700" />
                  <span>{t("customerDisplay.disabled")}</span>
                </div>
              </div>
            </div>

            {/* RIGHT: ORDER SUMMARY CARD (Fixed width, vertical column specs with large typography) */}
            <div className="w-full lg:w-96 xl:w-[420px] shrink-0 h-full bg-white dark:bg-zinc-900/80 border border-zinc-200 dark:border-zinc-800 rounded-3xl p-5 xl:p-6 flex flex-col justify-between shadow-lg dark:shadow-2xl overflow-hidden transition-colors duration-200">
              {/* Title: Ringkasan Pesanan */}
              <div className="shrink-0 border-b border-zinc-200 dark:border-zinc-800 pb-3">
                <h3 className="text-lg xl:text-xl font-black text-zinc-900 dark:text-white flex items-center gap-2">
                  <Ticket className="w-5 h-5 text-indigo-600 dark:text-indigo-500" />
                  {t("customerDisplay.orderSummary")}
                </h3>
              </div>

              {/* MOVIE, STUDIO, SHOWTIME SPECS */}
              <div className="shrink-0 flex flex-col gap-2.5 bg-zinc-50 dark:bg-zinc-950/80 p-3.5 rounded-2xl border border-zinc-200 dark:border-zinc-800/90 shadow-sm dark:shadow-inner transition-colors duration-200">
                {/* 1. FILM / MOVIE */}
                <div className="space-y-0.5">
                  <span className="text-[10px] font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider block">
                    {t("customerDisplay.movie")}
                  </span>
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-base xl:text-lg font-bold text-zinc-950 dark:text-white leading-tight">
                      {movie.title}
                    </p>
                    {movie.censorshipRating && (
                      <span className="text-[10px] px-2 py-0.5 rounded font-bold bg-zinc-200 dark:bg-zinc-800 text-zinc-800 dark:text-zinc-300 border border-zinc-300 dark:border-zinc-700">
                        {movie.censorshipRating}
                      </span>
                    )}
                  </div>
                </div>

                <div className="h-[1px] bg-zinc-200 dark:bg-zinc-800/80 w-full" />

                {/* 2. STUDIO */}
                <div className="space-y-0.5">
                  <span className="text-[10px] font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider block">
                    {t("customerDisplay.studio")}
                  </span>
                  <p className="text-sm xl:text-base font-bold text-emerald-600 dark:text-emerald-400 leading-tight">
                    {schedule.studioName}
                  </p>
                </div>

                <div className="h-[1px] bg-zinc-200 dark:bg-zinc-800/80 w-full" />

                {/* 3. JAM TAYANG / SHOWTIME */}
                <div className="space-y-0.5">
                  <span className="text-[10px] font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider block">
                    {t("customerDisplay.showtime")} & {t("customerDisplay.date")}
                  </span>
                  <p className="text-sm xl:text-base font-bold text-indigo-600 dark:text-indigo-400 flex items-center gap-1.5 leading-tight">
                    <Clock className="w-4 h-4 text-indigo-600 dark:text-indigo-400 shrink-0" />
                    <span>
                      {new Date(schedule.startTime).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                    </span>
                    <span className="text-xs font-medium text-zinc-500 dark:text-zinc-400">
                      • {new Date(schedule.businessDate || schedule.startTime).toLocaleDateString(
                        locale === "id" ? "id-ID" : "en-US",
                        { weekday: "short", day: "numeric", month: "short" }
                      )}
                    </span>
                  </p>
                </div>
              </div>

              {/* Selected Seats Badges */}
              <div className="flex-1 min-h-0 flex flex-col space-y-1.5 my-2 overflow-hidden">
                <div className="flex justify-between items-center text-xs font-bold text-zinc-500 dark:text-zinc-400 shrink-0">
                  <span>
                    {t("customerDisplay.selectedSeats")} ({quantity})
                  </span>
                </div>

                {quantity > 0 ? (
                  <div className="flex-1 min-h-0 overflow-y-auto flex flex-wrap content-start gap-1.5 p-2.5 bg-zinc-50 dark:bg-zinc-950/60 rounded-2xl border border-zinc-200 dark:border-zinc-800/80">
                    {selectedSeats.map((s) => (
                      <span
                        key={s.id}
                        className="px-2.5 py-1 bg-indigo-50 dark:bg-indigo-600/30 border border-indigo-200 dark:border-indigo-500/50 rounded-lg text-xs font-extrabold text-indigo-700 dark:text-indigo-200 flex items-center gap-1 shadow-sm"
                      >
                        <CheckCircle2 className="w-3 h-3 text-indigo-600 dark:text-indigo-400" />
                        {s.seat.seatLabel}
                      </span>
                    ))}
                  </div>
                ) : (
                  <div className="flex-1 flex items-center justify-center p-3 bg-zinc-50 dark:bg-zinc-950/40 rounded-2xl border border-dashed border-zinc-200 dark:border-zinc-800">
                    <p className="text-xs text-zinc-400 dark:text-zinc-500 italic">
                      {t("customerDisplay.noSeatsSelected")}
                    </p>
                  </div>
                )}
              </div>

              {/* Price Calculation & Grand Total */}
              <div className="shrink-0 border-t border-b border-zinc-200 dark:border-zinc-800 py-3 space-y-2">
                <div className="flex justify-between text-xs text-zinc-500 dark:text-zinc-400">
                  <span>{t("customerDisplay.ticketPrice")}</span>
                  <span className="font-medium text-zinc-800 dark:text-zinc-200">{formatCurrency(ticketPrice)}</span>
                </div>
                <div className="flex justify-between text-xs text-zinc-500 dark:text-zinc-400">
                  <span>{t("customerDisplay.tickets")}</span>
                  <span className="font-semibold text-zinc-800 dark:text-zinc-200">x{quantity}</span>
                </div>
                <div className="flex justify-between items-baseline pt-1.5 border-t border-zinc-200 dark:border-zinc-800/60">
                  <span className="text-sm font-bold text-zinc-700 dark:text-zinc-300">{t("customerDisplay.totalAmount")}</span>
                  <span className="text-2xl xl:text-3xl font-black text-emerald-600 dark:text-emerald-400 tracking-tight">
                    {formatCurrency(totalAmount)}
                  </span>
                </div>
              </div>

              {/* Live Connected Status */}
              <div className="shrink-0 flex items-center justify-center gap-2 text-[11px] font-semibold text-zinc-500 dark:text-zinc-400 pt-2">
                <span className="w-2 h-2 rounded-full bg-emerald-500 dark:bg-emerald-400 animate-pulse" />
                <span>{t("customerDisplay.liveConnected")}</span>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* 3. FOOTER (Fixed height: ~36px) */}
      <footer className="h-9 shrink-0 w-full bg-white/80 dark:bg-zinc-900/80 border-t border-zinc-200 dark:border-zinc-800 px-6 flex items-center justify-center text-[11px] text-zinc-500 transition-colors duration-200">
        Planet Cinema POS Customer View • Realtime Multi-Monitor Integration
      </footer>
    </div>
  );
}
