"use client";

import React from "react";
import { Seat } from "@/services/studioApi";

interface SeatGridCanvasProps {
  cols: number[];
  visualRows: string[];
  emptyColumns: Set<number>;
  getSeatAt: (row: string, col: number) => Seat | undefined;
  getSeatColor: (seat: Seat) => string;
  onCellClick: (row: string, col: number) => void;
}

export function SeatGridCanvas({
  cols,
  visualRows,
  emptyColumns,
  getSeatAt,
  getSeatColor,
  onCellClick,
}: SeatGridCanvasProps) {
  return (
    <div className="p-6 sm:p-10 bg-zinc-100 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-3xl overflow-x-auto flex flex-col items-center shadow-inner">
      {/* Modern Curved Cinema Screen Bar */}
      <div className="w-full max-w-3xl mb-12 flex flex-col items-center">
        <div className="w-full h-3 bg-gradient-to-r from-transparent via-indigo-500/80 to-transparent rounded-full shadow-[0_0_24px_rgba(99,102,241,0.5)] border-t border-indigo-300/40" />
        <div className="mt-2 text-[11px] font-extrabold tracking-[0.3em] text-zinc-500 dark:text-zinc-400 uppercase text-center flex items-center gap-2">
          <span>—</span>
          <span>LAYAR BIOSKOP / SCREEN</span>
          <span>—</span>
        </div>
      </div>

      {/* Column Number Headers (Top) */}
      <div className="flex gap-2 items-center mb-3 select-none">
        <div className="w-8 text-center text-[10px] font-bold text-zinc-400">ROW</div>
        {cols.map((col) => {
          const isAisle = emptyColumns.has(col);
          return (
            <div
              key={`col-hdr-${col}`}
              className={`w-9 sm:w-10 text-center text-[10px] font-mono font-bold ${
                isAisle ? "text-zinc-350 dark:text-zinc-650" : "text-zinc-400 dark:text-zinc-500"
              }`}
              title={isAisle ? `Kolom ${col} (Lorong / Aisle)` : `Kolom ${col}`}
            >
              {col}
            </div>
          );
        })}
        <div className="w-8 text-center text-[10px] font-bold text-zinc-400">ROW</div>
      </div>

      {/* Grid layout */}
      <div className="grid gap-2.5 select-none">
        {visualRows.map((row) => (
          <div key={row} className="flex gap-2 items-center">
            {/* Left Row Label */}
            <div className="w-8 h-9 sm:h-10 flex items-center justify-center font-bold text-zinc-600 dark:text-zinc-300 text-xs sm:text-sm bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg shadow-2xs">
              {row}
            </div>

            {/* Seats inside row */}
            {cols.map((col) => {
              const seat = getSeatAt(row, col);
              const isAisleCol = emptyColumns.has(col);

              if (!seat && isAisleCol) {
                return (
                  <button
                    key={`aisle-${row}-${col}`}
                    type="button"
                    onClick={() => onCellClick(row, col)}
                    title={`Lorong Kolom ${col} (Klik untuk tambah kursi pada baris ${row})`}
                    className="w-9 sm:w-10 h-9 sm:h-10 flex items-center justify-center rounded-xl border border-dashed border-zinc-250 dark:border-zinc-850 hover:border-indigo-400 hover:bg-indigo-50/30 dark:hover:bg-indigo-950/20 text-transparent hover:text-indigo-400 text-[10px] transition-all cursor-pointer"
                  >
                    +
                  </button>
                );
              }

              return (
                <button
                  key={`${row}-${col}`}
                  type="button"
                  onClick={() => onCellClick(row, col)}
                  title={
                    seat
                      ? `${seat.seatLabel} (Tipe: ${seat.seatType}, Status: ${seat.status})`
                      : `Slot Kosong ${row}${col} (Klik untuk pasang kursi)`
                  }
                  className={`w-9 sm:w-10 h-9 sm:h-10 rounded-xl text-[10px] sm:text-xs font-bold transition-all hover:scale-105 border flex items-center justify-center cursor-pointer shadow-xs ${
                    seat
                      ? getSeatColor(seat)
                      : "bg-white/80 dark:bg-zinc-900/80 border-dashed border-zinc-300 dark:border-zinc-750 text-zinc-350 dark:text-zinc-600 hover:text-zinc-600 dark:hover:text-zinc-300 hover:border-zinc-400 dark:hover:border-zinc-600"
                  }`}
                >
                  {seat ? seat.seatLabel : `${row}${col}`}
                </button>
              );
            })}

            {/* Right Row Label */}
            <div className="w-8 h-9 sm:h-10 flex items-center justify-center font-bold text-zinc-600 dark:text-zinc-300 text-xs sm:text-sm bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg shadow-2xs">
              {row}
            </div>
          </div>
        ))}
      </div>

      {/* Column Number Headers (Bottom) */}
      <div className="flex gap-2 items-center mt-3 select-none">
        <div className="w-8 text-center text-[10px] font-bold text-zinc-400">ROW</div>
        {cols.map((col) => {
          const isAisle = emptyColumns.has(col);
          return (
            <div
              key={`col-ftr-${col}`}
              className={`w-9 sm:w-10 text-center text-[10px] font-mono font-bold ${
                isAisle ? "text-zinc-350 dark:text-zinc-650" : "text-zinc-400 dark:text-zinc-500"
              }`}
            >
              {col}
            </div>
          );
        })}
        <div className="w-8 text-center text-[10px] font-bold text-zinc-400">ROW</div>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-4 sm:gap-6 justify-center mt-12 pt-6 border-t border-zinc-200 dark:border-zinc-800 w-full max-w-2xl text-xs font-semibold text-zinc-600 dark:text-zinc-400">
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-indigo-600 rounded-md shadow-xs" /> Regular
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-amber-500 rounded-md shadow-xs" /> VIP
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-rose-500 rounded-md shadow-xs" /> Couple
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-blue-500 rounded-md shadow-xs" /> Wheelchair
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-zinc-300 dark:bg-zinc-800 rounded-md shadow-xs" /> Nonaktif
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-white dark:bg-zinc-900 border border-dashed border-zinc-300 dark:border-zinc-700 rounded-md shadow-xs" />{" "}
          Slot Kosong / Lorong
        </div>
      </div>
    </div>
  );
}
