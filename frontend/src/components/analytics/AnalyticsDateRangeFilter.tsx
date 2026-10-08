"use client";

import React from "react";
import { Calendar } from "lucide-react";
import { DateTimePicker } from "@/components/ui/DateTimePicker";
import { useTranslation } from "@/lib/i18n";

export type RangePreset = "7d" | "14d" | "30d" | "custom";

interface AnalyticsDateRangeFilterProps {
  rangePreset: RangePreset;
  setRangePreset: (preset: RangePreset) => void;
  customStartDate: string;
  setCustomStartDate: (date: string) => void;
  customEndDate: string;
  setCustomEndDate: (date: string) => void;
  period?: {
    startDate: string;
    endDate: string;
    days: number;
  };
}

export const AnalyticsDateRangeFilter: React.FC<AnalyticsDateRangeFilterProps> = ({
  rangePreset,
  setRangePreset,
  customStartDate,
  setCustomStartDate,
  customEndDate,
  setCustomEndDate,
  period,
}) => {
  const { t } = useTranslation();

  return (
    <div className="bg-white dark:bg-zinc-900 p-5 rounded-3xl border border-zinc-200 dark:border-zinc-800 shadow-sm space-y-4">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
            <Calendar className="w-4 h-4" />
          </div>
          <div>
            <div className="text-xs font-black uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
              {t("analytics.filterDateRangeTitle")}
            </div>
            <div className="text-xs font-bold text-zinc-800 dark:text-zinc-200 mt-0.5">
              {period
                ? `${period.startDate} ${t("common.to") || "s.d."} ${period.endDate} (${period.days} ${t("common.days") || "Hari"})`
                : t("analytics.filterDateRangePrompt")}
            </div>
          </div>
        </div>

        {/* Preset Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setRangePreset("7d")}
            className={`px-4 py-2 rounded-2xl text-xs font-bold transition-all cursor-pointer ${
              rangePreset === "7d"
                ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/20"
                : "bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-700"
            }`}
          >
            {t("analytics.range7D")}
          </button>

          <button
            type="button"
            onClick={() => setRangePreset("14d")}
            className={`px-4 py-2 rounded-2xl text-xs font-bold transition-all cursor-pointer ${
              rangePreset === "14d"
                ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/20"
                : "bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-700"
            }`}
          >
            {t("analytics.range14D")}
          </button>

          <button
            type="button"
            onClick={() => setRangePreset("30d")}
            className={`px-4 py-2 rounded-2xl text-xs font-bold transition-all cursor-pointer ${
              rangePreset === "30d"
                ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/20"
                : "bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-700"
            }`}
          >
            {t("analytics.range30D")}
          </button>

          <button
            type="button"
            onClick={() => setRangePreset("custom")}
            className={`px-4 py-2 rounded-2xl text-xs font-bold transition-all cursor-pointer ${
              rangePreset === "custom"
                ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/20"
                : "bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-700"
            }`}
          >
            {t("analytics.rangeCustom")}
          </button>
        </div>
      </div>

      {/* Custom Date Pickers when 'custom' is selected */}
      {rangePreset === "custom" && (
        <div className="pt-3 border-t border-zinc-100 dark:border-zinc-800 flex flex-wrap items-center gap-3 bg-zinc-50 dark:bg-zinc-800/40 p-3.5 rounded-2xl">
          <span className="text-xs font-bold text-zinc-500 dark:text-zinc-400">
            {t("analytics.selectRange")}
          </span>
          <div className="w-48 sm:w-56">
            <DateTimePicker
              mode="date"
              placeholder={t("analytics.selectStartDate")}
              value={customStartDate || null}
              onChange={(val) => setCustomStartDate(val || "")}
            />
          </div>
          <span className="text-zinc-400 text-xs font-semibold">
            {t("common.to") || "s.d."}
          </span>
          <div className="w-48 sm:w-56">
            <DateTimePicker
              mode="date"
              placeholder={t("analytics.selectEndDate")}
              value={customEndDate || null}
              onChange={(val) => setCustomEndDate(val || "")}
            />
          </div>
          {(!customStartDate || !customEndDate) && (
            <span className="text-[11px] text-amber-600 dark:text-amber-400 font-medium">
              {t("analytics.selectBothDatesNotice")}
            </span>
          )}
        </div>
      )}
    </div>
  );
};
