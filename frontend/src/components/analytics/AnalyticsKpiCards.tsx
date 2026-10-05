"use client";

import React from "react";
import { Ticket, Activity, Award, Clock } from "lucide-react";
import { useTranslation } from "@/lib/i18n";

interface AnalyticsKpiCardsProps {
  summary?: {
    totalTickets?: number;
    averageOccupancy?: number;
    averageTicketsPerShow?: number;
    totalShowtimes?: number;
    topMovie?: {
      title?: string;
      tickets?: number;
      occupancy?: number;
    };
    peakTimeSlot?: {
      label?: string;
      timeRange?: string;
      revenue?: number;
    };
  };
}

export const AnalyticsKpiCards: React.FC<AnalyticsKpiCardsProps> = ({ summary }) => {
  const { t, formatNumber, formatCurrency } = useTranslation();

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {/* KPI 1: Total Tiket Terjual */}
      <div className="p-5 rounded-3xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-sm space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold text-zinc-400 uppercase tracking-wider">
            {t("analytics.totalTickets")}
          </span>
          <div className="w-8 h-8 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
            <Ticket className="w-4 h-4" />
          </div>
        </div>
        <div>
          <div className="text-2xl font-black text-zinc-900 dark:text-zinc-50">
            {formatNumber(summary?.totalTickets || 0)}
            <span className="text-xs font-normal text-zinc-400 ml-1.5">{t("analytics.ticketsUnit")}</span>
          </div>
          <div className="text-xs text-zinc-500 dark:text-zinc-400 mt-1 flex items-center gap-2">
            <span>{t("analytics.occupancyPercent")}</span>
            <span className="font-bold text-indigo-600 dark:text-indigo-400">
              {summary?.averageOccupancy || 0}%
            </span>
          </div>
        </div>
      </div>

      {/* KPI 2: Rata-rata Tiket / Show */}
      <div className="p-5 rounded-3xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-sm space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold text-zinc-400 uppercase tracking-wider">
            {t("analytics.ticketsPerShow")}
          </span>
          <div className="w-8 h-8 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
            <Activity className="w-4 h-4" />
          </div>
        </div>
        <div>
          <div className="text-2xl font-black text-zinc-900 dark:text-zinc-50">
            {summary?.averageTicketsPerShow || 0}
            <span className="text-xs font-normal text-zinc-400 ml-1.5">{t("analytics.ticketsUnit")}/show</span>
          </div>
          <div className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
            {t("analytics.fromShowtimesCount", { count: formatNumber(summary?.totalShowtimes || 0) })}
          </div>
        </div>
      </div>

      {/* KPI 3: Top Performing Movie */}
      <div className="p-5 rounded-3xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-sm space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold text-zinc-400 uppercase tracking-wider">
            {t("analytics.topMovie")}
          </span>
          <div className="w-8 h-8 rounded-xl bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 flex items-center justify-center">
            <Award className="w-4 h-4" />
          </div>
        </div>
        <div>
          <div className="text-sm font-extrabold text-zinc-900 dark:text-zinc-50 truncate" title={summary?.topMovie?.title || "-"}>
            {summary?.topMovie?.title || "-"}
          </div>
          <div className="text-xs text-zinc-500 dark:text-zinc-400 mt-1 flex items-center justify-between">
            <span>{formatNumber(summary?.topMovie?.tickets || 0)} {t("analytics.ticketsUnit")}</span>
            <span className="font-bold text-emerald-600 dark:text-emerald-400">
              {summary?.topMovie?.occupancy || 0}% {t("analytics.tableOccupancy")}
            </span>
          </div>
        </div>
      </div>

      {/* KPI 4: Jam Tayang Paling Menghasilkan */}
      <div className="p-5 rounded-3xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-sm space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold text-zinc-400 uppercase tracking-wider">
            {t("analytics.peakShowtime")}
          </span>
          <div className="w-8 h-8 rounded-xl bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 flex items-center justify-center">
            <Clock className="w-4 h-4" />
          </div>
        </div>
        <div>
          <div className="text-base font-black text-zinc-900 dark:text-zinc-50 truncate">
            {summary?.peakTimeSlot?.label || "18:00 - 21:00"}
          </div>
          <div className="text-xs text-zinc-500 dark:text-zinc-400 mt-1 flex items-center justify-between">
            <span>{summary?.peakTimeSlot?.timeRange || "-"}</span>
            <span className="font-bold text-indigo-600 dark:text-indigo-400">
              {formatCurrency(summary?.peakTimeSlot?.revenue || 0)}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
