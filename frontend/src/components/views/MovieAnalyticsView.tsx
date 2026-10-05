"use client";

import React, { useState } from "react";
import { useGetMovieAnalyticsQuery } from "@/services/opsApi";
import { useAppSelector } from "@/store/hooks";
import { useTranslation } from "@/lib/i18n";
import MovieAnalyticsChart from "@/components/analytics/MovieAnalyticsChart";
import { Spinner } from "@/components/ui/spinner";
import {
  TrendingUp,
  TrendingDown,
  Minus,
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
  Tv,
  Clock,
  Percent,
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

  const { summary, period, movies, dailyTotals, studioPerformance, timeSlotPerformance } = analytics;

  return (
    <div className="space-y-8 font-sans pb-16">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5 mb-1.5">
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

      {/* 6 Key KPI Cards Grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        {/* Card 1: Penjualan 7 Hari Terakhir */}
        <div className="p-5 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl shadow-xs hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-zinc-400">
              {t("analytics.totalRevenue")}
            </span>
            <div className="p-2 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2.5">
            <div className="text-xl font-black text-zinc-900 dark:text-zinc-50 truncate" title={formatCurrency(summary.totalRevenue)}>
              {formatCurrency(summary.totalRevenue)}
            </div>
            <p className="text-[11px] text-zinc-400 mt-1">
              {formatCurrency(summary.averageRevenuePerDay)} / hari
            </p>
          </div>
        </div>

        {/* Card 2: Total Tiket Terjual */}
        <div className="p-5 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl shadow-xs hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-zinc-400">
              {t("analytics.totalTickets")}
            </span>
            <div className="p-2 rounded-2xl bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400">
              <Ticket className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2.5">
            <div className="text-xl font-black text-zinc-900 dark:text-zinc-50">
              {formatNumber(summary.totalTickets)} <span className="text-xs font-normal text-zinc-400">tkt</span>
            </div>
            <p className="text-[11px] text-zinc-400 mt-1">
              {formatNumber(summary.averageTicketsPerDay)} tkt / hari
            </p>
          </div>
        </div>

        {/* Card 3: Tiket / Show */}
        <div className="p-5 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl shadow-xs hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-zinc-400">
              {t("analytics.ticketsPerShow")}
            </span>
            <div className="p-2 rounded-2xl bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400">
              <Layers className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2.5">
            <div className="text-xl font-black text-zinc-900 dark:text-zinc-50">
              {summary.averageTicketsPerShow} <span className="text-xs font-normal text-zinc-400">tkt/sesi</span>
            </div>
            <p className="text-[11px] text-zinc-400 mt-1">
              Total {summary.totalShowtimes} sesi tayang
            </p>
          </div>
        </div>

        {/* Card 4: Jam Tayang Paling Menghasilkan */}
        <div className="p-5 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl shadow-xs hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-zinc-400">
              {t("analytics.peakShowtime")}
            </span>
            <div className="p-2 rounded-2xl bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2.5">
            <div className="text-base font-extrabold text-zinc-900 dark:text-zinc-50 truncate" title={summary.peakTimeSlot?.label || "-"}>
              {summary.peakTimeSlot?.timeRange || "-"}
            </div>
            <p className="text-[11px] text-zinc-400 mt-1 truncate">
              {summary.peakTimeSlot ? formatCurrency(summary.peakTimeSlot.revenue) : "-"}
            </p>
          </div>
        </div>

        {/* Card 5: Film Terlaris */}
        <div className="p-5 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl shadow-xs hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-zinc-400">
              {t("analytics.topMovie")}
            </span>
            <div className="p-2 rounded-2xl bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400">
              <Award className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2.5">
            <div className="text-base font-bold text-zinc-900 dark:text-zinc-50 truncate" title={summary.topMovie?.title || "-"}>
              {summary.topMovie?.title || "-"}
            </div>
            <p className="text-[11px] text-zinc-400 mt-1">
              {summary.topMovie ? `${formatNumber(summary.topMovie.tickets)} tiket` : "-"}
            </p>
          </div>
        </div>

        {/* Card 6: Hari Penjualan Tertinggi */}
        <div className="p-5 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl shadow-xs hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-zinc-400">
              {t("analytics.peakSalesDay")}
            </span>
            <div className="p-2 rounded-2xl bg-purple-50 dark:bg-purple-950/40 text-purple-600 dark:text-purple-400">
              <Sparkles className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2.5">
            <div className="text-base font-bold text-zinc-900 dark:text-zinc-50 truncate">
              {summary.highestSalesDay ? `${summary.highestSalesDay.dayName}` : "-"}
            </div>
            <p className="text-[11px] text-zinc-400 mt-1 truncate">
              {summary.highestSalesDay ? formatCurrency(summary.highestSalesDay.revenue) : "-"}
            </p>
          </div>
        </div>
      </div>

      {/* Main Chart Section: Tren Penjualan Harian */}
      <div className="p-6 sm:p-8 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl shadow-sm space-y-6">
        {/* Controls Bar */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-zinc-100 dark:border-zinc-800">
          <div>
            <h2 className="text-lg font-bold text-zinc-900 dark:text-zinc-50 flex items-center gap-2">
              <Activity className="w-5 h-5 text-indigo-500" />
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

            {/* Chart Type Switcher: Line vs Bar */}
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

      {/* Performa Tiap Studio & Jam Tayang Paling Menghasilkan */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Section: Performa Tiap Studio */}
        <div className="p-6 sm:p-8 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl shadow-sm space-y-5">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold text-zinc-900 dark:text-zinc-50 flex items-center gap-2">
                <Tv className="w-5 h-5 text-indigo-500" />
                {t("analytics.studioPerformanceTitle")}
              </h2>
              <p className="text-xs text-zinc-400 mt-0.5">
                {t("analytics.studioPerformanceSubtitle")}
              </p>
            </div>
            <span className="text-xs font-bold px-2.5 py-1 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400">
              {studioPerformance?.length || 0} Studio
            </span>
          </div>

          <div className="space-y-4">
            {studioPerformance && studioPerformance.length > 0 ? (
              studioPerformance.map((st) => (
                <div
                  key={st.studioId}
                  className="p-4 rounded-2xl bg-zinc-50/70 dark:bg-zinc-800/40 border border-zinc-200/60 dark:border-zinc-800 space-y-2.5"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-xl bg-indigo-100 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 font-bold text-xs flex items-center justify-center shrink-0">
                        {st.studioCode || st.studioName.charAt(0)}
                      </div>
                      <div>
                        <h4 className="font-bold text-sm text-zinc-900 dark:text-zinc-100">
                          {st.studioName}
                        </h4>
                        <p className="text-[11px] text-zinc-400">
                          Kapasitas {st.capacity} kursi • {st.totalShowtimes} sesi tayang
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-extrabold text-sm text-emerald-600 dark:text-emerald-400 font-mono">
                        {formatCurrency(st.totalRevenue)}
                      </div>
                      <div className="text-[11px] text-zinc-400">
                        {formatNumber(st.totalTickets)} tiket ({st.averageTicketsPerShow} tkt/sesi)
                      </div>
                    </div>
                  </div>

                  {/* Occupancy Progress Bar */}
                  <div className="space-y-1">
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="text-zinc-400 font-medium">Tingkat Okupansi Kursi</span>
                      <span className="font-bold text-indigo-600 dark:text-indigo-400 font-mono">
                        {st.occupancyRate}%
                      </span>
                    </div>
                    <div className="w-full h-2 bg-zinc-200 dark:bg-zinc-700 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-emerald-500 transition-all duration-500"
                        style={{ width: `${Math.min(Math.max(st.occupancyRate, 2), 100)}%` }}
                      />
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-xs text-zinc-400 text-center py-6">Belum ada data studio.</p>
            )}
          </div>
        </div>

        {/* Section: Jam Tayang Paling Menghasilkan */}
        <div className="p-6 sm:p-8 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl shadow-sm space-y-5">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold text-zinc-900 dark:text-zinc-50 flex items-center gap-2">
                <Clock className="w-5 h-5 text-amber-500" />
                {t("analytics.timeSlotTitle")}
              </h2>
              <p className="text-xs text-zinc-400 mt-0.5">
                {t("analytics.timeSlotSubtitle")}
              </p>
            </div>
            <span className="text-xs font-bold px-2.5 py-1 rounded-xl bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400">
              5 Rentang Jam
            </span>
          </div>

          <div className="space-y-3.5">
            {timeSlotPerformance && timeSlotPerformance.length > 0 ? (
              timeSlotPerformance.map((slot) => (
                <div
                  key={slot.slotKey}
                  className={`p-3.5 rounded-2xl border transition-all ${
                    slot.isPeak
                      ? "bg-amber-50/50 dark:bg-amber-950/20 border-amber-300 dark:border-amber-800/60 shadow-xs"
                      : "bg-zinc-50/70 dark:bg-zinc-800/40 border-zinc-200/60 dark:border-zinc-800"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <div
                        className={`w-7 h-7 rounded-xl font-bold text-xs flex items-center justify-center shrink-0 ${
                          slot.isPeak
                            ? "bg-amber-500 text-white shadow-xs"
                            : "bg-zinc-200 dark:bg-zinc-700 text-zinc-600 dark:text-zinc-300"
                        }`}
                      >
                        {slot.isPeak ? "★" : "🕒"}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-xs text-zinc-900 dark:text-zinc-100">
                            {slot.label}
                          </span>
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-zinc-200 dark:bg-zinc-700 text-zinc-600 dark:text-zinc-300 font-mono">
                            {slot.timeRange}
                          </span>
                          {slot.isPeak && (
                            <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-amber-100 dark:bg-amber-900/60 text-amber-700 dark:text-amber-300 font-bold">
                              PEAK HOUR
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-zinc-400 mt-0.5">
                          {slot.showtimesCount} penayangan • {formatNumber(slot.totalTickets)} tiket ({slot.averageTicketsPerShow} tkt/sesi)
                        </p>
                      </div>
                    </div>

                    <div className="text-right">
                      <div className="font-bold text-sm text-emerald-600 dark:text-emerald-400 font-mono">
                        {formatCurrency(slot.totalRevenue)}
                      </div>
                      <div className="text-[10px] text-zinc-400 font-mono">
                        {slot.revenueShare}% total
                      </div>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-xs text-zinc-400 text-center py-6">Belum ada data jam tayang.</p>
            )}
          </div>
        </div>
      </div>

      {/* Rincian Performa Film & Indikator Tren (Naik / Turun) */}
      <div className="p-6 sm:p-8 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl shadow-sm space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h2 className="text-lg font-bold text-zinc-900 dark:text-zinc-50 flex items-center gap-2">
              <Film className="w-5 h-5 text-indigo-500" />
              {t("analytics.performanceBreakdown")}
            </h2>
            <p className="text-xs text-zinc-400 mt-0.5">
              Pantau performa individual film, rata-rata tiket per show, dan momentum tren naik / turun 7 hari terakhir.
            </p>
          </div>
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
                <th className="py-3 px-3 font-medium text-right">{t("analytics.tableTicketsPerShow")}</th>
                <th className="py-3 px-3 font-medium text-right">{t("analytics.tableRevenue")}</th>
                <th className="py-3 px-3 font-medium text-right">{t("analytics.tableShare")}</th>
                <th className="py-3 px-3 font-medium text-center">{t("analytics.tableTrend")}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800/60">
              {movies.map((movie, idx) => {
                const isSelected = selectedMovieId === movie.id;
                const isTrendUp = movie.trendDirection === "UP";
                const isTrendDown = movie.trendDirection === "DOWN";

                return (
                  <tr
                    key={movie.id}
                    onClick={() => setSelectedMovieId(selectedMovieId === movie.id ? "ALL" : movie.id)}
                    className={`hover:bg-zinc-50/80 dark:hover:bg-zinc-800/40 transition-colors cursor-pointer ${
                      isSelected ? "bg-indigo-50/50 dark:bg-indigo-950/20 font-semibold" : ""
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
                            className="w-9 h-12 object-cover rounded-lg shadow-2xs shrink-0"
                          />
                        ) : (
                          <div className="w-9 h-12 bg-zinc-100 dark:bg-zinc-800 rounded-lg flex items-center justify-center shrink-0">
                            <Film className="w-4 h-4 text-zinc-400" />
                          </div>
                        )}
                        <div className="space-y-0.5 max-w-[220px] truncate">
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
                    <td className="py-3.5 px-3 text-right font-bold text-indigo-600 dark:text-indigo-400 font-mono">
                      {movie.ticketsPerShow} <span className="text-[10px] font-normal text-zinc-400">tkt/show</span>
                    </td>
                    <td className="py-3.5 px-3 text-right font-bold text-emerald-600 dark:text-emerald-400 font-mono">
                      {formatCurrency(movie.totalRevenue)}
                    </td>
                    <td className="py-3.5 px-3 text-right font-semibold text-zinc-700 dark:text-zinc-300">
                      {movie.revenueShare}%
                    </td>
                    <td className="py-3.5 px-3 text-center">
                      <span
                        className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold ${
                          isTrendUp
                            ? "bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/50"
                            : isTrendDown
                            ? "bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-800/50"
                            : "bg-zinc-100 dark:bg-zinc-800 text-zinc-500 dark:text-zinc-400 border border-zinc-200 dark:border-zinc-700"
                        }`}
                      >
                        {isTrendUp ? (
                          <>
                            <TrendingUp className="w-3 h-3" />
                            <span>{t("analytics.trendUp")} (+{movie.trendPercentage}%)</span>
                          </>
                        ) : isTrendDown ? (
                          <>
                            <TrendingDown className="w-3 h-3" />
                            <span>{t("analytics.trendDown")} ({movie.trendPercentage}%)</span>
                          </>
                        ) : (
                          <>
                            <Minus className="w-3 h-3" />
                            <span>{t("analytics.trendStable")}</span>
                          </>
                        )}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
