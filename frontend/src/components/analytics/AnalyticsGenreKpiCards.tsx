"use client";

import React from "react";
import { Shapes, Layers, Ticket, DollarSign } from "lucide-react";
import { useTranslation } from "@/lib/i18n";

interface AnalyticsGenreKpiCardsProps {
  summary?: {
    topGenre?: {
      name?: string;
      revenueShare?: number;
    };
    activeMoviesCount?: number;
    totalTickets?: number;
    totalRevenue?: number;
  };
  genresCount: number;
}

export const AnalyticsGenreKpiCards: React.FC<AnalyticsGenreKpiCardsProps> = ({
  summary,
  genresCount,
}) => {
  const { t, formatNumber, formatCurrency } = useTranslation();

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {/* KPI 1: Top Grossing Genre */}
      <div className="p-5 rounded-3xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-sm space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold text-zinc-400 uppercase tracking-wider">
            {t("analytics.topGenre")}
          </span>
          <div className="w-8 h-8 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
            <Shapes className="w-4 h-4" />
          </div>
        </div>
        <div>
          <div className="text-xl font-black text-zinc-900 dark:text-zinc-50 truncate">
            {summary?.topGenre?.name || "-"}
          </div>
          <div className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
            {t("analytics.marketShareLabel")}{" "}
            <span className="font-bold text-indigo-600 dark:text-indigo-400">
              {summary?.topGenre?.revenueShare || 0}%
            </span>
          </div>
        </div>
      </div>

      {/* KPI 2: Total Genre Aktif */}
      <div className="p-5 rounded-3xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-sm space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold text-zinc-400 uppercase tracking-wider">
            {t("analytics.activeGenres")}
          </span>
          <div className="w-8 h-8 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
            <Layers className="w-4 h-4" />
          </div>
        </div>
        <div>
          <div className="text-2xl font-black text-zinc-900 dark:text-zinc-50">
            {genresCount}
            <span className="text-xs font-normal text-zinc-400 ml-1.5">
              {t("analytics.tableGenreName")}
            </span>
          </div>
          <div className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
            {t("analytics.showingMoviesCount", { count: summary?.activeMoviesCount || 0 })}
          </div>
        </div>
      </div>

      {/* KPI 3: Rata-rata Tiket / Genre */}
      <div className="p-5 rounded-3xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-sm space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold text-zinc-400 uppercase tracking-wider">
            {t("analytics.avgTicketsPerGenre")}
          </span>
          <div className="w-8 h-8 rounded-xl bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 flex items-center justify-center">
            <Ticket className="w-4 h-4" />
          </div>
        </div>
        <div>
          <div className="text-2xl font-black text-zinc-900 dark:text-zinc-50">
            {genresCount > 0
              ? formatNumber(Math.round((summary?.totalTickets || 0) / genresCount))
              : 0}
            <span className="text-xs font-normal text-zinc-400 ml-1.5">
              {t("analytics.ticketsUnit")}
            </span>
          </div>
          <div className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
            {t("analytics.avgPerGenreCategory")}
          </div>
        </div>
      </div>

      {/* KPI 4: Total Pendapatan Genre */}
      <div className="p-5 rounded-3xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-sm space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold text-zinc-400 uppercase tracking-wider">
            {t("analytics.totalGrossRevenue")}
          </span>
          <div className="w-8 h-8 rounded-xl bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 flex items-center justify-center">
            <DollarSign className="w-4 h-4" />
          </div>
        </div>
        <div>
          <div className="text-xl font-black text-zinc-900 dark:text-zinc-50 truncate">
            {formatCurrency(summary?.totalRevenue || 0)}
          </div>
          <div className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
            {t("analytics.ticketsSoldUnit", { count: formatNumber(summary?.totalTickets || 0) })}
          </div>
        </div>
      </div>
    </div>
  );
};
