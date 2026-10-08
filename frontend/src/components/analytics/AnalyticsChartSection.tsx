"use client";

import React from "react";
import { BarChart3 } from "lucide-react";
import { useTranslation } from "@/lib/i18n";
import MovieAnalyticsChart, { AnalyticsChartItem } from "@/components/analytics/MovieAnalyticsChart";

interface DailyTotalItem {
  date: string;
  dayName: string;
  dayShort: string;
  displayDate: string;
  totalTickets: number;
  totalRevenue: number;
  totalShowtimes: number;
}

interface AnalyticsChartSectionProps {
  title: string;
  subtitle: string;
  dailyTotals: DailyTotalItem[];
  chartItems: AnalyticsChartItem[];
  activeMetric: "revenue" | "tickets";
  setActiveMetric: (metric: "revenue" | "tickets") => void;
  chartType: "line" | "bar";
  setChartType: (type: "line" | "bar") => void;
  selectedItemId: string;
  setSelectedItemId: (id: string) => void;
  itemsList: Array<{ id: string; name: string }>;
  allOptionLabel: string;
}

export const AnalyticsChartSection: React.FC<AnalyticsChartSectionProps> = ({
  title,
  subtitle,
  dailyTotals,
  chartItems,
  activeMetric,
  setActiveMetric,
  chartType,
  setChartType,
  selectedItemId,
  setSelectedItemId,
  itemsList,
  allOptionLabel,
}) => {
  const { t } = useTranslation();

  return (
    <div className="bg-white dark:bg-zinc-900 p-6 rounded-3xl border border-zinc-200 dark:border-zinc-800 shadow-sm space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h3 className="text-lg font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-indigo-600" />
            {title}
          </h3>
          <p className="text-xs text-zinc-400 mt-0.5">{subtitle}</p>
        </div>

        {/* Chart Controls */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Metric Selector */}
          <div className="flex items-center p-1 bg-zinc-100 dark:bg-zinc-800 rounded-2xl border border-zinc-200/80 dark:border-zinc-700/80">
            <button
              type="button"
              onClick={() => setActiveMetric("revenue")}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                activeMetric === "revenue"
                  ? "bg-white dark:bg-zinc-900 text-indigo-600 dark:text-indigo-400 shadow-sm"
                  : "text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200"
              }`}
            >
              {t("analytics.metricRevenueShort")}
            </button>
            <button
              type="button"
              onClick={() => setActiveMetric("tickets")}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                activeMetric === "tickets"
                  ? "bg-white dark:bg-zinc-900 text-indigo-600 dark:text-indigo-400 shadow-sm"
                  : "text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200"
              }`}
            >
              {t("analytics.metricTicketsShort")}
            </button>
          </div>

          {/* Chart Type Selector */}
          <div className="flex items-center p-1 bg-zinc-100 dark:bg-zinc-800 rounded-2xl border border-zinc-200/80 dark:border-zinc-700/80">
            <button
              type="button"
              onClick={() => setChartType("line")}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                chartType === "line"
                  ? "bg-white dark:bg-zinc-900 text-indigo-600 dark:text-indigo-400 shadow-sm"
                  : "text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200"
              }`}
            >
              {t("analytics.chartLineShort")}
            </button>
            <button
              type="button"
              onClick={() => setChartType("bar")}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                chartType === "bar"
                  ? "bg-white dark:bg-zinc-900 text-indigo-600 dark:text-indigo-400 shadow-sm"
                  : "text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200"
              }`}
            >
              {t("analytics.chartBarShort")}
            </button>
          </div>

          {/* Filter Single Item */}
          <select
            value={selectedItemId}
            onChange={(e) => setSelectedItemId(e.target.value)}
            className="px-3 py-2 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-2xl text-xs font-semibold text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="ALL">{allOptionLabel}</option>
            {itemsList.map((item) => (
              <option key={item.id} value={item.id}>
                {item.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* D3 Render */}
      <MovieAnalyticsChart
        dailyTotals={dailyTotals}
        items={chartItems}
        activeMetric={activeMetric}
        chartType={chartType}
        selectedItemId={selectedItemId}
        onSelectItem={(id) => setSelectedItemId(id)}
        allLabel={allOptionLabel}
      />
    </div>
  );
};
