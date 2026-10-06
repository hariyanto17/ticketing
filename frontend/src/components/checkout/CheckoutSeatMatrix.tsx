"use client";

import React, { useRef, useState, useEffect, useCallback, useMemo } from "react";
import { Armchair, ZoomIn, ZoomOut } from "lucide-react";
import { ShowtimeSeat, Schedule } from "@/services/studioApi";
import { groupSeatsByRow, getVisualRowOrder } from "@/lib/seatLayout";
import { useTranslation } from "@/lib/i18n";

interface CheckoutSeatMatrixProps {
  schedule: Schedule | null;
  showtimeSeats: ShowtimeSeat[];
  selectedSeats: ShowtimeSeat[];
  onSeatClick: (seat: ShowtimeSeat) => void;
}

const SEAT_SIZE = 38;
const SEAT_GAP = 6;
const ROW_LABEL_WIDTH = 24;
const SCREEN_BAR_HEIGHT = 44;
const MATRIX_PADDING = 20;

export function CheckoutSeatMatrix({
  schedule,
  showtimeSeats,
  selectedSeats,
  onSeatClick,
}: CheckoutSeatMatrixProps) {
  const { t } = useTranslation();
  const seatViewportRef = useRef<HTMLDivElement>(null);
  const [seatScale, setSeatScale] = useState<number>(1);
  const [manualZoom, setManualZoom] = useState<number>(1);

  const { rows, cols, seatsByRow } = useMemo(() => {
    const grouped = groupSeatsByRow(showtimeSeats.map((s) => ({ ...s, row: s.seat.row })));
    const visualRows = getVisualRowOrder(Object.keys(grouped));
    const maxColumn = showtimeSeats.length > 0 ? Math.max(...showtimeSeats.map((s) => s.seat.column), 12) : 12;
    const columns = Array.from({ length: maxColumn }, (_, i) => i + 1);

    return { rows: visualRows, cols: columns, seatsByRow: grouped };
  }, [showtimeSeats]);

  const naturalWidth = useMemo(() => {
    const numCols = cols.length || 1;
    return numCols * SEAT_SIZE + Math.max(0, numCols - 1) * SEAT_GAP + ROW_LABEL_WIDTH * 2 + MATRIX_PADDING;
  }, [cols.length]);

  const naturalHeight = useMemo(() => {
    const numRows = rows.length || 1;
    return SCREEN_BAR_HEIGHT + numRows * SEAT_SIZE + Math.max(0, numRows - 1) * SEAT_GAP + MATRIX_PADDING;
  }, [rows.length]);

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

  return (
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
                {schedule?.studio?.name || "Studio"}
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

      {/* Seat Grid Viewport */}
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
                  {/* Rows & Seats */}
                  <div className="flex flex-col gap-1.5 justify-center items-center w-full mb-6">
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
                              onClick={() => onSeatClick(seat)}
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

                  {/* Screen Curve (Below Seats) */}
                  <div className="w-full max-w-sm shrink-0 mt-1 flex flex-col items-center">
                    <span className="text-[10px] font-extrabold text-indigo-700 dark:text-indigo-300/80 tracking-[0.28em] uppercase mb-1">
                      {t("cashier.screen") || "LAYAR / SCREEN"}
                    </span>
                    <div className="w-full h-3 bg-gradient-to-t from-indigo-500/40 via-indigo-500/20 to-transparent rounded-b-[120px] border-b-2 border-indigo-500 dark:border-indigo-400 shadow-md shadow-indigo-500/20" />
                  </div>
              </div>
            </div>
          )}
        </div>

        {/* Legend */}
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
  );
}
