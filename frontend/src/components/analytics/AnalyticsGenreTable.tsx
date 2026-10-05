"use client";

import React from "react";
import { Shapes } from "lucide-react";
import { useTranslation } from "@/lib/i18n";
import { MomentumBadge } from "./AnalyticsBadges";

interface GenreAnalyticsItem {
  id: string;
  name: string;
  movieTitles?: string[];
  totalShowtimes: number;
  totalTickets: number;
  ticketsPerShow: number;
  occupancy: number;
  totalRevenue: number;
  revenueShare: number;
  momentum?: {
    direction: string;
    label: string;
    growthPercentage: number;
  };
}

interface AnalyticsGenreTableProps {
  genres: GenreAnalyticsItem[];
}

export const AnalyticsGenreTable: React.FC<AnalyticsGenreTableProps> = ({ genres = [] }) => {
  const { t, formatNumber, formatCurrency } = useTranslation();

  return (
    <div className="bg-white dark:bg-zinc-900 rounded-3xl border border-zinc-200 dark:border-zinc-800 shadow-sm overflow-hidden space-y-4">
      <div className="p-6 border-b border-zinc-100 dark:border-zinc-800/80">
        <h3 className="text-lg font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
          <Shapes className="w-5 h-5 text-indigo-600" />
          {t("analytics.genrePerformanceTitle")}
        </h3>
        <p className="text-xs text-zinc-400 mt-0.5">
          {t("analytics.genrePerformanceSubtitle")}
        </p>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse text-xs">
          <thead>
            <tr className="bg-zinc-50/80 dark:bg-zinc-800/50 text-zinc-500 font-bold border-b border-zinc-200 dark:border-zinc-800">
              <th className="py-3 px-4">{t("analytics.tableGenreName")}</th>
              <th className="py-3 px-3">{t("analytics.tableMoviesInGenre")}</th>
              <th className="py-3 px-3 text-right">{t("analytics.tableShowtimes")}</th>
              <th className="py-3 px-3 text-right">{t("analytics.tableTickets")}</th>
              <th className="py-3 px-3 text-right">{t("analytics.tableTicketsPerShow")}</th>
              <th className="py-3 px-3 text-right">{t("analytics.tableOccupancy")}</th>
              <th className="py-3 px-3 text-right">{t("analytics.tableRevenue")}</th>
              <th className="py-3 px-3 text-right">{t("analytics.tableShare")} %</th>
              <th className="py-3 px-4 text-center">{t("analytics.tableMomentum")}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800/60">
            {genres.map((g) => (
              <tr key={g.id} className="hover:bg-indigo-50/40 dark:hover:bg-indigo-950/20 transition-colors">
                <td className="py-3.5 px-4 font-bold text-zinc-900 dark:text-zinc-100">
                  {g.name}
                </td>
                <td className="py-3.5 px-3 text-zinc-500 max-w-[220px] truncate" title={g.movieTitles?.join(", ")}>
                  {g.movieTitles?.join(", ") || "-"}
                </td>
                <td className="py-3.5 px-3 text-right text-zinc-600 dark:text-zinc-300">
                  {g.totalShowtimes}
                </td>
                <td className="py-3.5 px-3 text-right font-extrabold text-zinc-900 dark:text-zinc-100">
                  {formatNumber(g.totalTickets)}
                </td>
                <td className="py-3.5 px-3 text-right font-bold text-indigo-600 dark:text-indigo-400">
                  {g.ticketsPerShow}
                </td>
                <td className="py-3.5 px-3 text-right font-bold text-zinc-700 dark:text-zinc-300">
                  {g.occupancy}%
                </td>
                <td className="py-3.5 px-3 text-right font-black text-zinc-900 dark:text-zinc-100">
                  {formatCurrency(g.totalRevenue)}
                </td>
                <td className="py-3.5 px-3 text-right font-bold text-indigo-600">
                  {g.revenueShare}%
                </td>
                <td className="py-3.5 px-4 text-center">
                  <MomentumBadge momentum={g.momentum} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
