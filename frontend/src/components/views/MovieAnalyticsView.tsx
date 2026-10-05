"use client";

import React, { useState, useMemo } from "react";
import { useGetMovieAnalyticsQuery } from "@/services/opsApi";
import { useAppSelector } from "@/store/hooks";
import { useTranslation } from "@/lib/i18n";
import { Spinner } from "@/components/ui/spinner";
import { TrendingUp, RefreshCw, Film, Shapes, Calendar, ShieldAlert } from "lucide-react";

// Modular Analytics Components
import { AnalyticsDateRangeFilter, RangePreset } from "@/components/analytics/AnalyticsDateRangeFilter";
import { AnalyticsKpiCards } from "@/components/analytics/AnalyticsKpiCards";
import { AnalyticsGenreKpiCards } from "@/components/analytics/AnalyticsGenreKpiCards";
import { AnalyticsMovieTable, MovieSortField } from "@/components/analytics/AnalyticsMovieTable";
import { AnalyticsHeatmap } from "@/components/analytics/AnalyticsHeatmap";
import { AnalyticsShowtimeHighlights } from "@/components/analytics/AnalyticsShowtimeHighlights";
import { AnalyticsWeekdayWeekendCard } from "@/components/analytics/AnalyticsWeekdayWeekendCard";
import { AnalyticsStudioTable } from "@/components/analytics/AnalyticsStudioTable";
import { AnalyticsGenreMarketShare } from "@/components/analytics/AnalyticsGenreMarketShare";
import { AnalyticsGenreTable } from "@/components/analytics/AnalyticsGenreTable";
import { AnalyticsChartSection } from "@/components/analytics/AnalyticsChartSection";
import { AnalyticsChartItem } from "@/components/analytics/MovieAnalyticsChart";

export default function MovieAnalyticsView() {
  const { t } = useTranslation();
  const user = useAppSelector((state) => state.auth.user);

  // Tab & Filter States
  const [activeTab, setActiveTab] = useState<"movies" | "genres">("movies");
  const [rangePreset, setRangePreset] = useState<RangePreset>("7d");
  const [customStartDate, setCustomStartDate] = useState<string>("");
  const [customEndDate, setCustomEndDate] = useState<string>("");

  // Chart Controls
  const [activeMetric, setActiveMetric] = useState<"revenue" | "tickets">("revenue");
  const [chartType, setChartType] = useState<"line" | "bar">("line");
  const [selectedMovieId, setSelectedMovieId] = useState<string>("ALL");
  const [selectedGenreId, setSelectedGenreId] = useState<string>("ALL");

  // Movie Table Sorting
  const [movieSortField, setMovieSortField] = useState<MovieSortField>("tickets");
  const [movieSortAsc, setMovieSortAsc] = useState<boolean>(false);

  // Compute query arguments based on preset or custom dates
  const queryArgs = useMemo(() => {
    if (rangePreset === "custom") {
      if (customStartDate && customEndDate) {
        return { startDate: customStartDate, endDate: customEndDate };
      }
      return { days: 7 };
    }
    const daysMap: Record<string, number> = {
      "7d": 7,
      "14d": 14,
      "30d": 30,
    };
    return { days: daysMap[rangePreset] || 7 };
  }, [rangePreset, customStartDate, customEndDate]);

  // Access Control: Admin & Report roles
  const roleName = typeof user?.role === "string" ? user.role : (user?.role as any)?.name || "";
  const roleUpper = roleName.toUpperCase();
  const hasAccess =
    roleUpper.includes("ADMIN") ||
    roleUpper.includes("REPORT") ||
    roleUpper.includes("LAPORAN") ||
    roleUpper.includes("SUPERADMIN") ||
    roleUpper.includes("OWNER") ||
    (user as any)?.roleName?.toUpperCase()?.includes("ADMIN") ||
    (user as any)?.roleName?.toUpperCase()?.includes("REPORT") ||
    (user?.username || "").toLowerCase().includes("admin") ||
    (user?.username || "").toLowerCase().includes("hari");

  const {
    data: analytics,
    isLoading,
    isFetching,
    refetch,
  } = useGetMovieAnalyticsQuery(queryArgs, {
    skip: !hasAccess,
    pollingInterval: 0,
  });

  // Movie Chart Items transformer
  const movieChartItems: AnalyticsChartItem[] = useMemo(() => {
    if (!analytics?.movies) return [];
    return analytics.movies.map((m: any) => ({
      id: m.id,
      title: m.title,
      totalRevenue: m.totalRevenue,
      totalTickets: m.totalTickets,
      daily: m.daily || [],
    }));
  }, [analytics?.movies]);

  // Genre Chart Items transformer
  const genreChartItems: AnalyticsChartItem[] = useMemo(() => {
    if (!analytics?.genres) return [];
    return analytics.genres.map((g: any) => ({
      id: g.id,
      title: g.name,
      totalRevenue: g.totalRevenue,
      totalTickets: g.totalTickets,
      daily: g.daily || [],
    }));
  }, [analytics?.genres]);

  // Sorted Movies List
  const sortedMovies = useMemo(() => {
    if (!analytics?.movies) return [];
    const list = [...analytics.movies];
    list.sort((a, b) => {
      let valA: number = 0;
      let valB: number = 0;
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

  const handleMovieSort = (field: MovieSortField) => {
    if (movieSortField === field) {
      setMovieSortAsc(!movieSortAsc);
    } else {
      setMovieSortField(field);
      setMovieSortAsc(false);
    }
  };

  if (!hasAccess) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center p-6 space-y-4">
        <div className="w-16 h-16 rounded-3xl bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 flex items-center justify-center">
          <ShieldAlert className="w-8 h-8" />
        </div>
        <h2 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">
          {t("errors.permissionDenied") || "Akses Ditolak"}
        </h2>
        <p className="text-sm text-zinc-500 max-w-md">
          {t("errors.unauthorized") || "Halaman analitik hanya dapat diakses oleh Administrator & Role Report."}
        </p>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] space-y-3">
        <Spinner className="w-8 h-8 text-indigo-600" />
        <p className="text-sm text-zinc-500">{t("common.loading") || "Memuat..."}</p>
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
    showtimeHeatmap = [],
    bestShows = [],
    underperformingShows = [],
    weekdayWeekendComparison,
  } = analytics || ({} as any);

  return (
    <div className="space-y-8 font-sans pb-16">
      {/* Header & Page Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-zinc-900 p-6 rounded-3xl border border-zinc-200 dark:border-zinc-800 shadow-sm">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-indigo-600 text-white flex items-center justify-center shadow-md shadow-indigo-600/25 flex-shrink-0">
            <TrendingUp className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-2xl font-black tracking-tight text-zinc-900 dark:text-zinc-50">
              {t("analytics.title")}
            </h1>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
              {t("analytics.subtitle")}
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => refetch()}
          disabled={isFetching}
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-2xl bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-800 dark:text-zinc-200 text-xs font-bold transition-all shadow-sm cursor-pointer self-start sm:self-auto"
        >
          <RefreshCw className={`w-4 h-4 ${isFetching ? "animate-spin text-indigo-600" : ""}`} />
          <span>{t("analytics.refresh")}</span>
        </button>
      </div>

      {/* Prominent Date Range Selector Bar */}
      <AnalyticsDateRangeFilter
        rangePreset={rangePreset}
        setRangePreset={setRangePreset}
        customStartDate={customStartDate}
        setCustomStartDate={setCustomStartDate}
        customEndDate={customEndDate}
        setCustomEndDate={setCustomEndDate}
        period={period}
      />

      {/* Main Tab Navigation: Film vs Genre */}
      <div className="flex items-center justify-between border-b border-zinc-200 dark:border-zinc-800 pb-1">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setActiveTab("movies")}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-2xl text-sm font-bold transition-all cursor-pointer ${
              activeTab === "movies"
                ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/20"
                : "bg-transparent text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800"
            }`}
          >
            <Film className="w-4 h-4" />
            {t("analytics.tabMovies")}
            {movies.length > 0 && (
              <span
                className={`text-[10px] px-2 py-0.5 rounded-full font-extrabold ${
                  activeTab === "movies"
                    ? "bg-white/20 text-white"
                    : "bg-zinc-200 dark:bg-zinc-700 text-zinc-700 dark:text-zinc-300"
                }`}
              >
                {movies.length}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("genres")}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-2xl text-sm font-bold transition-all cursor-pointer ${
              activeTab === "genres"
                ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/20"
                : "bg-transparent text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800"
            }`}
          >
            <Shapes className="w-4 h-4" />
            {t("analytics.tabGenres")}
            {genres.length > 0 && (
              <span
                className={`text-[10px] px-2 py-0.5 rounded-full font-extrabold ${
                  activeTab === "genres"
                    ? "bg-white/20 text-white"
                    : "bg-zinc-200 dark:bg-zinc-700 text-zinc-700 dark:text-zinc-300"
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
              {period.startDate} {t("common.to") || "s.d."} {period.endDate} ({period.days} {t("common.days") || "hari"})
            </span>
          </div>
        )}
      </div>

      {/* TAB 1: FILM ANALYTICS */}
      {activeTab === "movies" && (
        <div className="space-y-8">
          {/* KPI Cards */}
          <AnalyticsKpiCards summary={summary} />

          {/* D3 Chart Visualizer */}
          <AnalyticsChartSection
            title={t("analytics.trendChartTitle")}
            subtitle={t("analytics.trendChartSubtitle")}
            dailyTotals={dailyTotals}
            chartItems={movieChartItems}
            activeMetric={activeMetric}
            setActiveMetric={setActiveMetric}
            chartType={chartType}
            setChartType={setChartType}
            selectedItemId={selectedMovieId}
            setSelectedItemId={setSelectedMovieId}
            itemsList={movies.map((m: any) => ({ id: m.id, name: m.title }))}
            allOptionLabel={t("analytics.allMovies")}
          />

          {/* Detailed Movie Performance Table with Decision Support */}
          <AnalyticsMovieTable
            movies={sortedMovies}
            sortField={movieSortField}
            sortAsc={movieSortAsc}
            onSort={handleMovieSort}
          />

          {/* Showtime Heatmap Matrix */}
          <AnalyticsHeatmap showtimeHeatmap={showtimeHeatmap} />

          {/* Best Shows vs Underperforming Shows */}
          <AnalyticsShowtimeHighlights
            bestShows={bestShows}
            underperformingShows={underperformingShows}
          />

          {/* Weekday vs Weekend & Studio Performance Breakdown */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <AnalyticsWeekdayWeekendCard data={weekdayWeekendComparison} />
            <AnalyticsStudioTable studios={studioPerformance} />
          </div>
        </div>
      )}

      {/* TAB 2: GENRE ANALYTICS */}
      {activeTab === "genres" && (
        <div className="space-y-8">
          {/* KPI Cards */}
          <AnalyticsGenreKpiCards summary={summary} genresCount={genres.length} />

          {/* Market Share Progress Bars */}
          <AnalyticsGenreMarketShare genres={genres} />

          {/* D3 Genre Trend Chart */}
          <AnalyticsChartSection
            title={t("analytics.genreTrendChartTitle")}
            subtitle={t("analytics.genreTrendChartSubtitle")}
            dailyTotals={dailyTotals}
            chartItems={genreChartItems}
            activeMetric={activeMetric}
            setActiveMetric={setActiveMetric}
            chartType={chartType}
            setChartType={setChartType}
            selectedItemId={selectedGenreId}
            setSelectedItemId={setSelectedGenreId}
            itemsList={genres.map((g: any) => ({ id: g.id, name: g.name }))}
            allOptionLabel={t("analytics.allGenres")}
          />

          {/* Genre Performance Table */}
          <AnalyticsGenreTable genres={genres} />
        </div>
      )}
    </div>
  );
}
