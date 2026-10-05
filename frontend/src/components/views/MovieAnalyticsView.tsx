"use client";

import React, { useState } from "react";
import { useGetMovieAnalyticsQuery } from "@/services/opsApi";
import { useAppSelector } from "@/store/hooks";
import { useTranslation } from "@/lib/i18n";
import MovieAnalyticsChart from "@/components/analytics/MovieAnalyticsChart";
import { Spinner } from "@/components/ui/spinner";
import {
  TrendingUp,
  DollarSign,
  Ticket,
  Award,
  Calendar,
  Layers,
  BarChart3,
  Activity,
  RefreshCw,
  Film,
  Sparkles,
  ShieldAlert,
} from "lucide-react";

export default function MovieAnalyticsView() {
  const { t, formatCurrency, formatNumber } = useTranslation();
  const user = useAppSelector((state) => state.auth.user);

  const [activeMetric, setActiveMetric] = useState<"tickets" | "revenue">("revenue");
  const [chartType, setChartType] = useState<"line" | "bar">("line");
  const [selectedMovieId, setSelectedMovieId] = useState<string | "ALL">("ALL");

  const {
    data: analytics,
    isLoading,
    isFetching,
    refetch,
  } = useGetMovieAnalyticsQuery(undefined, {
    refetchOnMountOrArgChange: true,
  });

  // Strict role check for Admin
  const isAdmin =
    user?.role?.toUpperCase() === "ADMIN" ||
    user?.role === "Admin" ||
    (user?.username || "").toLowerCase() === "admin";

  if (!isAdmin) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center p-6 space-y-4">
        <div className="w-16 h-16 rounded-3xl bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 flex items-center justify-center">
          <ShieldAlert className="w-8 h-8" />
        </div>
        <h2 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">
          {t("errors.permissionDenied") || "Akses Ditolak"}
        </h2>
        <p className="text-sm text-zinc-500 max-w-md">
          {t("errors.unauthorized") || "Halaman analitik film hanya dapat diakses oleh Administrator."}
        </p>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] space-y-3">
        <Spinner className="w-8 h-8 text-indigo-600" />
        <p className="text-sm text-zinc-500">{t("common.loading")}</p>
      </div>
    );
  }

  if (!analytics || !analytics.movies.length) {
    return (
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50 flex items-center gap-3">
              <TrendingUp className="w-8 h-8 text-indigo-600 dark:text-indigo-400" />
              {t("analytics.title")}
            </h1>
            <p className="text-zinc-500 dark:text-zinc-400 mt-1">
              {t("analytics.subtitle")}
            </p>
          </div>
          <button
            onClick={() => refetch()}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-800 dark:text-zinc-200 text-xs font-semibold transition-colors cursor-pointer"
          >
            <RefreshCw className={`w-4 h-4 ${isFetching ? "animate-spin" : ""}`} />
            {t("analytics.refresh")}
          </button>
        </div>

        <div className="p-12 text-center bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl shadow-sm space-y-3">
          <Film className="w-12 h-12 text-zinc-300 dark:text-zinc-700 mx-auto" />
          <h3 className="font-bold text-zinc-800 dark:text-zinc-200 text-lg">
            {t("analytics.noDataTitle")}
          </h3>
          <p className="text-sm text-zinc-400 max-w-md mx-auto">
            {t("analytics.noDataDesc")}
          </p>
        </div>
      </div>
    );
  }

  const { summary, period, movies, dailyTotals } = analytics;

  return (
    <div className="space-y-8 font-sans pb-12">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5 mb-1">
            <span className="px-3 py-1 rounded-full text-[11px] font-bold bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800/60 flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5" />
              {t("analytics.badge7Days")} ({period.startDate} - {period.endDate})
            </span>
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight text-zinc-900 dark:text-zinc-50 flex items-center gap-3">
            <TrendingUp className="w-8 h-8 text-indigo-600 dark:text-indigo-400" />
            {t("analytics.title")}
          </h1>
          <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">
            {t("analytics.subtitle")}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => refetch()}
            disabled={isFetching}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300 text-xs font-semibold shadow-xs transition-colors cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-zinc-500 ${isFetching ? "animate-spin text-indigo-500" : ""}`} />
            <span>{t("analytics.refresh")}</span>
          </button>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {/* Card 1: Total Revenue */}
        <div className="p-6 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl shadow-xs hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
              {t("analytics.totalRevenue")}
            </span>
            <div className="p-2.5 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400">
              <DollarSign className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-black text-zinc-900 dark:text-zinc-50">
              {formatCurrency(summary.totalRevenue)}
            </div>
            <p className="text-xs text-zinc-400 mt-1">
              {t("analytics.dailyAvgRevenue")}: {formatCurrency(summary.averageRevenuePerDay)}
            </p>
          </div>
        </div>

        {/* Card 2: Total Tickets */}
        <div className="p-6 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl shadow-xs hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
              {t("analytics.totalTickets")}
            </span>
            <div className="p-2.5 rounded-2xl bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400">
              <Ticket className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-black text-zinc-900 dark:text-zinc-50">
              {formatNumber(summary.totalTickets)} <span className="text-sm font-medium text-zinc-400">{t("analytics.ticketsUnit")}</span>
            </div>
            <p className="text-xs text-zinc-400 mt-1">
              {t("analytics.dailyAvgTickets")}: {formatNumber(summary.averageTicketsPerDay)} {t("analytics.ticketsUnit")}
            </p>
          </div>
        </div>

        {/* Card 3: Top Movie */}
        <div className="p-6 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl shadow-xs hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
              {t("analytics.topMovie")}
            </span>
            <div className="p-2.5 rounded-2xl bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400">
              <Award className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-lg font-bold text-zinc-900 dark:text-zinc-50 truncate" title={summary.topMovie?.title || "-"}>
              {summary.topMovie?.title || "-"}
            </div>
            <p className="text-xs text-zinc-400 mt-1">
              {summary.topMovie ? `${formatCurrency(summary.topMovie.revenue)} (${formatNumber(summary.topMovie.tickets)} tkt)` : "-"}
            </p>
          </div>
        </div>

        {/* Card 4: Peak Sales Day */}
        <div className="p-6 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl shadow-xs hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
              {t("analytics.peakSalesDay")}
            </span>
            <div className="p-2.5 rounded-2xl bg-purple-50 dark:bg-purple-950/40 text-purple-600 dark:text-purple-400">
              <Sparkles className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-lg font-bold text-zinc-900 dark:text-zinc-50">
              {summary.highestSalesDay ? `${summary.highestSalesDay.dayName}` : "-"}
            </div>
            <p className="text-xs text-zinc-400 mt-1">
              {summary.highestSalesDay ? `${formatCurrency(summary.highestSalesDay.revenue)} (${formatNumber(summary.highestSalesDay.tickets)} tkt)` : "-"}
            </p>
          </div>
        </div>
      </div>

      {/* Main Chart Section */}
      <div className="p-6 sm:p-8 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl shadow-sm space-y-6">
        {/* Controls Bar */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-zinc-100 dark:border-zinc-800">
          <div>
            <h2 className="text-lg font-bold text-zinc-900 dark:text-zinc-50">
              {t("analytics.trendChartTitle")}
            </h2>
            <p className="text-xs text-zinc-400 mt-0.5">
              {t("analytics.trendChartSubtitle")}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {/* Metric Switcher */}
            <div className="flex items-center p-1 bg-zinc-100 dark:bg-zinc-800/70 rounded-2xl border border-zinc-200/50 dark:border-zinc-700/50">
              <button
                onClick={() => setActiveMetric("revenue")}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                  activeMetric === "revenue"
                    ? "bg-white dark:bg-zinc-900 text-emerald-600 dark:text-emerald-400 shadow-xs"
                    : "text-zinc-600 dark:text-zinc-400 hover:text-zinc-900"
                }`}
              >
                <DollarSign className="w-3.5 h-3.5" />
                <span>{t("analytics.metricRevenue")}</span>
              </button>
              <button
                onClick={() => setActiveMetric("tickets")}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                  activeMetric === "tickets"
                    ? "bg-white dark:bg-zinc-900 text-indigo-600 dark:text-indigo-400 shadow-xs"
                    : "text-zinc-600 dark:text-zinc-400 hover:text-zinc-900"
                }`}
              >
                <Ticket className="w-3.5 h-3.5" />
                <span>{t("analytics.metricTickets")}</span>
              </button>
            </div>

            {/* Chart Type Switcher */}
            <div className="flex items-center p-1 bg-zinc-100 dark:bg-zinc-800/70 rounded-2xl border border-zinc-200/50 dark:border-zinc-700/50">
              <button
                onClick={() => setChartType("line")}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                  chartType === "line"
                    ? "bg-white dark:bg-zinc-900 text-indigo-600 dark:text-indigo-400 shadow-xs"
                    : "text-zinc-600 dark:text-zinc-400 hover:text-zinc-900"
                }`}
              >
                <Activity className="w-3.5 h-3.5" />
                <span>{t("analytics.chartLine")}</span>
              </button>
              <button
                onClick={() => setChartType("bar")}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                  chartType === "bar"
                    ? "bg-white dark:bg-zinc-900 text-indigo-600 dark:text-indigo-400 shadow-xs"
                    : "text-zinc-600 dark:text-zinc-400 hover:text-zinc-900"
                }`}
              >
                <BarChart3 className="w-3.5 h-3.5" />
                <span>{t("analytics.chartBar")}</span>
              </button>
            </div>

            {/* Movie Filter Select */}
            <select
              value={selectedMovieId}
              onChange={(e) => setSelectedMovieId(e.target.value)}
              className="px-3.5 py-2 text-xs font-semibold rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-zinc-700 dark:text-zinc-300 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 cursor-pointer"
            >
              <option value="ALL">{t("analytics.allMovies")}</option>
              {movies.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.title}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* D3 Interactive Chart */}
        <MovieAnalyticsChart
          data={analytics}
          activeMetric={activeMetric}
          chartType={chartType}
          selectedMovieId={selectedMovieId}
          onSelectMovie={(id) => setSelectedMovieId(id)}
        />
      </div>

      {/* Market Share & Rankings Grid */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Left 2 Cols: Movie Performance Breakdown Table */}
        <div className="lg:col-span-2 p-6 sm:p-8 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl shadow-sm space-y-5">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-zinc-900 dark:text-zinc-50">
              {t("analytics.performanceBreakdown")}
            </h2>
            <span className="text-xs text-zinc-400 font-medium">
              {movies.length} {t("analytics.activeMovies")}
            </span>
          </div>

          <div className="overflow-x-auto -mx-6 sm:-mx-8 px-6 sm:px-8">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-zinc-150 dark:border-zinc-800 text-zinc-400 uppercase tracking-wider font-semibold">
                  <th className="py-3 px-2 font-medium">{t("analytics.tableMovie")}</th>
                  <th className="py-3 px-3 font-medium text-center">{t("analytics.tableShowtimes")}</th>
                  <th className="py-3 px-3 font-medium text-right">{t("analytics.tableTickets")}</th>
                  <th className="py-3 px-3 font-medium text-right">{t("analytics.tableRevenue")}</th>
                  <th className="py-3 px-3 font-medium text-right">{t("analytics.tableShare")}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800/60">
                {movies.map((movie, idx) => (
                  <tr
                    key={movie.id}
                    onClick={() => setSelectedMovieId(selectedMovieId === movie.id ? "ALL" : movie.id)}
                    className={`hover:bg-zinc-50/80 dark:hover:bg-zinc-800/40 transition-colors cursor-pointer ${
                      selectedMovieId === movie.id ? "bg-indigo-50/50 dark:bg-indigo-950/20 font-semibold" : ""
                    }`}
                  >
                    <td className="py-3.5 px-2">
                      <div className="flex items-center gap-3">
                        <span className="w-5 text-center font-bold text-zinc-400">
                          {idx + 1}
                        </span>
                        {movie.poster ? (
                          <img
                            src={movie.poster}
                            alt={movie.title}
                            className="w-8 h-11 object-cover rounded-lg shadow-2xs shrink-0"
                          />
                        ) : (
                          <div className="w-8 h-11 bg-zinc-100 dark:bg-zinc-800 rounded-lg flex items-center justify-center shrink-0">
                            <Film className="w-4 h-4 text-zinc-400" />
                          </div>
                        )}
                        <div className="space-y-0.5 max-w-[200px] truncate">
                          <div className="font-bold text-zinc-800 dark:text-zinc-200 truncate">
                            {movie.title}
                          </div>
                          <div className="flex items-center gap-1.5 text-[10px] text-zinc-400">
                            <span className="px-1.5 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800 font-medium">
                              {movie.censorshipRating}
                            </span>
                            {movie.genres.length > 0 && (
                              <span className="truncate">{movie.genres.slice(0, 2).join(", ")}</span>
                            )}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="py-3.5 px-3 text-center text-zinc-600 dark:text-zinc-300 font-medium">
                      {movie.totalShowtimes} {t("analytics.sessionsUnit")}
                    </td>
                    <td className="py-3.5 px-3 text-right font-bold text-zinc-900 dark:text-zinc-100">
                      {formatNumber(movie.totalTickets)}
                    </td>
                    <td className="py-3.5 px-3 text-right font-bold text-emerald-600 dark:text-emerald-400">
                      {formatCurrency(movie.totalRevenue)}
                    </td>
                    <td className="py-3.5 px-3 text-right font-semibold text-indigo-600 dark:text-indigo-400">
                      {movie.revenueShare}%
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Right 1 Col: Market Share Progress Bars */}
        <div className="p-6 sm:p-8 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl shadow-sm space-y-5">
          <div>
            <h2 className="text-lg font-bold text-zinc-900 dark:text-zinc-50">
              {t("analytics.marketShareTitle")}
            </h2>
            <p className="text-xs text-zinc-400 mt-0.5">
              {t("analytics.marketShareSubtitle")}
            </p>
          </div>

          <div className="space-y-4">
            {movies.map((movie) => (
              <div key={movie.id} className="space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-zinc-800 dark:text-zinc-200 truncate max-w-[170px]" title={movie.title}>
                    {movie.title}
                  </span>
                  <span className="font-bold text-zinc-900 dark:text-zinc-100 font-mono">
                    {movie.revenueShare}%
                  </span>
                </div>
                <div className="w-full h-2.5 bg-zinc-100 dark:bg-zinc-800 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-indigo-600 transition-all duration-500"
                    style={{ width: `${Math.max(movie.revenueShare, 3)}%` }}
                  />
                </div>
                <div className="flex items-center justify-between text-[11px] text-zinc-400 font-mono">
                  <span>{formatNumber(movie.totalTickets)} tiket</span>
                  <span>{formatCurrency(movie.totalRevenue)}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
