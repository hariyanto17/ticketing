"use client";

import React, { useState } from "react";
import { Grid3X3 } from "lucide-react";
import { useTranslation } from "@/lib/i18n";

export type HeatmapMetric = "occupancy" | "ticketsPerShow" | "revenuePerShow";

interface HeatmapCell {
  dayOfWeek: number;
  slotKey: string;
  occupancy: number;
  ticketsPerShow: number;
  revenuePerShow: number;
  showsCount: number;
  tickets: number;
}

interface AnalyticsHeatmapProps {
  showtimeHeatmap: HeatmapCell[];
}

export const AnalyticsHeatmap: React.FC<AnalyticsHeatmapProps> = ({ showtimeHeatmap = [] }) => {
  const { t } = useTranslation();
  const [heatmapMetric, setHeatmapMetric] = useState<HeatmapMetric>("occupancy");

  const dayList = [
    { dow: 1, name: t("analytics.days.monday") || "Senin" },
    { dow: 2, name: t("analytics.days.tuesday") || "Selasa" },
    { dow: 3, name: t("analytics.days.wednesday") || "Rabu" },
    { dow: 4, name: t("analytics.days.thursday") || "Kamis" },
    { dow: 5, name: t("analytics.days.friday") || "Jumat" },
    { dow: 6, name: t("analytics.days.saturday") || "Sabtu" },
    { dow: 0, name: t("analytics.days.sunday") || "Minggu" },
  ];

  return (
    <div className="bg-white dark:bg-zinc-900 p-6 rounded-3xl border border-zinc-200 dark:border-zinc-800 shadow-sm space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h3 className="text-lg font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
            <Grid3X3 className="w-5 h-5 text-indigo-600" />
            {t("analytics.heatmapTitle")}
          </h3>
          <p className="text-xs text-zinc-400 mt-0.5">
            {t("analytics.heatmapSubtitle")}
          </p>
        </div>

        {/* Heatmap Metric Selector */}
        <div className="flex items-center p-1 bg-zinc-100 dark:bg-zinc-800 rounded-2xl border border-zinc-200/80 dark:border-zinc-700/80">
          <button
            type="button"
            onClick={() => setHeatmapMetric("occupancy")}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
              heatmapMetric === "occupancy"
                ? "bg-white dark:bg-zinc-900 text-indigo-600 dark:text-indigo-400 shadow-sm"
                : "text-zinc-600 dark:text-zinc-400"
            }`}
          >
            {t("analytics.metrics.occupancy")}
          </button>
          <button
            type="button"
            onClick={() => setHeatmapMetric("ticketsPerShow")}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
              heatmapMetric === "ticketsPerShow"
                ? "bg-white dark:bg-zinc-900 text-indigo-600 dark:text-indigo-400 shadow-sm"
                : "text-zinc-600 dark:text-zinc-400"
            }`}
          >
            {t("analytics.metrics.ticketsPerShow")}
          </button>
          <button
            type="button"
            onClick={() => setHeatmapMetric("revenuePerShow")}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
              heatmapMetric === "revenuePerShow"
                ? "bg-white dark:bg-zinc-900 text-indigo-600 dark:text-indigo-400 shadow-sm"
                : "text-zinc-600 dark:text-zinc-400"
            }`}
          >
            {t("analytics.metrics.revenuePerShow")}
          </button>
        </div>
      </div>

      {/* Heatmap Grid */}
      <div className="overflow-x-auto">
        <div className="min-w-[500px] space-y-2">
          {/* Header slots */}
          <div className="grid grid-cols-5 gap-2.5 text-center text-xs font-bold text-zinc-400">
            <div className="text-left pl-2">{t("analytics.tableDate") || "Hari"}</div>
            <div>14:00 - 16:00</div>
            <div>16:00 - 18:00</div>
            <div>18:00 - 20:00</div>
            <div>20:00 - 22:00</div>
          </div>

          {/* Rows per Day of Week */}
          {dayList.map((d) => {
            const dayCells = showtimeHeatmap.filter((c) => c.dayOfWeek === d.dow);
            return (
              <div key={d.dow} className="grid grid-cols-5 gap-2.5 items-center">
                <div className="text-xs font-extrabold text-zinc-700 dark:text-zinc-300 pl-2">
                  {d.name}
                </div>
                {["14:00", "16:00", "18:00", "20:00"].map((slotKey) => {
                  const cell = dayCells.find((c) => c.slotKey === slotKey) || {
                    occupancy: 0,
                    ticketsPerShow: 0,
                    revenuePerShow: 0,
                    showsCount: 0,
                    tickets: 0,
                  };

                  let bgColor = "bg-zinc-50 dark:bg-zinc-800/40 text-zinc-400";
                  if (cell.occupancy >= 70) {
                    bgColor = "bg-emerald-500 text-white font-black shadow-sm";
                  } else if (cell.occupancy >= 45) {
                    bgColor = "bg-emerald-200 dark:bg-emerald-900/60 text-emerald-900 dark:text-emerald-200 font-bold";
                  } else if (cell.occupancy >= 25) {
                    bgColor = "bg-indigo-100 dark:bg-indigo-950/60 text-indigo-900 dark:text-indigo-200 font-semibold";
                  } else if (cell.showsCount > 0) {
                    bgColor = "bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300";
                  }

                  let displayVal = `${cell.occupancy}%`;
                  if (heatmapMetric === "ticketsPerShow") {
                    displayVal = `${cell.ticketsPerShow}`;
                  } else if (heatmapMetric === "revenuePerShow") {
                    displayVal = cell.revenuePerShow > 0 ? `${Math.round(cell.revenuePerShow / 1000)}k` : "0";
                  }

                  return (
                    <div
                      key={slotKey}
                      title={`${d.name} ${slotKey}: ${cell.occupancy}% ${t("analytics.tableOccupancy")}, ${cell.tickets} ${t("analytics.ticketsUnit")}, ${cell.showsCount} ${t("analytics.tableShowtimes")}`}
                      className={`h-11 rounded-2xl flex flex-col items-center justify-center transition-transform hover:scale-105 cursor-pointer text-xs ${bgColor}`}
                    >
                      <span>{cell.showsCount > 0 ? displayVal : "-"}</span>
                      {cell.showsCount > 0 && (
                        <span className="text-[9px] opacity-75">{cell.showsCount} {t("analytics.tableShowtimes")}</span>
                      )}
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
