"use client";

import React, { useState } from "react";
import { Percent } from "lucide-react";
import { useTranslation } from "@/lib/i18n";

interface GenreShareItem {
  id: string;
  name: string;
  moviesCount: number;
  totalRevenue: number;
  totalTickets: number;
  revenueShare: number;
  ticketShare: number;
}

interface AnalyticsGenreMarketShareProps {
  genres: GenreShareItem[];
}

export const AnalyticsGenreMarketShare: React.FC<AnalyticsGenreMarketShareProps> = ({ genres = [] }) => {
  const { t, formatCurrency, formatNumber } = useTranslation();
  const [genreShareMode, setGenreShareMode] = useState<"revenue" | "ticket">("revenue");

  return (
    <div className="bg-white dark:bg-zinc-900 p-6 rounded-3xl border border-zinc-200 dark:border-zinc-800 shadow-sm space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h3 className="text-lg font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
            <Percent className="w-5 h-5 text-indigo-600" />
            {t("analytics.genreMarketShareTitle")}
          </h3>
          <p className="text-xs text-zinc-400 mt-0.5">
            {t("analytics.genreMarketShareSubtitle")}
          </p>
        </div>

        <div className="flex items-center p-1 bg-zinc-100 dark:bg-zinc-800 rounded-2xl border border-zinc-200/80 dark:border-zinc-700/80">
          <button
            type="button"
            onClick={() => setGenreShareMode("revenue")}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
              genreShareMode === "revenue"
                ? "bg-white dark:bg-zinc-900 text-indigo-600 dark:text-indigo-400 shadow-sm"
                : "text-zinc-600 dark:text-zinc-400"
            }`}
          >
            {t("analytics.revenueShareTab")}
          </button>
          <button
            type="button"
            onClick={() => setGenreShareMode("ticket")}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
              genreShareMode === "ticket"
                ? "bg-white dark:bg-zinc-900 text-indigo-600 dark:text-indigo-400 shadow-sm"
                : "text-zinc-600 dark:text-zinc-400"
            }`}
          >
            {t("analytics.ticketShareTab")}
          </button>
        </div>
      </div>

      {/* Progress Bars per Genre */}
      <div className="space-y-4 pt-2">
        {genres.map((g, idx) => {
          const sharePercent = genreShareMode === "revenue" ? g.revenueShare : g.ticketShare;
          const colors = [
            "bg-indigo-500",
            "bg-emerald-500",
            "bg-amber-500",
            "bg-pink-500",
            "bg-purple-500",
            "bg-cyan-500",
            "bg-rose-500",
            "bg-orange-500",
          ];
          const barColor = colors[idx % colors.length];

          return (
            <div key={g.id} className="space-y-1.5">
              <div className="flex items-center justify-between text-xs font-bold">
                <div className="flex items-center gap-2">
                  <span className="text-zinc-900 dark:text-zinc-100">{g.name}</span>
                  <span className="text-[11px] font-normal text-zinc-400">
                    {t("analytics.showingMoviesCountShort", { count: g.moviesCount })}
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-zinc-500 font-medium">
                    {genreShareMode === "revenue"
                      ? formatCurrency(g.totalRevenue)
                      : `${formatNumber(g.totalTickets)} ${t("analytics.ticketsUnit")}`}
                  </span>
                  <span className="font-extrabold text-zinc-900 dark:text-zinc-100 min-w-[45px] text-right">
                    {sharePercent}%
                  </span>
                </div>
              </div>
              <div className="h-3 w-full bg-zinc-100 dark:bg-zinc-800 rounded-full overflow-hidden">
                <div
                  className={`h-full ${barColor} rounded-full transition-all duration-700`}
                  style={{ width: `${Math.min(100, Math.max(1, sharePercent))}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
