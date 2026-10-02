"use client";

import React from "react";
import { Film, Calendar, Clock } from "lucide-react";
import { Schedule } from "@/services/studioApi";
import { useTranslation } from "@/lib/i18n";

interface CheckoutMovieHeaderProps {
  schedule: Schedule | null;
  ticketPrice: number;
}

export function CheckoutMovieHeader({ schedule, ticketPrice }: CheckoutMovieHeaderProps) {
  const { formatDate, formatCurrency } = useTranslation();

  if (!schedule) return null;

  return (
    <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl p-4 sm:p-5 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
      <div className="flex items-center gap-4">
        <div className="w-14 h-18 sm:w-16 sm:h-22 rounded-2xl overflow-hidden bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 shrink-0">
          {schedule.movie?.poster ? (
            <img src={schedule.movie.poster} alt={schedule.movie.title} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-zinc-400">
              <Film className="w-6 h-6" />
            </div>
          )}
        </div>
        <div className="space-y-1">
          <h1 className="text-base sm:text-lg font-black text-zinc-900 dark:text-zinc-50 line-clamp-1">
            {schedule.movie?.title}
          </h1>
          <div className="flex flex-wrap items-center gap-2 text-xs text-zinc-500 dark:text-zinc-400">
            <span className="px-2 py-0.5 rounded-md bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 font-bold border border-indigo-150 dark:border-indigo-900">
              {schedule.studio?.name}
            </span>
            <span>•</span>
            <div className="flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5 text-zinc-400" />
              <span>{formatDate(schedule.businessDate || schedule.startTime)}</span>
            </div>
            <span>•</span>
            <div className="flex items-center gap-1 font-bold text-zinc-800 dark:text-zinc-200">
              <Clock className="w-3.5 h-3.5 text-emerald-500" />
              <span>
                {new Date(schedule.startTime).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", hour12: false })}
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
  );
}
