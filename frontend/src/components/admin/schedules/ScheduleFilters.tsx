"use client";

import React from "react";
import { Search, Building2, Armchair } from "lucide-react";
import { useTranslation } from "@/lib/i18n";
import { Studio } from "@/services/studioApi";

interface ScheduleFiltersProps {
  filterMode: "active" | "today" | "all" | "custom";
  setFilterMode: (mode: "active" | "today" | "all" | "custom") => void;
  customStartDate: string;
  setCustomStartDate: (val: string) => void;
  customEndDate: string;
  setCustomEndDate: (val: string) => void;
  searchQuery: string;
  setSearchQuery: (val: string) => void;
  selectedStudioFilter: string;
  setSelectedStudioFilter: (val: string) => void;
  studios: Studio[] | undefined;
  totalSchedulesCount: number;
  getStudioScheduleCount: (studioId: string) => number;
}

export function ScheduleFilters({
  filterMode,
  setFilterMode,
  customStartDate,
  setCustomStartDate,
  customEndDate,
  setCustomEndDate,
  searchQuery,
  setSearchQuery,
  selectedStudioFilter,
  setSelectedStudioFilter,
  studios,
  totalSchedulesCount,
  getStudioScheduleCount,
}: ScheduleFiltersProps) {
  const { t } = useTranslation();

  return (
    <div className="bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800/80 rounded-2xl p-4 shadow-2xs space-y-3.5">
      {/* Row 1: Date Filter Mode & Search */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        {/* Date Segmented Control */}
        <div className="flex items-center gap-1 bg-zinc-100 dark:bg-zinc-800/70 p-1 rounded-xl overflow-x-auto scrollbar-none">
          <button
            type="button"
            onClick={() => setFilterMode("active")}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
              filterMode === "active"
                ? "bg-white dark:bg-zinc-700 text-zinc-900 dark:text-zinc-50 shadow-2xs"
                : "text-zinc-500 dark:text-zinc-400 hover:text-zinc-800 dark:hover:text-zinc-200"
            }`}
          >
            {t("schedules.filterActive")}
          </button>
          <button
            type="button"
            onClick={() => setFilterMode("today")}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
              filterMode === "today"
                ? "bg-white dark:bg-zinc-700 text-zinc-900 dark:text-zinc-50 shadow-2xs"
                : "text-zinc-500 dark:text-zinc-400 hover:text-zinc-800 dark:hover:text-zinc-200"
            }`}
          >
            {t("schedules.filterToday")}
          </button>
          <button
            type="button"
            onClick={() => setFilterMode("all")}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
              filterMode === "all"
                ? "bg-white dark:bg-zinc-700 text-zinc-900 dark:text-zinc-50 shadow-2xs"
                : "text-zinc-500 dark:text-zinc-400 hover:text-zinc-800 dark:hover:text-zinc-200"
            }`}
          >
            {t("schedules.filterAll")}
          </button>
          <button
            type="button"
            onClick={() => setFilterMode("custom")}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
              filterMode === "custom"
                ? "bg-white dark:bg-zinc-700 text-zinc-900 dark:text-zinc-50 shadow-2xs"
                : "text-zinc-500 dark:text-zinc-400 hover:text-zinc-800 dark:hover:text-zinc-200"
            }`}
          >
            {t("schedules.filterCustom")}
          </button>
        </div>

        {/* Custom Date Range Picker */}
        {filterMode === "custom" && (
          <div className="flex flex-wrap items-center gap-2 bg-zinc-50 dark:bg-zinc-800/40 px-3 py-1.5 rounded-xl border border-zinc-200/80 dark:border-zinc-800">
            <span className="text-xs font-medium text-zinc-500 dark:text-zinc-400">{t("schedules.filterFrom")}:</span>
            <input
              type="date"
              value={customStartDate}
              onChange={(e) => setCustomStartDate(e.target.value)}
              className="px-2 py-1 bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg text-xs text-zinc-900 dark:text-zinc-100 focus:outline-none"
            />
            <span className="text-xs font-medium text-zinc-500 dark:text-zinc-400">{t("schedules.filterTo")}:</span>
            <input
              type="date"
              value={customEndDate}
              onChange={(e) => setCustomEndDate(e.target.value)}
              className="px-2 py-1 bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg text-xs text-zinc-900 dark:text-zinc-100 focus:outline-none"
            />
          </div>
        )}

        {/* Search Box */}
        <div className="relative min-w-[220px]">
          <Search className="w-3.5 h-3.5 text-zinc-400 dark:text-zinc-500 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={t("schedules.search")}
            className="w-full pl-8.5 pr-3 py-1.5 bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-200/80 dark:border-zinc-800 rounded-xl text-xs focus:outline-none focus:bg-white dark:focus:bg-zinc-900 focus:border-zinc-400 dark:focus:border-zinc-600 text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 transition-colors"
          />
        </div>
      </div>

      {/* Row 2: Studio Selector Pills */}
      <div className="flex items-center gap-1.5 overflow-x-auto pt-1 border-t border-zinc-100 dark:border-zinc-800/60 scrollbar-none">
        <button
          type="button"
          onClick={() => setSelectedStudioFilter("ALL")}
          className={`px-3 py-1.5 rounded-xl text-xs font-medium whitespace-nowrap transition-all cursor-pointer flex items-center gap-1.5 ${
            selectedStudioFilter === "ALL"
              ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 shadow-2xs font-semibold"
              : "bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200/70 dark:border-zinc-800 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 hover:text-zinc-900 dark:hover:text-zinc-200"
          }`}
        >
          <Building2 className="w-3.5 h-3.5" />
          <span>{t("schedules.allStudios")}</span>
          <span
            className={`px-1.5 py-0.2 rounded-md text-[10px] font-mono ${
              selectedStudioFilter === "ALL"
                ? "bg-white/20 text-white dark:bg-zinc-900/15 dark:text-zinc-900"
                : "bg-zinc-200/70 dark:bg-zinc-700 text-zinc-600 dark:text-zinc-300"
            }`}
          >
            {totalSchedulesCount}
          </span>
        </button>

        {studios?.map((st) => {
          const count = getStudioScheduleCount(st.id);
          const isSelected = selectedStudioFilter === st.id;
          return (
            <button
              key={st.id}
              type="button"
              onClick={() => setSelectedStudioFilter(st.id)}
              className={`px-3 py-1.5 rounded-xl text-xs font-medium whitespace-nowrap transition-all cursor-pointer flex items-center gap-1.5 ${
                isSelected
                  ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 shadow-2xs font-semibold"
                  : "bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200/70 dark:border-zinc-800 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 hover:text-zinc-900 dark:hover:text-zinc-200"
              }`}
            >
              <Armchair className="w-3.5 h-3.5" />
              <span>{st.name}</span>
              <span
                className={`px-1.5 py-0.2 rounded-md text-[10px] font-mono ${
                  isSelected
                    ? "bg-white/20 text-white dark:bg-zinc-900/15 dark:text-zinc-900"
                    : "bg-zinc-200/70 dark:bg-zinc-700 text-zinc-600 dark:text-zinc-300"
                }`}
              >
                {count}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
