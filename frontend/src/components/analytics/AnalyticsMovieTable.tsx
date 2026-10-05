"use client";

import React, { useState } from "react";
import { Film, Tv, ChevronDown, ChevronUp } from "lucide-react";
import { useTranslation } from "@/lib/i18n";
import { RecommendationBadge, MomentumBadge, HealthScoreBadge } from "./AnalyticsBadges";

export type MovieSortField =
  | "tickets"
  | "shows"
  | "ticketsPerShow"
  | "occupancy"
  | "revenue"
  | "revenuePerShow"
  | "momentum"
  | "healthScore";

interface MovieAnalyticsItem {
  id: string;
  title: string;
  genres: string[];
  totalTickets: number;
  totalShowtimes: number;
  ticketsPerShow: number;
  occupancy: number;
  totalRevenue: number;
  revenuePerShow: number;
  peakHour?: string;
  bestStudio?: string;
  momentum?: {
    direction: string;
    label: string;
    growthPercentage: number;
  };
  healthScore?: {
    score: number;
    status: string;
    label: string;
  };
  recommendation?: {
    action: string;
    label: string;
    reason: string;
  };
  studiosBreakdown?: Array<{
    studioId: string;
    studioName: string;
    shows: number;
    tickets: number;
    occupancy: number;
    revenue: number;
  }>;
}

interface AnalyticsMovieTableProps {
  movies: MovieAnalyticsItem[];
  sortField: MovieSortField;
  sortAsc: boolean;
  onSort: (field: MovieSortField) => void;
}

export const AnalyticsMovieTable: React.FC<AnalyticsMovieTableProps> = ({
  movies,
  sortField,
  sortAsc,
  onSort,
}) => {
  const { t, formatNumber, formatCurrency } = useTranslation();
  const [expandedMovieId, setExpandedMovieId] = useState<string | null>(null);

  const renderSortIcon = (field: MovieSortField) => {
    if (sortField !== field) return null;
    return sortAsc ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />;
  };

  return (
    <div className="bg-white dark:bg-zinc-900 rounded-3xl border border-zinc-200 dark:border-zinc-800 shadow-sm overflow-hidden space-y-4">
      <div className="p-6 border-b border-zinc-100 dark:border-zinc-800/80 flex flex-col md:flex-row md:items-center justify-between gap-2">
        <div>
          <h3 className="text-lg font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
            <Film className="w-5 h-5 text-indigo-600" />
            {t("analytics.performanceBreakdown")}
          </h3>
          <p className="text-xs text-zinc-400 mt-0.5">
            {t("analytics.sortHint")}
          </p>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse text-xs">
          <thead>
            <tr className="bg-zinc-50/80 dark:bg-zinc-800/50 text-zinc-500 font-bold border-b border-zinc-200 dark:border-zinc-800">
              <th className="py-3 px-4 font-extrabold">{t("analytics.tableMovie")}</th>
              <th
                onClick={() => onSort("tickets")}
                className="py-3 px-3 text-right cursor-pointer hover:text-indigo-600"
              >
                <div className="flex items-center justify-end gap-1">
                  <span>{t("analytics.tableTickets")}</span>
                  {renderSortIcon("tickets")}
                </div>
              </th>
              <th
                onClick={() => onSort("shows")}
                className="py-3 px-3 text-right cursor-pointer hover:text-indigo-600"
              >
                <div className="flex items-center justify-end gap-1">
                  <span>{t("analytics.tableShowtimes")}</span>
                  {renderSortIcon("shows")}
                </div>
              </th>
              <th
                onClick={() => onSort("ticketsPerShow")}
                className="py-3 px-3 text-right cursor-pointer hover:text-indigo-600"
              >
                <div className="flex items-center justify-end gap-1">
                  <span>{t("analytics.tableTicketsPerShow")}</span>
                  {renderSortIcon("ticketsPerShow")}
                </div>
              </th>
              <th
                onClick={() => onSort("occupancy")}
                className="py-3 px-3 text-right cursor-pointer hover:text-indigo-600"
              >
                <div className="flex items-center justify-end gap-1">
                  <span>{t("analytics.tableOccupancy")}</span>
                  {renderSortIcon("occupancy")}
                </div>
              </th>
              <th
                onClick={() => onSort("revenue")}
                className="py-3 px-3 text-right cursor-pointer hover:text-indigo-600"
              >
                <div className="flex items-center justify-end gap-1">
                  <span>{t("analytics.tableRevenue")}</span>
                  {renderSortIcon("revenue")}
                </div>
              </th>
              <th
                onClick={() => onSort("revenuePerShow")}
                className="py-3 px-3 text-right cursor-pointer hover:text-indigo-600"
              >
                <div className="flex items-center justify-end gap-1">
                  <span>{t("analytics.tableRevenuePerShow")}</span>
                  {renderSortIcon("revenuePerShow")}
                </div>
              </th>
              <th className="py-3 px-3 text-center">{t("analytics.tablePeakHour")}</th>
              <th className="py-3 px-3 text-center">{t("analytics.tableBestStudio")}</th>
              <th
                onClick={() => onSort("momentum")}
                className="py-3 px-3 text-center cursor-pointer hover:text-indigo-600"
              >
                <div className="flex items-center justify-center gap-1">
                  <span>{t("analytics.tableMomentum")}</span>
                  {renderSortIcon("momentum")}
                </div>
              </th>
              <th
                onClick={() => onSort("healthScore")}
                className="py-3 px-3 text-center cursor-pointer hover:text-indigo-600"
              >
                <div className="flex items-center justify-center gap-1">
                  <span>{t("analytics.tableHealthScore")}</span>
                  {renderSortIcon("healthScore")}
                </div>
              </th>
              <th className="py-3 px-4 text-center font-bold">{t("analytics.tableRecommendation")}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800/60">
            {movies.map((m) => {
              const isExpanded = expandedMovieId === m.id;
              return (
                <React.Fragment key={m.id}>
                  <tr
                    onClick={() => setExpandedMovieId(isExpanded ? null : m.id)}
                    className={`hover:bg-indigo-50/40 dark:hover:bg-indigo-950/20 transition-colors cursor-pointer ${
                      isExpanded ? "bg-indigo-50/30 dark:bg-indigo-950/30" : ""
                    }`}
                  >
                    {/* Title & Info */}
                    <td className="py-3.5 px-4 font-bold text-zinc-900 dark:text-zinc-100">
                      <div className="flex items-center gap-2.5">
                        <span className="w-2 h-2 rounded-full bg-indigo-500 flex-shrink-0" />
                        <div className="max-w-[200px] truncate">
                          <div className="font-extrabold truncate" title={m.title}>
                            {m.title}
                          </div>
                          <div className="text-[10px] font-normal text-zinc-400">
                            {m.genres?.join(", ") || "-"}
                          </div>
                        </div>
                      </div>
                    </td>

                    {/* Tickets */}
                    <td className="py-3.5 px-3 text-right font-extrabold text-zinc-900 dark:text-zinc-100">
                      {formatNumber(m.totalTickets)}
                    </td>

                    {/* Shows */}
                    <td className="py-3.5 px-3 text-right text-zinc-600 dark:text-zinc-300">
                      {m.totalShowtimes}
                    </td>

                    {/* Tickets/Show */}
                    <td className="py-3.5 px-3 text-right font-bold text-indigo-600 dark:text-indigo-400">
                      {m.ticketsPerShow}
                    </td>

                    {/* Occupancy */}
                    <td className="py-3.5 px-3 text-right font-bold">
                      <span
                        className={`${
                          m.occupancy >= 60
                            ? "text-emerald-600 dark:text-emerald-400 font-extrabold"
                            : m.occupancy < 30
                            ? "text-rose-600 dark:text-rose-400"
                            : "text-zinc-700 dark:text-zinc-300"
                        }`}
                      >
                        {m.occupancy}%
                      </span>
                    </td>

                    {/* Revenue */}
                    <td className="py-3.5 px-3 text-right font-black text-zinc-900 dark:text-zinc-50">
                      {formatCurrency(m.totalRevenue)}
                    </td>

                    {/* Revenue/Show */}
                    <td className="py-3.5 px-3 text-right text-zinc-500">
                      {formatCurrency(m.revenuePerShow)}
                    </td>

                    {/* Peak Hour */}
                    <td className="py-3.5 px-3 text-center text-zinc-600 dark:text-zinc-400">
                      <span className="px-2 py-0.5 rounded-md bg-zinc-100 dark:bg-zinc-800 font-mono text-[11px]">
                        {m.peakHour || "-"}
                      </span>
                    </td>

                    {/* Best Studio */}
                    <td className="py-3.5 px-3 text-center text-zinc-700 dark:text-zinc-300 font-medium">
                      {m.bestStudio || "-"}
                    </td>

                    {/* Momentum */}
                    <td className="py-3.5 px-3 text-center">
                      <MomentumBadge momentum={m.momentum} />
                    </td>

                    {/* Health Score */}
                    <td className="py-3.5 px-3 text-center">
                      <HealthScoreBadge healthScore={m.healthScore} />
                    </td>

                    {/* Recommendation */}
                    <td className="py-3.5 px-4 text-center">
                      <div className="flex flex-col items-center gap-1">
                        <RecommendationBadge recommendation={m.recommendation} />
                        <span className="text-[10px] text-zinc-400 max-w-[130px] truncate" title={m.recommendation?.reason}>
                          {m.recommendation?.reason}
                        </span>
                      </div>
                    </td>
                  </tr>

                  {/* Expanded Studio Breakdown Row */}
                  {isExpanded && (
                    <tr className="bg-zinc-50/50 dark:bg-zinc-800/30">
                      <td colSpan={12} className="py-3 px-6">
                        <div className="p-4 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 space-y-2">
                          <div className="text-xs font-bold text-zinc-700 dark:text-zinc-300 flex items-center gap-1.5">
                            <Tv className="w-3.5 h-3.5 text-indigo-500" />
                            <span>{t("analytics.studioBreakdownTitle")}: {m.title}</span>
                          </div>
                          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-2">
                            {m.studiosBreakdown?.map((st) => (
                              <div
                                key={st.studioId}
                                className="p-3 rounded-xl bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-200/60 dark:border-zinc-700/60 space-y-1"
                              >
                                <div className="flex items-center justify-between text-xs font-extrabold">
                                  <span>{st.studioName}</span>
                                  <span className="text-indigo-600 dark:text-indigo-400">{st.occupancy}% {t("analytics.tableOccupancy")}</span>
                                </div>
                                <div className="text-[11px] text-zinc-500 flex justify-between">
                                  <span>{st.shows} {t("analytics.tableShowtimes")} • {st.tickets} {t("analytics.ticketsUnit")}</span>
                                  <span className="font-bold">{formatCurrency(st.revenue)}</span>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};
