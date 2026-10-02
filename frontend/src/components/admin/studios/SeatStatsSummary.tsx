"use client";

import React from "react";
import { Seat } from "@/services/studioApi";

interface SeatStatsSummaryProps {
  localSeats: Seat[];
  rowsCount: number;
  colsCount: number;
}

export function SeatStatsSummary({ localSeats, rowsCount, colsCount }: SeatStatsSummaryProps) {
  const activeSeats = localSeats.filter((s) => s.status === "ACTIVE");

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3">
      <div className="p-3.5 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-xs">
        <span className="text-[11px] font-semibold text-zinc-400 block uppercase">Total Kapasitas</span>
        <span className="text-xl font-bold text-zinc-900 dark:text-zinc-100">
          {activeSeats.length} <span className="text-xs font-normal text-zinc-400">kursi</span>
        </span>
      </div>
      <div className="p-3.5 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-xs">
        <span className="text-[11px] font-semibold text-zinc-400 block uppercase">Regular</span>
        <span className="text-xl font-bold text-indigo-600 dark:text-indigo-400">
          {activeSeats.filter((s) => s.seatType === "REGULAR").length}
        </span>
      </div>
      <div className="p-3.5 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-xs">
        <span className="text-[11px] font-semibold text-zinc-400 block uppercase">VIP</span>
        <span className="text-xl font-bold text-amber-500">
          {activeSeats.filter((s) => s.seatType === "VIP").length}
        </span>
      </div>
      <div className="p-3.5 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-xs">
        <span className="text-[11px] font-semibold text-zinc-400 block uppercase">Couple</span>
        <span className="text-xl font-bold text-rose-500">
          {activeSeats.filter((s) => s.seatType === "COUPLE").length}
        </span>
      </div>
      <div className="p-3.5 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-xs">
        <span className="text-[11px] font-semibold text-zinc-400 block uppercase">Wheelchair</span>
        <span className="text-xl font-bold text-blue-500">
          {activeSeats.filter((s) => s.seatType === "WHEELCHAIR").length}
        </span>
      </div>
      <div className="p-3.5 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-xs">
        <span className="text-[11px] font-semibold text-zinc-400 block uppercase">Dimensi Grid</span>
        <span className="text-xl font-bold text-zinc-700 dark:text-zinc-300">
          {rowsCount} <span className="text-xs text-zinc-400">×</span> {colsCount}
        </span>
      </div>
    </div>
  );
}
