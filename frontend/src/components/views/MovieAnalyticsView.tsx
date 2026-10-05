"use client";

import React, { useState, useMemo } from "react";
import { useGetMovieAnalyticsQuery } from "@/services/opsApi";
import { useAppSelector } from "@/store/hooks";
import { useTranslation } from "@/lib/i18n";
import MovieAnalyticsChart, { AnalyticsChartItem } from "@/components/analytics/MovieAnalyticsChart";
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
  Shapes,
  Percent,
  ChevronDown,
  ChevronUp,
  Flame,
  AlertTriangle,
  HeartPulse,
  ThumbsUp,
  Eye,
  SlidersHorizontal,
  Grid3X3,
  ArrowUpRight,
  ArrowDownRight,
  Info,
} from "lucide-react";

type SortField =
  | "tickets"
  | "shows"
  | "ticketsPerShow"
  | "occupancy"
  | "revenue"
  | "revenuePerShow"
  | "momentum"
  | "healthScore";

type HeatmapMetric = "occupancy" | "ticketsPerShow" | "revenuePerShow";

export default function MovieAnalyticsView() {
  const { t, formatCurrency, formatNumber } = useTranslation();
  const user = useAppSelector((state) => state.auth.user);

  // Tab & Filter States
  const [activeTab, setActiveTab] = useState<"movies" | "genres">("movies");
  const [rangePreset, setRangePreset] = useState<"7d" | "14d" | "30d" | "custom">("7d");
  const [customStartDate, setCustomStartDate] = useState<string>("");
  const [customEndDate, setCustomEndDate] = useState<string>("");

  // Chart Controls
  const [activeMetric, setActiveMetric] = useState<"tickets" | "revenue">("revenue");
  const [chartType, setChartType] = useState<"line" | "bar">("line");
  const [selectedMovieId, setSelectedMovieId] = useState<string | "ALL">("ALL");
  const [selectedGenreId, setSelectedGenreId] = useState<string | "ALL">("ALL");

  // Table Controls
  const [movieSortField, setMovieSortField] = useState<SortField>("revenue");
  const [movieSortAsc, setMovieSortAsc] = useState<boolean>(false);
  const [expandedMovieId, setExpandedMovieId] = useState<string | null>(null);

  // Genre Tab Controls
  const [genreShareMode, setGenreShareMode] = useState<"revenue" | "ticket">("revenue");

  // Heatmap Controls
  const [heatmapMetric, setHeatmapMetric] = useState<HeatmapMetric>("occupancy");

  // Query Params computation
  const queryParams = useMemo(() => {
    if (rangePreset === "7d") return { days: 7 };
    if (rangePreset === "14d") return { days: 14 };
    if (rangePreset === "30d") return { days: 30 };
    if (rangePreset === "custom" && customStartDate && customEndDate) {
      return { startDate: customStartDate, endDate: customEndDate };
    }
    return { days: 7 };
  }, [rangePreset, customStartDate, customEndDate]);

  const {
    data: analytics,
    isLoading,
    isFetching,
    refetch,
  } = useGetMovieAnalyticsQuery(queryParams, {
    refetchOnMountOrArgChange: true,
  });

  // Strict role check for Admin
  const isAdmin =
    user?.role?.toUpperCase() === "ADMIN" ||
    user?.role === "Admin" ||
    (user?.username || "").toLowerCase() === "admin";

  // Prepare chart items for Movies tab
  const movieChartItems: AnalyticsChartItem[] = useMemo(() => {
    if (!analytics?.movies) return [];
    return analytics.movies.map((m) => ({
      id: m.id,
      title: m.title,
      totalRevenue: m.totalRevenue,
      totalTickets: m.totalTickets,
      daily: m.daily,
    }));
  }, [analytics?.movies]);

  // Prepare chart items for Genres tab
  const genreChartItems: AnalyticsChartItem[] = useMemo(() => {
    if (!analytics?.genres) return [];
    return analytics.genres.map((g) => ({
      id: g.id,
      title: g.name,
      totalRevenue: g.totalRevenue,
      totalTickets: g.totalTickets,
      daily: g.daily,
    }));
  }, [analytics?.genres]);

  // Sorted Movies
  const sortedMovies = useMemo(() => {
    if (!analytics?.movies) return [];
    const list = [...analytics.movies];
    list.sort((a, b) => {
      let valA = 0;
      let valB = 0;
      if (movieSortField === "tickets") {
        valA = a.totalTickets;
        valB = b.totalTickets;
      } else if (movieSortField === "shows") {
        valA = a.totalShowtimes;
        valB = b.totalShowtimes;
      } else if (movieSortField === "ticketsPerShow") {
        valA = a.ticketsPerShow;
        valB = b.ticketsPerShow;
      } else if (movieSortField === "occupancy") {
        valA = a.occupancy;
        valB = b.occupancy;
      } else if (movieSortField === "revenue") {
        valA = a.totalRevenue;
        valB = b.totalRevenue;
      } else if (movieSortField === "revenuePerShow") {
        valA = a.revenuePerShow;
        valB = b.revenuePerShow;
      } else if (movieSortField === "momentum") {
        valA = a.momentum?.growthPercentage || 0;
        valB = b.momentum?.growthPercentage || 0;
      } else if (movieSortField === "healthScore") {
        valA = a.healthScore?.score || 0;
        valB = b.healthScore?.score || 0;
      }
      return movieSortAsc ? valA - valB : valB - valA;
    });
    return list;
  }, [analytics?.movies, movieSortField, movieSortAsc]);

  const handleMovieSort = (field: SortField) => {
    if (movieSortField === field) {
      setMovieSortAsc(!movieSortAsc);
    } else {
      setMovieSortField(field);
      setMovieSortAsc(false);
    }
  };

  const getRecommendationBadge = (rec: { action: string; label: string; reason: string }) => {
    switch (rec.action) {
      case "INCREASE":
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-xs font-bold bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800">
            <ArrowUpRight className="w-3.5 h-3.5" />
            {rec.label}
          </span>
        );
      case "REDUCE":
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-xs font-bold bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-400 border border-rose-200 dark:border-rose-800">
            <ArrowDownRight className="w-3.5 h-3.5" />
            {rec.label}
          </span>
        );
      case "MAINTAIN":
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-xs font-bold bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-400 border border-blue-200 dark:border-blue-800">
            <ThumbsUp className="w-3.5 h-3.5" />
            {rec.label}
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-xs font-bold bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-800">
            <Eye className="w-3.5 h-3.5" />
            {rec.label}
          </span>
        );
    }
  };

  const getMomentumBadge = (momentum?: {
    direction: string;
    label: string;
    growthPercentage: number;
  }) => {
    if (!momentum || momentum.direction === "NONE") {
      return (
        <span className="inline-flex items-center gap-1 text-xs text-zinc-400">
          <Minus className="w-3.5 h-3.5" />
          {t("analytics.momNone") || "Tidak tersedia"}
        </span>
      );
    }
    const isPos = momentum.growthPercentage > 0;
    const sign = isPos ? "+" : "";

    if (momentum.direction === "UP" || momentum.direction === "SLIGHT_UP") {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/60">
          <TrendingUp className="w-3.5 h-3.5" />
          {sign}
          {momentum.growthPercentage}% {momentum.label}
        </span>
      );
    }
    if (momentum.direction === "DOWN" || momentum.direction === "SLIGHT_DOWN") {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-800/60">
          <TrendingDown className="w-3.5 h-3.5" />
          {sign}
          {momentum.growthPercentage}% {momentum.label}
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 border border-zinc-200 dark:border-zinc-700">
        <Minus className="w-3.5 h-3.5" />
        {sign}
        {momentum.growthPercentage}% {momentum.label}
      </span>
    );
  };

  const getHealthScoreBadge = (healthScore?: { score: number; status: string; label: string }) => {
    if (!healthScore) return null;
    let colorClass = "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300";
    if (healthScore.status === "STRONG") {
      colorClass = "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800";
    } else if (healthScore.status === "NORMAL") {
      colorClass = "bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-950/40 dark:text-indigo-300 dark:border-indigo-800";
    } else if (healthScore.status === "WEAK") {
      colorClass = "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800";
    } else {
      colorClass = "bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800";
    }
    return (
      <div className="flex items-center gap-1.5">
        <span className={`px-2 py-0.5 rounded-lg text-xs font-extrabold border ${colorClass}`}>
          {healthScore.score}
        </span>
        <span className="text-[11px] font-medium text-zinc-400">{healthScore.label}</span>
      </div>
    );
  };

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
          {t("errors.unauthorized") || "Halaman analitik hanya dapat diakses oleh Administrator."}
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

  const {
    summary,
    period,
    movies = [],
    genres = [],
    dailyTotals = [],
    studioPerformance = [],
    timeSlotPerformance = [],
    showtimeHeatmap = [],
    bestShows = [],
    underperformingShows = [],
    dayOfWeekAnalytics = [],
    weekdayWeekendComparison,
  } = analytics || ({} as any);

  return (
    <div className="space-y-8 font-sans pb-16">
      {/* Top Header & Range Filter Bar */}
      <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4 bg-white dark:bg-zinc-900 p-6 rounded-3xl border border-zinc-200 dark:border-zinc-800 shadow-sm">
        <div>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-indigo-600 text-white flex items-center justify-center shadow-md shadow-indigo-600/20">
              <TrendingUp className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-2xl font-black tracking-tight text-zinc-900 dark:text-zinc-50">
                {t("analytics.title") || "Analitik Cinema"}
              </h1>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
                {t("analytics.subtitle") ||
                  "Dashboard pengambilan keputusan pemrograman film & analisis permintaan bioskop"}
              </p>
            </div>
          </div>
        </div>

        {/* Date Range Selector Presets */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center p-1 bg-zinc-100 dark:bg-zinc-800 rounded-2xl border border-zinc-200/80 dark:border-zinc-700/80">
            <button
              onClick={() => setRangePreset("7d")}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                rangePreset === "7d"
                  ? "bg-white dark:bg-zinc-900 text-indigo-600 dark:text-indigo-400 shadow-sm"
                  : "text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200"
              }`}
            >
              7D
            </button>
            <button
              onClick={() => setRangePreset("14d")}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                rangePreset === "14d"
                  ? "bg-white dark:bg-zinc-900 text-indigo-600 dark:text-indigo-400 shadow-sm"
                  : "text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200"
              }`}
            >
              14D
            </button>
            <button
              onClick={() => setRangePreset("30d")}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                rangePreset === "30d"
                  ? "bg-white dark:bg-zinc-900 text-indigo-600 dark:text-indigo-400 shadow-sm"
                  : "text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200"
              }`}
            >
              30D
            </button>
            <button
              onClick={() => setRangePreset("custom")}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                rangePreset === "custom"
                  ? "bg-white dark:bg-zinc-900 text-indigo-600 dark:text-indigo-400 shadow-sm"
                  : "text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200"
              }`}
            >
              Kustom
            </button>
          </div>

          {rangePreset === "custom" && (
            <div className="flex items-center gap-2">
              <input
                type="date"
                value={customStartDate}
                onChange={(e) => setCustomStartDate(e.target.value)}
                className="px-2.5 py-1.5 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl text-xs text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
              <span className="text-zinc-400 text-xs">-</span>
              <input
                type="date"
                value={customEndDate}
                onChange={(e) => setCustomEndDate(e.target.value)}
                className="px-2.5 py-1.5 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl text-xs text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          )}

          <button
            onClick={() => refetch()}
            disabled={isFetching}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-2xl bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-800 dark:text-zinc-200 text-xs font-semibold transition-colors cursor-pointer"
            title={t("analytics.refresh") || "Segarkan Data"}
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isFetching ? "animate-spin" : ""}`} />
            <span className="hidden sm:inline">{t("analytics.refresh") || "Segarkan"}</span>
          </button>
        </div>
      </div>

      {/* Main Tab Navigation: Film vs Genre */}
      <div className="flex items-center justify-between border-b border-zinc-200 dark:border-zinc-800 pb-1">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setActiveTab("movies")}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-2xl text-sm font-bold transition-all cursor-pointer ${
              activeTab === "movies"
                ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/20"
                : "bg-transparent text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800"
            }`}
          >
            <Film className="w-4 h-4" />
            {t("analytics.tabMovies") || "Film"}
            {movies.length > 0 && (
              <span
                className={`text-[10px] px-2 py-0.5 rounded-full font-extrabold ${
                  activeTab === "movies" ? "bg-white/20 text-white" : "bg-zinc-200 dark:bg-zinc-700 text-zinc-700 dark:text-zinc-300"
                }`}
              >
                {movies.length}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab("genres")}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-2xl text-sm font-bold transition-all cursor-pointer ${
              activeTab === "genres"
                ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/20"
                : "bg-transparent text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800"
            }`}
          >
            <Shapes className="w-4 h-4" />
            {t("analytics.tabGenres") || "Genre"}
            {genres.length > 0 && (
              <span
                className={`text-[10px] px-2 py-0.5 rounded-full font-extrabold ${
                  activeTab === "genres" ? "bg-white/20 text-white" : "bg-zinc-200 dark:bg-zinc-700 text-zinc-700 dark:text-zinc-300"
                }`}
              >
                {genres.length}
              </span>
            )}
          </button>
        </div>

        {period && (
          <div className="hidden md:flex items-center gap-1.5 text-xs text-zinc-400">
            <Calendar className="w-3.5 h-3.5" />
            <span>
              {period.startDate} s.d. {period.endDate} ({period.days} hari)
            </span>
          </div>
        )}
      </div>

      {/* TAB 1: FILM ANALYTICS */}
      {activeTab === "movies" && (
        <div className="space-y-8">
          {/* KPI Cards (4 Cards) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* KPI 1: Total Tiket Terjual */}
            <div className="p-5 rounded-3xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-sm space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-zinc-400 uppercase tracking-wider">
                  {t("analytics.totalTickets") || "Total Tiket Terjual"}
                </span>
                <div className="w-8 h-8 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
                  <Ticket className="w-4 h-4" />
                </div>
              </div>
              <div>
                <div className="text-2xl font-black text-zinc-900 dark:text-zinc-50">
                  {formatNumber(summary?.totalTickets || 0)}
                  <span className="text-xs font-normal text-zinc-400 ml-1.5">tiket</span>
                </div>
                <div className="text-xs text-zinc-500 dark:text-zinc-400 mt-1 flex items-center gap-2">
                  <span>Okupansi:</span>
                  <span className="font-bold text-indigo-600 dark:text-indigo-400">
                    {summary?.averageOccupancy || 0}%
                  </span>
                </div>
              </div>
            </div>

            {/* KPI 2: Rata-rata Tiket / Show */}
            <div className="p-5 rounded-3xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-sm space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-zinc-400 uppercase tracking-wider">
                  {t("analytics.ticketsPerShow") || "Rata-rata Tiket / Show"}
                </span>
                <div className="w-8 h-8 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                  <Activity className="w-4 h-4" />
                </div>
              </div>
              <div>
                <div className="text-2xl font-black text-zinc-900 dark:text-zinc-50">
                  {summary?.averageTicketsPerShow || 0}
                  <span className="text-xs font-normal text-zinc-400 ml-1.5">tiket/show</span>
                </div>
                <div className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
                  Dari {formatNumber(summary?.totalShowtimes || 0)} sesi penayangan
                </div>
              </div>
            </div>

            {/* KPI 3: Top Performing Movie */}
            <div className="p-5 rounded-3xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-sm space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-zinc-400 uppercase tracking-wider">
                  {t("analytics.topMovie") || "Film Terlaris"}
                </span>
                <div className="w-8 h-8 rounded-xl bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 flex items-center justify-center">
                  <Award className="w-4 h-4" />
                </div>
              </div>
              <div>
                <div className="text-sm font-extrabold text-zinc-900 dark:text-zinc-50 truncate" title={summary?.topMovie?.title || "-"}>
                  {summary?.topMovie?.title || "-"}
                </div>
                <div className="text-xs text-zinc-500 dark:text-zinc-400 mt-1 flex items-center justify-between">
                  <span>{formatNumber(summary?.topMovie?.tickets || 0)} tiket</span>
                  <span className="font-bold text-emerald-600 dark:text-emerald-400">
                    {summary?.topMovie?.occupancy || 0}% Okupansi
                  </span>
                </div>
              </div>
            </div>

            {/* KPI 4: Jam Tayang Paling Menghasilkan */}
            <div className="p-5 rounded-3xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-sm space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-zinc-400 uppercase tracking-wider">
                  {t("analytics.peakShowtime") || "Jam Tayang Paling Menghasilkan"}
                </span>
                <div className="w-8 h-8 rounded-xl bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 flex items-center justify-center">
                  <Clock className="w-4 h-4" />
                </div>
              </div>
              <div>
                <div className="text-base font-black text-zinc-900 dark:text-zinc-50 truncate">
                  {summary?.peakTimeSlot?.label || "18:00 - 21:00"}
                </div>
                <div className="text-xs text-zinc-500 dark:text-zinc-400 mt-1 flex items-center justify-between">
                  <span>{summary?.peakTimeSlot?.timeRange || "-"}</span>
                  <span className="font-bold text-indigo-600 dark:text-indigo-400">
                    {formatCurrency(summary?.peakTimeSlot?.revenue || 0)}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* D3 Chart Visualizer (Line / Bar) */}
          <div className="bg-white dark:bg-zinc-900 p-6 rounded-3xl border border-zinc-200 dark:border-zinc-800 shadow-sm space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <h3 className="text-lg font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
                  <BarChart3 className="w-5 h-5 text-indigo-600" />
                  {t("analytics.trendChartTitle") || "Tren Penjualan Harian Berdasarkan Film"}
                </h3>
                <p className="text-xs text-zinc-400 mt-0.5">
                  {t("analytics.trendChartSubtitle") || "Analisis fluktuasi penjualan tiket harian per film"}
                </p>
              </div>

              {/* Chart Controls */}
              <div className="flex flex-wrap items-center gap-2.5">
                {/* Metric Selector */}
                <div className="flex items-center p-1 bg-zinc-100 dark:bg-zinc-800 rounded-2xl border border-zinc-200/80 dark:border-zinc-700/80">
                  <button
                    onClick={() => setActiveMetric("revenue")}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                      activeMetric === "revenue"
                        ? "bg-white dark:bg-zinc-900 text-indigo-600 dark:text-indigo-400 shadow-sm"
                        : "text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200"
                    }`}
                  >
                    Omset (Rp)
                  </button>
                  <button
                    onClick={() => setActiveMetric("tickets")}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                      activeMetric === "tickets"
                        ? "bg-white dark:bg-zinc-900 text-indigo-600 dark:text-indigo-400 shadow-sm"
                        : "text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200"
                    }`}
                  >
                    Tiket
                  </button>
                </div>

                {/* Chart Type */}
                <div className="flex items-center p-1 bg-zinc-100 dark:bg-zinc-800 rounded-2xl border border-zinc-200/80 dark:border-zinc-700/80">
                  <button
                    onClick={() => setChartType("line")}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                      chartType === "line"
                        ? "bg-white dark:bg-zinc-900 text-indigo-600 dark:text-indigo-400 shadow-sm"
                        : "text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200"
                    }`}
                  >
                    Garis
                  </button>
                  <button
                    onClick={() => setChartType("bar")}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                      chartType === "bar"
                        ? "bg-white dark:bg-zinc-900 text-indigo-600 dark:text-indigo-400 shadow-sm"
                        : "text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200"
                    }`}
                  >
                    Batang
                  </button>
                </div>

                {/* Filter Single Movie */}
                <select
                  value={selectedMovieId}
                  onChange={(e) => setSelectedMovieId(e.target.value)}
                  className="px-3 py-2 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-2xl text-xs font-semibold text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="ALL">{t("analytics.allMovies") || "Semua Film"}</option>
                  {movies.map((m: any) => (
                    <option key={m.id} value={m.id}>
                      {m.title}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* D3 Render */}
            <MovieAnalyticsChart
              dailyTotals={dailyTotals}
              items={movieChartItems}
              activeMetric={activeMetric}
              chartType={chartType}
              selectedItemId={selectedMovieId}
              onSelectItem={(id) => setSelectedMovieId(id)}
              allLabel={t("analytics.allMovies") || "Semua Film"}
            />
          </div>

          {/* Detailed Movie Performance Table with Decision Support */}
          <div className="bg-white dark:bg-zinc-900 rounded-3xl border border-zinc-200 dark:border-zinc-800 shadow-sm overflow-hidden space-y-4">
            <div className="p-6 border-b border-zinc-100 dark:border-zinc-800/80 flex flex-col md:flex-row md:items-center justify-between gap-2">
              <div>
                <h3 className="text-lg font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
                  <Film className="w-5 h-5 text-indigo-600" />
                  {t("analytics.performanceBreakdown") || "Tabel Kinerja & Rekomendasi Pemrograman Film"}
                </h3>
                <p className="text-xs text-zinc-400 mt-0.5">
                  Klik pada judul kolom untuk mengurutkan (sorting) data. Klik baris untuk melihat rincian performa per studio.
                </p>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-zinc-50/80 dark:bg-zinc-800/50 text-zinc-500 font-bold border-b border-zinc-200 dark:border-zinc-800">
                    <th className="py-3 px-4 font-extrabold">{t("analytics.tableMovie") || "Film"}</th>
                    <th
                      onClick={() => handleMovieSort("tickets")}
                      className="py-3 px-3 text-right cursor-pointer hover:text-indigo-600"
                    >
                      <div className="flex items-center justify-end gap-1">
                        <span>Tiket</span>
                        {movieSortField === "tickets" && (movieSortAsc ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />)}
                      </div>
                    </th>
                    <th
                      onClick={() => handleMovieSort("shows")}
                      className="py-3 px-3 text-right cursor-pointer hover:text-indigo-600"
                    >
                      <div className="flex items-center justify-end gap-1">
                        <span>Shows</span>
                        {movieSortField === "shows" && (movieSortAsc ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />)}
                      </div>
                    </th>
                    <th
                      onClick={() => handleMovieSort("ticketsPerShow")}
                      className="py-3 px-3 text-right cursor-pointer hover:text-indigo-600"
                    >
                      <div className="flex items-center justify-end gap-1">
                        <span>Tiket/Show</span>
                        {movieSortField === "ticketsPerShow" && (movieSortAsc ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />)}
                      </div>
                    </th>
                    <th
                      onClick={() => handleMovieSort("occupancy")}
                      className="py-3 px-3 text-right cursor-pointer hover:text-indigo-600"
                    >
                      <div className="flex items-center justify-end gap-1">
                        <span>Okupansi</span>
                        {movieSortField === "occupancy" && (movieSortAsc ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />)}
                      </div>
                    </th>
                    <th
                      onClick={() => handleMovieSort("revenue")}
                      className="py-3 px-3 text-right cursor-pointer hover:text-indigo-600"
                    >
                      <div className="flex items-center justify-end gap-1">
                        <span>Pendapatan</span>
                        {movieSortField === "revenue" && (movieSortAsc ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />)}
                      </div>
                    </th>
                    <th
                      onClick={() => handleMovieSort("revenuePerShow")}
                      className="py-3 px-3 text-right cursor-pointer hover:text-indigo-600"
                    >
                      <div className="flex items-center justify-end gap-1">
                        <span>Rev/Show</span>
                        {movieSortField === "revenuePerShow" && (movieSortAsc ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />)}
                      </div>
                    </th>
                    <th className="py-3 px-3 text-center">Jam Puncak</th>
                    <th className="py-3 px-3 text-center">Best Studio</th>
                    <th
                      onClick={() => handleMovieSort("momentum")}
                      className="py-3 px-3 text-center cursor-pointer hover:text-indigo-600"
                    >
                      <div className="flex items-center justify-center gap-1">
                        <span>Momentum</span>
                        {movieSortField === "momentum" && (movieSortAsc ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />)}
                      </div>
                    </th>
                    <th
                      onClick={() => handleMovieSort("healthScore")}
                      className="py-3 px-3 text-center cursor-pointer hover:text-indigo-600"
                    >
                      <div className="flex items-center justify-center gap-1">
                        <span>Health</span>
                        {movieSortField === "healthScore" && (movieSortAsc ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />)}
                      </div>
                    </th>
                    <th className="py-3 px-4 text-center font-bold">Rekomendasi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800/60">
                  {sortedMovies.map((m: any) => {
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
                            {getMomentumBadge(m.momentum)}
                          </td>

                          {/* Health Score */}
                          <td className="py-3.5 px-3 text-center">
                            {getHealthScoreBadge(m.healthScore)}
                          </td>

                          {/* Recommendation */}
                          <td className="py-3.5 px-4 text-center">
                            <div className="flex flex-col items-center gap-1">
                              {getRecommendationBadge(m.recommendation)}
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
                                  <span>Rincian Performa per Studio: {m.title}</span>
                                </div>
                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-2">
                                  {m.studiosBreakdown?.map((st: any) => (
                                    <div
                                      key={st.studioId}
                                      className="p-3 rounded-xl bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-200/60 dark:border-zinc-700/60 space-y-1"
                                    >
                                      <div className="flex items-center justify-between text-xs font-extrabold">
                                        <span>{st.studioName}</span>
                                        <span className="text-indigo-600 dark:text-indigo-400">{st.occupancy}% Okupansi</span>
                                      </div>
                                      <div className="text-[11px] text-zinc-500 flex justify-between">
                                        <span>{st.shows} shows • {st.tickets} tiket</span>
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

          {/* Showtime Heatmap Matrix (Day of week × Hours) */}
          <div className="bg-white dark:bg-zinc-900 p-6 rounded-3xl border border-zinc-200 dark:border-zinc-800 shadow-sm space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="text-lg font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
                  <Grid3X3 className="w-5 h-5 text-indigo-600" />
                  {t("analytics.heatmapTitle") || "Heatmap Okupansi & Jam Tayang"}
                </h3>
                <p className="text-xs text-zinc-400 mt-0.5">
                  {t("analytics.heatmapSubtitle") || "Matriks distribusi okupansi kursi berdasarkan hari dalam seminggu dan jam penayangan"}
                </p>
              </div>

              {/* Heatmap Metric Selector */}
              <div className="flex items-center p-1 bg-zinc-100 dark:bg-zinc-800 rounded-2xl border border-zinc-200/80 dark:border-zinc-700/80">
                <button
                  onClick={() => setHeatmapMetric("occupancy")}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                    heatmapMetric === "occupancy"
                      ? "bg-white dark:bg-zinc-900 text-indigo-600 dark:text-indigo-400 shadow-sm"
                      : "text-zinc-600 dark:text-zinc-400"
                  }`}
                >
                  Okupansi %
                </button>
                <button
                  onClick={() => setHeatmapMetric("ticketsPerShow")}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                    heatmapMetric === "ticketsPerShow"
                      ? "bg-white dark:bg-zinc-900 text-indigo-600 dark:text-indigo-400 shadow-sm"
                      : "text-zinc-600 dark:text-zinc-400"
                  }`}
                >
                  Tiket / Show
                </button>
                <button
                  onClick={() => setHeatmapMetric("revenuePerShow")}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                    heatmapMetric === "revenuePerShow"
                      ? "bg-white dark:bg-zinc-900 text-indigo-600 dark:text-indigo-400 shadow-sm"
                      : "text-zinc-600 dark:text-zinc-400"
                  }`}
                >
                  Omset / Show
                </button>
              </div>
            </div>

            {/* Heatmap Grid */}
            <div className="overflow-x-auto">
              <div className="min-w-[650px] space-y-2">
                {/* Header slots */}
                <div className="grid grid-cols-8 gap-2 text-center text-xs font-bold text-zinc-400">
                  <div className="text-left pl-2">Hari</div>
                  <div>10:00 - 12:00</div>
                  <div>12:00 - 14:00</div>
                  <div>14:00 - 16:00</div>
                  <div>16:00 - 18:00</div>
                  <div>18:00 - 20:00</div>
                  <div>20:00 - 22:00</div>
                  <div>22:00+</div>
                </div>

                {/* Rows per Day of Week */}
                {[
                  { dow: 1, name: "Senin" },
                  { dow: 2, name: "Selasa" },
                  { dow: 3, name: "Rabu" },
                  { dow: 4, name: "Kamis" },
                  { dow: 5, name: "Jumat" },
                  { dow: 6, name: "Sabtu" },
                  { dow: 0, name: "Minggu" },
                ].map((d) => {
                  const dayCells = showtimeHeatmap.filter((c: any) => c.dayOfWeek === d.dow);
                  return (
                    <div key={d.dow} className="grid grid-cols-8 gap-2 items-center">
                      <div className="text-xs font-extrabold text-zinc-700 dark:text-zinc-300 pl-2">
                        {d.name}
                      </div>
                      {["10:00", "12:00", "14:00", "16:00", "18:00", "20:00", "22:00"].map((slotKey) => {
                        const cell = dayCells.find((c: any) => c.slotKey === slotKey) || {
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
                            title={`${d.name} ${slotKey}: ${cell.occupancy}% okupansi, ${cell.tickets} tiket, ${cell.showsCount} shows`}
                            className={`h-11 rounded-2xl flex flex-col items-center justify-center transition-transform hover:scale-105 cursor-pointer text-xs ${bgColor}`}
                          >
                            <span>{cell.showsCount > 0 ? displayVal : "-"}</span>
                            {cell.showsCount > 0 && (
                              <span className="text-[9px] opacity-75">{cell.showsCount} show</span>
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

          {/* Best Shows vs Underperforming Shows (Dual Grid) */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Top Performing Shows */}
            <div className="bg-white dark:bg-zinc-900 p-6 rounded-3xl border border-zinc-200 dark:border-zinc-800 shadow-sm space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-base font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
                  <Flame className="w-5 h-5 text-emerald-500" />
                  {t("analytics.bestShowsTitle") || "Jadwal Tayang Berperforma Terbaik"}
                </h3>
                <span className="text-[11px] font-bold text-emerald-600 bg-emerald-50 dark:bg-emerald-950/40 px-2.5 py-1 rounded-xl">
                  Top Okupansi
                </span>
              </div>

              <div className="space-y-2.5">
                {bestShows.slice(0, 5).map((s: any, idx: number) => (
                  <div
                    key={s.showtimeId || idx}
                    className="p-3.5 rounded-2xl bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200/60 dark:border-zinc-700/60 flex items-center justify-between gap-3"
                  >
                    <div className="min-w-0">
                      <div className="font-extrabold text-xs text-zinc-900 dark:text-zinc-100 truncate">
                        {s.movieTitle}
                      </div>
                      <div className="text-[11px] text-zinc-400 mt-0.5">
                        {s.displayDate} • {s.time} • <span className="font-semibold text-zinc-600 dark:text-zinc-300">{s.studioName}</span>
                      </div>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <div className="text-sm font-black text-emerald-600 dark:text-emerald-400">
                        {s.occupancy}%
                      </div>
                      <div className="text-[10px] text-zinc-400">
                        {s.tickets}/{s.capacity} tiket
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Underperforming Shows */}
            <div className="bg-white dark:bg-zinc-900 p-6 rounded-3xl border border-zinc-200 dark:border-zinc-800 shadow-sm space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-base font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
                  <AlertTriangle className="w-5 h-5 text-rose-500" />
                  {t("analytics.underperformingShowsTitle") || "Jadwal Tayang Berperforma Rendah"}
                </h3>
                <span className="text-[11px] font-bold text-rose-600 bg-rose-50 dark:bg-rose-950/40 px-2.5 py-1 rounded-xl">
                  Perlu Evaluasi
                </span>
              </div>

              <div className="space-y-2.5">
                {underperformingShows.slice(0, 5).map((s: any, idx: number) => (
                  <div
                    key={s.showtimeId || idx}
                    className="p-3.5 rounded-2xl bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200/60 dark:border-zinc-700/60 flex items-center justify-between gap-3"
                  >
                    <div className="min-w-0">
                      <div className="font-extrabold text-xs text-zinc-900 dark:text-zinc-100 truncate">
                        {s.movieTitle}
                      </div>
                      <div className="text-[11px] text-zinc-400 mt-0.5">
                        {s.displayDate} • {s.time} • <span className="font-semibold text-zinc-600 dark:text-zinc-300">{s.studioName}</span>
                      </div>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <div className="text-sm font-black text-rose-600 dark:text-rose-400">
                        {s.occupancy}%
                      </div>
                      <div className="text-[10px] text-zinc-400">
                        {s.tickets}/{s.capacity} tiket
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Weekday vs Weekend & Day of Week Breakdown */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Weekday vs Weekend Lift Card */}
            <div className="bg-white dark:bg-zinc-900 p-6 rounded-3xl border border-zinc-200 dark:border-zinc-800 shadow-sm space-y-4">
              <div>
                <h3 className="text-base font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
                  <SlidersHorizontal className="w-5 h-5 text-indigo-600" />
                  {t("analytics.weekdayWeekendTitle") || "Weekday vs Weekend"}
                </h3>
                <p className="text-xs text-zinc-400 mt-0.5">
                  Perbandingan animo penonton hari kerja vs akhir pekan
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-indigo-50/60 dark:bg-indigo-950/40 border border-indigo-200/60 dark:border-indigo-800/60 text-center space-y-1">
                <span className="text-[11px] font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider">
                  {t("analytics.weekendLift") || "Weekend Lift"}
                </span>
                <div className="text-3xl font-black text-indigo-700 dark:text-indigo-300">
                  {weekdayWeekendComparison?.weekendLiftPercentage > 0 ? "+" : ""}
                  {weekdayWeekendComparison?.weekendLiftPercentage || 0}%
                </div>
                <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
                  {t("analytics.weekendLiftDesc") || "Peningkatan keterisian penonton di akhir pekan dibanding hari kerja"}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3 pt-1">
                <div className="p-3.5 rounded-2xl bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200/60 dark:border-zinc-700/60 space-y-1">
                  <div className="text-xs font-bold text-zinc-500">Weekday (Sen-Kam)</div>
                  <div className="text-lg font-black text-zinc-900 dark:text-zinc-100">
                    {weekdayWeekendComparison?.weekday?.ticketsPerShow || 0}
                    <span className="text-[10px] font-normal text-zinc-400 ml-1">tix/show</span>
                  </div>
                  <div className="text-xs font-semibold text-zinc-600 dark:text-zinc-400">
                    {weekdayWeekendComparison?.weekday?.occupancy || 0}% Okupansi
                  </div>
                </div>

                <div className="p-3.5 rounded-2xl bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200/60 dark:border-zinc-700/60 space-y-1">
                  <div className="text-xs font-bold text-emerald-600">Weekend (Jum-Min)</div>
                  <div className="text-lg font-black text-zinc-900 dark:text-zinc-100">
                    {weekdayWeekendComparison?.weekend?.ticketsPerShow || 0}
                    <span className="text-[10px] font-normal text-zinc-400 ml-1">tix/show</span>
                  </div>
                  <div className="text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                    {weekdayWeekendComparison?.weekend?.occupancy || 0}% Okupansi
                  </div>
                </div>
              </div>
            </div>

            {/* Studio Performance Table */}
            <div className="lg:col-span-2 bg-white dark:bg-zinc-900 p-6 rounded-3xl border border-zinc-200 dark:border-zinc-800 shadow-sm space-y-4">
              <div>
                <h3 className="text-base font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
                  <Tv className="w-5 h-5 text-indigo-600" />
                  {t("analytics.studioPerformanceTitle") || "Performa Tiap Studio"}
                </h3>
                <p className="text-xs text-zinc-400 mt-0.5">
                  Efisiensi okupansi kursi dan kontribusi pendapatan per auditorium
                </p>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-zinc-200 dark:border-zinc-800 text-zinc-400 font-bold">
                      <th className="py-2.5 px-3">Studio</th>
                      <th className="py-2.5 px-3 text-right">Kapasitas</th>
                      <th className="py-2.5 px-3 text-right">Shows</th>
                      <th className="py-2.5 px-3 text-right">Tiket</th>
                      <th className="py-2.5 px-3 text-right">Okupansi</th>
                      <th className="py-2.5 px-3 text-right">Pendapatan</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800/60">
                    {studioPerformance.map((st: any) => (
                      <tr key={st.studioId} className="hover:bg-zinc-50 dark:hover:bg-zinc-800/50">
                        <td className="py-3 px-3 font-bold text-zinc-900 dark:text-zinc-100">
                          {st.studioName}
                        </td>
                        <td className="py-3 px-3 text-right text-zinc-500">
                          {st.capacity} kursi
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
          </div>
        </div>
      )}

      {/* TAB 2: GENRE ANALYTICS */}
      {activeTab === "genres" && (
        <div className="space-y-8">
          {/* KPI Cards (4 Cards) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* KPI 1: Top Grossing Genre */}
            <div className="p-5 rounded-3xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-sm space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-zinc-400 uppercase tracking-wider">
                  {t("analytics.topGenre") || "Genre Terlaris"}
                </span>
                <div className="w-8 h-8 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
                  <Shapes className="w-4 h-4" />
                </div>
              </div>
              <div>
                <div className="text-xl font-black text-zinc-900 dark:text-zinc-50 truncate">
                  {summary?.topGenre?.name || "-"}
                </div>
                <div className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
                  Pangsa Pasar: <span className="font-bold text-indigo-600">{summary?.topGenre?.revenueShare || 0}%</span>
                </div>
              </div>
            </div>

            {/* KPI 2: Total Genre Aktif */}
            <div className="p-5 rounded-3xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-sm space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-zinc-400 uppercase tracking-wider">
                  {t("analytics.activeGenres") || "Total Genre Aktif"}
                </span>
                <div className="w-8 h-8 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                  <Layers className="w-4 h-4" />
                </div>
              </div>
              <div>
                <div className="text-2xl font-black text-zinc-900 dark:text-zinc-50">
                  {genres.length}
                  <span className="text-xs font-normal text-zinc-400 ml-1.5">kategori</span>
                </div>
                <div className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
                  Mencakup {summary?.activeMoviesCount || 0} judul film tayang
                </div>
              </div>
            </div>

            {/* KPI 3: Rata-rata Tiket / Genre */}
            <div className="p-5 rounded-3xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-sm space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-zinc-400 uppercase tracking-wider">
                  Rata-rata Tiket / Genre
                </span>
                <div className="w-8 h-8 rounded-xl bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 flex items-center justify-center">
                  <Ticket className="w-4 h-4" />
                </div>
              </div>
              <div>
                <div className="text-2xl font-black text-zinc-900 dark:text-zinc-50">
                  {genres.length > 0 ? formatNumber(Math.round((summary?.totalTickets || 0) / genres.length)) : 0}
                  <span className="text-xs font-normal text-zinc-400 ml-1.5">tiket</span>
                </div>
                <div className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
                  Rata-rata per kategori genre
                </div>
              </div>
            </div>

            {/* KPI 4: Total Pendapatan Genre */}
            <div className="p-5 rounded-3xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-sm space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-zinc-400 uppercase tracking-wider">
                  Total Omset Terkumpul
                </span>
                <div className="w-8 h-8 rounded-xl bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 flex items-center justify-center">
                  <DollarSign className="w-4 h-4" />
                </div>
              </div>
              <div>
                <div className="text-xl font-black text-zinc-900 dark:text-zinc-50">
                  {formatCurrency(summary?.totalRevenue || 0)}
                </div>
                <div className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
                  {formatNumber(summary?.totalTickets || 0)} tiket terjual
                </div>
              </div>
            </div>
          </div>

          {/* Market Share Visualization (Toggle: Revenue Share vs Ticket Share) */}
          <div className="bg-white dark:bg-zinc-900 p-6 rounded-3xl border border-zinc-200 dark:border-zinc-800 shadow-sm space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="text-lg font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
                  <Percent className="w-5 h-5 text-indigo-600" />
                  {t("analytics.genreMarketShareTitle") || "Pangsa Pasar Genre"}
                </h3>
                <p className="text-xs text-zinc-400 mt-0.5">
                  {t("analytics.genreMarketShareSubtitle") || "Perbandingan kontribusi omset dan volume tiket masing-masing kategori"}
                </p>
              </div>

              <div className="flex items-center p-1 bg-zinc-100 dark:bg-zinc-800 rounded-2xl border border-zinc-200/80 dark:border-zinc-700/80">
                <button
                  onClick={() => setGenreShareMode("revenue")}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                    genreShareMode === "revenue"
                      ? "bg-white dark:bg-zinc-900 text-indigo-600 dark:text-indigo-400 shadow-sm"
                      : "text-zinc-600 dark:text-zinc-400"
                  }`}
                >
                  Pangsa Pendapatan (Revenue Share)
                </button>
                <button
                  onClick={() => setGenreShareMode("ticket")}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                    genreShareMode === "ticket"
                      ? "bg-white dark:bg-zinc-900 text-indigo-600 dark:text-indigo-400 shadow-sm"
                      : "text-zinc-600 dark:text-zinc-400"
                  }`}
                >
                  Pangsa Tiket (Ticket Share)
                </button>
              </div>
            </div>

            {/* Progress Bars per Genre */}
            <div className="space-y-4 pt-2">
              {genres.map((g: any, idx: number) => {
                const sharePercent = genreShareMode === "revenue" ? g.revenueShare : g.ticketShare;
                const colors = [
                  "bg-indigo-500",
                  "bg-emerald-500",
                  "bg-amber-500",
                  "bg-pink-500",
                  "bg-purple-500",
                  "bg-cyan-500",
                  "bg-rose-500",
                  "bg-orange-500",
                ];
                const barColor = colors[idx % colors.length];

                return (
                  <div key={g.id} className="space-y-1.5">
                    <div className="flex items-center justify-between text-xs font-bold">
                      <div className="flex items-center gap-2">
                        <span className="text-zinc-900 dark:text-zinc-100">{g.name}</span>
                        <span className="text-[11px] font-normal text-zinc-400">
                          ({g.moviesCount} film tayang)
                        </span>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-zinc-500 font-medium">
                          {genreShareMode === "revenue" ? formatCurrency(g.totalRevenue) : `${formatNumber(g.totalTickets)} tiket`}
                        </span>
                        <span className="font-extrabold text-zinc-900 dark:text-zinc-100 min-w-[45px] text-right">
                          {sharePercent}%
                        </span>
                      </div>
                    </div>
                    <div className="h-3 w-full bg-zinc-100 dark:bg-zinc-800 rounded-full overflow-hidden">
                      <div
                        className={`h-full ${barColor} rounded-full transition-all duration-700`}
                        style={{ width: `${Math.min(100, Math.max(1, sharePercent))}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* D3 Genre Trend Chart */}
          <div className="bg-white dark:bg-zinc-900 p-6 rounded-3xl border border-zinc-200 dark:border-zinc-800 shadow-sm space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <h3 className="text-lg font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
                  <BarChart3 className="w-5 h-5 text-indigo-600" />
                  {t("analytics.genreTrendChartTitle") || "Tren Penjualan Harian Berdasarkan Genre"}
                </h3>
                <p className="text-xs text-zinc-400 mt-0.5">
                  {t("analytics.genreTrendChartSubtitle") || "Analisis komparatif harian antar kategori genre film"}
                </p>
              </div>

              {/* Chart Controls */}
              <div className="flex flex-wrap items-center gap-2.5">
                <div className="flex items-center p-1 bg-zinc-100 dark:bg-zinc-800 rounded-2xl border border-zinc-200/80 dark:border-zinc-700/80">
                  <button
                    onClick={() => setActiveMetric("revenue")}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                      activeMetric === "revenue"
                        ? "bg-white dark:bg-zinc-900 text-indigo-600 dark:text-indigo-400 shadow-sm"
                        : "text-zinc-600 dark:text-zinc-400"
                    }`}
                  >
                    Omset (Rp)
                  </button>
                  <button
                    onClick={() => setActiveMetric("tickets")}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                      activeMetric === "tickets"
                        ? "bg-white dark:bg-zinc-900 text-indigo-600 dark:text-indigo-400 shadow-sm"
                        : "text-zinc-600 dark:text-zinc-400"
                    }`}
                  >
                    Tiket
                  </button>
                </div>

                <div className="flex items-center p-1 bg-zinc-100 dark:bg-zinc-800 rounded-2xl border border-zinc-200/80 dark:border-zinc-700/80">
                  <button
                    onClick={() => setChartType("line")}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                      chartType === "line"
                        ? "bg-white dark:bg-zinc-900 text-indigo-600 dark:text-indigo-400 shadow-sm"
                        : "text-zinc-600 dark:text-zinc-400"
                    }`}
                  >
                    Garis
                  </button>
                  <button
                    onClick={() => setChartType("bar")}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                      chartType === "bar"
                        ? "bg-white dark:bg-zinc-900 text-indigo-600 dark:text-indigo-400 shadow-sm"
                        : "text-zinc-600 dark:text-zinc-400"
                    }`}
                  >
                    Batang
                  </button>
                </div>

                <select
                  value={selectedGenreId}
                  onChange={(e) => setSelectedGenreId(e.target.value)}
                  className="px-3 py-2 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-2xl text-xs font-semibold text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="ALL">{t("analytics.allGenres") || "Semua Genre"}</option>
                  {genres.map((g: any) => (
                    <option key={g.id} value={g.id}>
                      {g.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <MovieAnalyticsChart
              dailyTotals={dailyTotals}
              items={genreChartItems}
              activeMetric={activeMetric}
              chartType={chartType}
              selectedItemId={selectedGenreId}
              onSelectItem={(id) => setSelectedGenreId(id)}
              allLabel={t("analytics.allGenres") || "Semua Genre"}
            />
          </div>

          {/* Genre Performance Table */}
          <div className="bg-white dark:bg-zinc-900 rounded-3xl border border-zinc-200 dark:border-zinc-800 shadow-sm overflow-hidden space-y-4">
            <div className="p-6 border-b border-zinc-100 dark:border-zinc-800/80">
              <h3 className="text-lg font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
                <Shapes className="w-5 h-5 text-indigo-600" />
                {t("analytics.genrePerformanceTitle") || "Kinerja & Pangsa Pasar Genre Film"}
              </h3>
              <p className="text-xs text-zinc-400 mt-0.5">
                {t("analytics.genrePerformanceSubtitle") || "Peringkat dan kontribusi omset per kategori genre"}
              </p>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-zinc-50/80 dark:bg-zinc-800/50 text-zinc-500 font-bold border-b border-zinc-200 dark:border-zinc-800">
                    <th className="py-3 px-4">{t("analytics.tableGenreName") || "Kategori Genre"}</th>
                    <th className="py-3 px-3">{t("analytics.tableMoviesInGenre") || "Judul Film Tayang"}</th>
                    <th className="py-3 px-3 text-right">Shows</th>
                    <th className="py-3 px-3 text-right">Tiket</th>
                    <th className="py-3 px-3 text-right">Tiket/Show</th>
                    <th className="py-3 px-3 text-right">Okupansi</th>
                    <th className="py-3 px-3 text-right">Pendapatan</th>
                    <th className="py-3 px-3 text-right">Share %</th>
                    <th className="py-3 px-4 text-center">Momentum</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800/60">
                  {genres.map((g: any) => (
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
                        {getMomentumBadge(g.momentum)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
