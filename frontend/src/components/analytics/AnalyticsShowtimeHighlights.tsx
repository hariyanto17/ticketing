"use client";

import React from "react";
import { Flame, AlertTriangle } from "lucide-react";
import { useTranslation } from "@/lib/i18n";

interface ShowtimeHighlightItem {
  showtimeId: string;
  movieTitle: string;
  studioName: string;
  displayDate: string;
  time: string;
  occupancy: number;
  tickets: number;
  capacity: number;
}

interface AnalyticsShowtimeHighlightsProps {
  bestShows: ShowtimeHighlightItem[];
  underperformingShows: ShowtimeHighlightItem[];
}

export const AnalyticsShowtimeHighlights: React.FC<AnalyticsShowtimeHighlightsProps> = ({
  bestShows = [],
  underperformingShows = [],
}) => {
  const { t } = useTranslation();

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Top Performing Shows */}
      <div className="bg-white dark:bg-zinc-900 p-6 rounded-3xl border border-zinc-200 dark:border-zinc-800 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-base font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
            <Flame className="w-5 h-5 text-emerald-500" />
            {t("analytics.bestShowsTitle")}
          </h3>
          <span className="text-[11px] font-bold text-emerald-600 bg-emerald-50 dark:bg-emerald-950/40 px-2.5 py-1 rounded-xl">
            {t("analytics.topOccupancyBadge")}
          </span>
        </div>

        <div className="space-y-2.5">
          {bestShows.slice(0, 5).map((s, idx) => (
            <div
              key={s.showtimeId || idx}
              className="p-3.5 rounded-2xl bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200/60 dark:border-zinc-700/60 flex items-center justify-between gap-3"
            >
              <div className="min-w-0">
                <div className="font-extrabold text-xs text-zinc-900 dark:text-zinc-100 truncate">
                  {s.movieTitle}
                </div>
                <div className="text-[11px] text-zinc-400 mt-0.5">
                  {s.displayDate} • {s.time} • <span className="font-semibold text-zinc-600 dark:text-zinc-300">{s.studioName}</span>
                </div>
              </div>
              <div className="text-right flex-shrink-0">
                <div className="text-sm font-black text-emerald-600 dark:text-emerald-400">
                  {s.occupancy}%
                </div>
                <div className="text-[10px] text-zinc-400">
                  {s.tickets}/{s.capacity} {t("analytics.ticketsUnit")}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Underperforming Shows */}
      <div className="bg-white dark:bg-zinc-900 p-6 rounded-3xl border border-zinc-200 dark:border-zinc-800 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-base font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-rose-500" />
            {t("analytics.underperformingShowsTitle")}
          </h3>
          <span className="text-[11px] font-bold text-rose-600 bg-rose-50 dark:bg-rose-950/40 px-2.5 py-1 rounded-xl">
            {t("analytics.needEvaluationBadge")}
          </span>
        </div>

        <div className="space-y-2.5">
          {underperformingShows.slice(0, 5).map((s, idx) => (
            <div
              key={s.showtimeId || idx}
              className="p-3.5 rounded-2xl bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200/60 dark:border-zinc-700/60 flex items-center justify-between gap-3"
            >
              <div className="min-w-0">
                <div className="font-extrabold text-xs text-zinc-900 dark:text-zinc-100 truncate">
                  {s.movieTitle}
                </div>
                <div className="text-[11px] text-zinc-400 mt-0.5">
                  {s.displayDate} • {s.time} • <span className="font-semibold text-zinc-600 dark:text-zinc-300">{s.studioName}</span>
                </div>
              </div>
              <div className="text-right flex-shrink-0">
                <div className="text-sm font-black text-rose-600 dark:text-rose-400">
                  {s.occupancy}%
                </div>
                <div className="text-[10px] text-zinc-400">
                  {s.tickets}/{s.capacity} {t("analytics.ticketsUnit")}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
