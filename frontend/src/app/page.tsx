"use client";

import React, { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { useLazyGetPublicMoviesQuery } from "@/services/bookingApi";
import { Movie } from "@/lib/api/movieApi";
import { Film, Search, Sparkles, Flame, X } from "lucide-react";
import Link from "next/link";
import { useTranslation } from "@/lib/i18n";
import { MovieCard, MovieCardSkeleton } from "@/components/home/MovieCard";
import { HomeFeaturesSection } from "@/components/home/HomeFeaturesSection";
import { HomeHeader } from "@/components/home/HomeHeader";

const PAGE_LIMIT = 10;

export default function PublicHome() {
  const { t, locale, formatDate } = useTranslation();
  const [activeTab, setActiveTab] = useState<"NOW_SHOWING" | "COMING_SOON">("NOW_SHOWING");
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");

  const sentinelRef = useRef<HTMLDivElement>(null);
  const [triggerGetMovies] = useLazyGetPublicMoviesQuery();

  const todayStr = useMemo(() => {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, "0");
    const day = String(now.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  }, []);

  // Debounce search query
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchQuery.trim());
    }, 350);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Now Showing State
  const [nowShowingMovies, setNowShowingMovies] = useState<Movie[]>([]);
  const [nowShowingPage, setNowShowingPage] = useState<number>(1);
  const [nowShowingMeta, setNowShowingMeta] = useState<{ total: number; page: number; limit: number; totalPages: number } | null>(null);
  const [isLoadingInitialNow, setIsLoadingInitialNow] = useState<boolean>(true);
  const [isLoadingMoreNow, setIsLoadingMoreNow] = useState<boolean>(false);

  // Coming Soon State
  const [comingSoonMovies, setComingSoonMovies] = useState<Movie[]>([]);
  const [comingSoonPage, setComingSoonPage] = useState<number>(1);
  const [comingSoonMeta, setComingSoonMeta] = useState<{ total: number; page: number; limit: number; totalPages: number } | null>(null);
  const [isLoadingInitialSoon, setIsLoadingInitialSoon] = useState<boolean>(true);
  const [isLoadingMoreSoon, setIsLoadingMoreSoon] = useState<boolean>(false);

  // Fetch initial data for Now Showing
  const fetchInitialNowShowing = useCallback(async (search?: string) => {
    setIsLoadingInitialNow(true);
    try {
      const res = await triggerGetMovies(
        {
          status: "NOW_SHOWING",
          hasSchedule: true,
          startDate: todayStr,
          search: search || undefined,
          page: 1,
          limit: PAGE_LIMIT,
        },
        false
      ).unwrap();
      setNowShowingMovies(res.data || []);
      setNowShowingPage(1);
      setNowShowingMeta(res.meta || null);
    } catch (err) {
      console.error("Failed to load now showing movies:", err);
    } finally {
      setIsLoadingInitialNow(false);
    }
  }, [todayStr, triggerGetMovies]);

  // Fetch initial data for Coming Soon
  const fetchInitialComingSoon = useCallback(async (search?: string) => {
    setIsLoadingInitialSoon(true);
    try {
      const res = await triggerGetMovies(
        {
          status: "COMING_SOON",
          search: search || undefined,
          page: 1,
          limit: PAGE_LIMIT,
        },
        false
      ).unwrap();
      setComingSoonMovies(res.data || []);
      setComingSoonPage(1);
      setComingSoonMeta(res.meta || null);
    } catch (err) {
      console.error("Failed to load coming soon movies:", err);
    } finally {
      setIsLoadingInitialSoon(false);
    }
  }, [triggerGetMovies]);

  // Trigger initial fetch or on search change
  useEffect(() => {
    fetchInitialNowShowing(debouncedSearch);
    fetchInitialComingSoon(debouncedSearch);
  }, [fetchInitialNowShowing, fetchInitialComingSoon, debouncedSearch]);

  // Load more for Now Showing
  const loadMoreNowShowing = useCallback(async () => {
    if (isLoadingMoreNow || isLoadingInitialNow) return;
    const totalPages = nowShowingMeta?.totalPages ?? 1;
    if (nowShowingPage >= totalPages) return;

    const nextPage = nowShowingPage + 1;
    setIsLoadingMoreNow(true);
    try {
      const res = await triggerGetMovies(
        {
          status: "NOW_SHOWING",
          hasSchedule: true,
          startDate: todayStr,
          search: debouncedSearch || undefined,
          page: nextPage,
          limit: PAGE_LIMIT,
        },
        false
      ).unwrap();
      if (res.data && res.data.length > 0) {
        setNowShowingMovies((prev) => {
          const existingIds = new Set(prev.map((m) => m.id));
          const uniqueNew = res.data.filter((m) => !existingIds.has(m.id));
          return [...prev, ...uniqueNew];
        });
        setNowShowingPage(nextPage);
        if (res.meta) setNowShowingMeta(res.meta);
      }
    } catch (err) {
      console.error("Failed to load more now showing movies:", err);
    } finally {
      setIsLoadingMoreNow(false);
    }
  }, [isLoadingMoreNow, isLoadingInitialNow, nowShowingMeta, nowShowingPage, todayStr, debouncedSearch, triggerGetMovies]);

  // Load more for Coming Soon
  const loadMoreComingSoon = useCallback(async () => {
    if (isLoadingMoreSoon || isLoadingInitialSoon) return;
    const totalPages = comingSoonMeta?.totalPages ?? 1;
    if (comingSoonPage >= totalPages) return;

    const nextPage = comingSoonPage + 1;
    setIsLoadingMoreSoon(true);
    try {
      const res = await triggerGetMovies(
        {
          status: "COMING_SOON",
          search: debouncedSearch || undefined,
          page: nextPage,
          limit: PAGE_LIMIT,
        },
        false
      ).unwrap();
      if (res.data && res.data.length > 0) {
        setComingSoonMovies((prev) => {
          const existingIds = new Set(prev.map((m) => m.id));
          const uniqueNew = res.data.filter((m) => !existingIds.has(m.id));
          return [...prev, ...uniqueNew];
        });
        setComingSoonPage(nextPage);
        if (res.meta) setComingSoonMeta(res.meta);
      }
    } catch (err) {
      console.error("Failed to load more coming soon movies:", err);
    } finally {
      setIsLoadingMoreSoon(false);
    }
  }, [isLoadingMoreSoon, isLoadingInitialSoon, comingSoonMeta, comingSoonPage, debouncedSearch, triggerGetMovies]);

  // Setup infinite scroll observer for vertical scroll
  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          if (activeTab === "NOW_SHOWING") {
            loadMoreNowShowing();
          } else {
            loadMoreComingSoon();
          }
        }
      },
      { rootMargin: "300px" }
    );

    observer.observe(sentinel);
    return () => {
      observer.disconnect();
    };
  }, [activeTab, loadMoreNowShowing, loadMoreComingSoon]);

  const displayedMovies = activeTab === "NOW_SHOWING" ? nowShowingMovies : comingSoonMovies;
  const isLoadingInitial = activeTab === "NOW_SHOWING" ? isLoadingInitialNow : isLoadingInitialSoon;
  const isLoadingMore = activeTab === "NOW_SHOWING" ? isLoadingMoreNow : isLoadingMoreSoon;
  const nowShowingCount = nowShowingMeta?.total ?? nowShowingMovies.length;
  const comingSoonCount = comingSoonMeta?.total ?? comingSoonMovies.length;

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 font-sans text-zinc-900 dark:text-zinc-100 transition-colors">
      {/* Public Header */}
      <HomeHeader t={t} />

      {/* Main Content Area */}
      <main id="movies-section" className="max-w-7xl mx-auto px-4 sm:px-6 py-10 sm:py-14 space-y-10">
        {/* Page Title & Search Bar */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-zinc-900 dark:text-zinc-50">
              {t("home.findMovie") || "Daftar Film Bioskop"}
            </h1>
            <p className="text-xs sm:text-sm text-zinc-500 dark:text-zinc-400">
              {t("home.nowShowingSubtitle") || "Pilih film favorit Anda dan pesan tiket dengan mudah"}
            </p>
          </div>

          {/* Search Bar Input */}
          <div className="relative w-full md:w-80">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400 pointer-events-none" />
            <input
              type="text"
              placeholder={t("home.findMovie") || "Cari judul film..."}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-10 py-2.5 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl text-xs sm:text-sm text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 focus:outline-hidden focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500 transition-all shadow-xs"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Tab Selection: Sedang Tayang (Now Showing) vs Segera Tayang (Coming Soon) */}
        <div className="flex items-center border-b border-zinc-200 dark:border-zinc-800 gap-2 sm:gap-4 overflow-x-auto no-scrollbar">
          <button
            onClick={() => setActiveTab("NOW_SHOWING")}
            className={`pb-3.5 px-2 sm:px-4 font-bold text-sm sm:text-base flex items-center gap-2 border-b-2 transition-all cursor-pointer whitespace-nowrap ${
              activeTab === "NOW_SHOWING"
                ? "border-indigo-600 text-indigo-600 dark:text-indigo-400"
                : "border-transparent text-zinc-500 hover:text-zinc-800 dark:text-zinc-400 dark:hover:text-zinc-200"
            }`}
          >
            <Flame className="w-4 h-4 sm:w-5 sm:h-5" />
            <span>{t("home.nowShowing")}</span>
            <span
              className={`text-xs px-2 py-0.5 rounded-full font-semibold ${
                activeTab === "NOW_SHOWING"
                  ? "bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800/80"
                  : "bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400"
              }`}
            >
              {nowShowingCount}
            </span>
          </button>

          <button
            onClick={() => setActiveTab("COMING_SOON")}
            className={`pb-3.5 px-2 sm:px-4 font-bold text-sm sm:text-base flex items-center gap-2 border-b-2 transition-all cursor-pointer whitespace-nowrap ${
              activeTab === "COMING_SOON"
                ? "border-indigo-600 text-indigo-600 dark:text-indigo-400"
                : "border-transparent text-zinc-500 hover:text-zinc-800 dark:text-zinc-400 dark:hover:text-zinc-200"
            }`}
          >
            <Sparkles className="w-4 h-4 sm:w-5 sm:h-5" />
            <span>{t("home.comingSoon")}</span>
            <span
              className={`text-xs px-2 py-0.5 rounded-full font-semibold ${
                activeTab === "COMING_SOON"
                  ? "bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800/80"
                  : "bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400"
              }`}
            >
              {comingSoonCount}
            </span>
          </button>
        </div>

        {/* Movie Grid Section */}
        {isLoadingInitial ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 sm:gap-6">
            {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((idx) => (
              <MovieCardSkeleton key={idx} />
            ))}
          </div>
        ) : !displayedMovies || displayedMovies.length === 0 ? (
          <div className="py-16 px-6 text-center border-2 border-dashed border-zinc-200 dark:border-zinc-800/80 rounded-3xl bg-zinc-50/50 dark:bg-zinc-900/20 max-w-lg mx-auto space-y-3">
            <Film className="w-10 h-10 mx-auto text-zinc-400 dark:text-zinc-600" />
            <h3 className="text-base font-bold text-zinc-800 dark:text-zinc-200">
              {activeTab === "NOW_SHOWING" ? t("home.noNowShowing") : t("home.noComingSoon")}
            </h3>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              {debouncedSearch
                ? `Tidak ada film yang cocok dengan pencarian "${debouncedSearch}"`
                : "Belum ada jadwal film yang tersedia saat ini."}
            </p>
          </div>
        ) : (
          <div className="space-y-8">
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 sm:gap-6">
              {displayedMovies.map((movie) => (
                <MovieCard
                  key={movie.id}
                  movie={movie}
                  activeTab={activeTab}
                  locale={locale}
                  t={t}
                  formatDate={formatDate}
                />
              ))}

              {/* Skeleton cards shown while loading more downwards */}
              {isLoadingMore &&
                [1, 2, 3, 4, 5].map((idx) => (
                  <MovieCardSkeleton key={`skeleton-more-${idx}`} />
                ))}
            </div>

            {/* Infinite scroll sentinel marker */}
            <div ref={sentinelRef} className="h-4 w-full" />
          </div>
        )}

        {/* FEATURES HIGHLIGHT SECTION */}
        <HomeFeaturesSection t={t} />
      </main>

      {/* Footer */}
      <footer className="border-t border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 py-10 mt-16 transition-colors">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-3">
            <img
              src="/PLANET-CINEMA-LOGO-2-COLOR.png"
              alt="Planet Cinema"
              className="h-8 w-auto object-contain"
            />
            <span className="text-xs text-zinc-400">
              © {new Date().getFullYear()} Planet Cinema. All rights reserved.
            </span>
          </div>

          <div className="flex items-center gap-6 text-xs font-semibold text-zinc-500 dark:text-zinc-400">
            <Link href="/login" className="hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors">
              {t("home.staffLogin")}
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
