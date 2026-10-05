"use client";

import React from "react";
import { SlidersHorizontal } from "lucide-react";
import { useTranslation } from "@/lib/i18n";

interface WeekdayWeekendData {
  weekendLiftPercentage: number;
  weekday?: {
    ticketsPerShow: number;
    occupancy: number;
  };
  weekend?: {
    ticketsPerShow: number;
    occupancy: number;
  };
}

interface AnalyticsWeekdayWeekendCardProps {
  data?: WeekdayWeekendData;
}

export const AnalyticsWeekdayWeekendCard: React.FC<AnalyticsWeekdayWeekendCardProps> = ({ data }) => {
  const { t } = useTranslation();

  return (
    <div className="bg-white dark:bg-zinc-900 p-6 rounded-3xl border border-zinc-200 dark:border-zinc-800 shadow-sm space-y-4">
      <div>
        <h3 className="text-base font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
          <SlidersHorizontal className="w-5 h-5 text-indigo-600" />
          {t("analytics.weekdayWeekendTitle")}
        </h3>
        <p className="text-xs text-zinc-400 mt-0.5">
          {t("analytics.weekdayWeekendSubtitle")}
        </p>
      </div>

      <div className="p-4 rounded-2xl bg-indigo-50/60 dark:bg-indigo-950/40 border border-indigo-200/60 dark:border-indigo-800/60 text-center space-y-1">
        <span className="text-[11px] font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider">
          {t("analytics.weekendLift")}
        </span>
        <div className="text-3xl font-black text-indigo-700 dark:text-indigo-300">
          {(data?.weekendLiftPercentage || 0) > 0 ? "+" : ""}
          {data?.weekendLiftPercentage || 0}%
        </div>
        <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
          {t("analytics.weekendLiftDesc")}
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3 pt-1">
        <div className="p-3.5 rounded-2xl bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200/60 dark:border-zinc-700/60 space-y-1">
          <div className="text-xs font-bold text-zinc-500">
            {t("analytics.weekdayRange")}
          </div>
          <div className="text-lg font-black text-zinc-900 dark:text-zinc-100">
            {data?.weekday?.ticketsPerShow || 0}
            <span className="text-[10px] font-normal text-zinc-400 ml-1">
              {t("analytics.ticketsUnit")}/show
            </span>
          </div>
          <div className="text-xs font-semibold text-zinc-600 dark:text-zinc-400">
            {data?.weekday?.occupancy || 0}% {t("analytics.tableOccupancy")}
          </div>
        </div>

        <div className="p-3.5 rounded-2xl bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200/60 dark:border-zinc-700/60 space-y-1">
          <div className="text-xs font-bold text-emerald-600">
            {t("analytics.weekendRange")}
          </div>
          <div className="text-lg font-black text-zinc-900 dark:text-zinc-100">
            {data?.weekend?.ticketsPerShow || 0}
            <span className="text-[10px] font-normal text-zinc-400 ml-1">
              {t("analytics.ticketsUnit")}/show
            </span>
          </div>
          <div className="text-xs font-semibold text-emerald-600 dark:text-emerald-400">
            {data?.weekend?.occupancy || 0}% {t("analytics.tableOccupancy")}
          </div>
        </div>
      </div>
    </div>
  );
};
