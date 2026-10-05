"use client";

import React from "react";
import { Tv } from "lucide-react";
import { useTranslation } from "@/lib/i18n";

interface StudioPerformanceItem {
  studioId: string;
  studioName: string;
  capacity: number;
  totalShowtimes: number;
  totalTickets: number;
  occupancyRate: number;
  totalRevenue: number;
}

interface AnalyticsStudioTableProps {
  studios: StudioPerformanceItem[];
}

export const AnalyticsStudioTable: React.FC<AnalyticsStudioTableProps> = ({ studios = [] }) => {
  const { t, formatNumber, formatCurrency } = useTranslation();

  return (
    <div className="lg:col-span-2 bg-white dark:bg-zinc-900 p-6 rounded-3xl border border-zinc-200 dark:border-zinc-800 shadow-sm space-y-4">
      <div>
        <h3 className="text-base font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
          <Tv className="w-5 h-5 text-indigo-600" />
          {t("analytics.studioPerformanceTitle")}
        </h3>
        <p className="text-xs text-zinc-400 mt-0.5">
          {t("analytics.studioPerformanceSubtitle")}
        </p>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead>
            <tr className="border-b border-zinc-200 dark:border-zinc-800 text-zinc-400 font-bold">
              <th className="py-2.5 px-3">{t("analytics.tableStudio")}</th>
              <th className="py-2.5 px-3 text-right">{t("analytics.tableCapacity")}</th>
              <th className="py-2.5 px-3 text-right">{t("analytics.tableShowtimes")}</th>
              <th className="py-2.5 px-3 text-right">{t("analytics.tableTickets")}</th>
              <th className="py-2.5 px-3 text-right">{t("analytics.tableOccupancy")}</th>
              <th className="py-2.5 px-3 text-right">{t("analytics.tableRevenue")}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800/60">
            {studios.map((st) => (
              <tr key={st.studioId} className="hover:bg-zinc-50 dark:hover:bg-zinc-800/50">
                <td className="py-3 px-3 font-bold text-zinc-900 dark:text-zinc-100">
                  {st.studioName}
                </td>
                <td className="py-3 px-3 text-right text-zinc-500">
                  {st.capacity} {t("common.seats") || "kursi"}
                </td>
                <td className="py-3 px-3 text-right text-zinc-600 dark:text-zinc-300">
                  {st.totalShowtimes}
                </td>
                <td className="py-3 px-3 text-right font-extrabold text-zinc-900 dark:text-zinc-100">
                  {formatNumber(st.totalTickets)}
                </td>
                <td className="py-3 px-3 text-right font-bold text-indigo-600 dark:text-indigo-400">
                  {st.occupancyRate}%
                </td>
                <td className="py-3 px-3 text-right font-black text-zinc-900 dark:text-zinc-100">
                  {formatCurrency(st.totalRevenue)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
