"use client";

import React, { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { useLazyGetPublicMoviesQuery } from "@/services/bookingApi";
import { Movie } from "@/lib/api/movieApi";
import {
  Film,
  Calendar,
  Search,
  ShieldCheck,
  Ticket,
  Sparkles,
  QrCode,
  Armchair,
  CheckCircle2,
  Clock,
  ArrowRight,
  Flame,
  X,
} from "lucide-react";
import Link from "next/link";
import { useTranslation } from "@/lib/i18n";
import { formatDuration, getCensorshipBadgeClass } from "@/lib/formatDuration";
import { ThemeToggle } from "@/components/ui/ThemeToggle";
import { LanguageToggle } from "@/components/ui/LanguageToggle";

const PAGE_LIMIT = 10;

function MovieCardSkeleton() {
  return (
    <div className="rounded-2xl bg-zinc-100 dark:bg-zinc-900/60 border border-zinc-200/80 dark:border-zinc-800/80 p-3 space-y-3 animate-pulse">
      <div className="aspect-[2/3] bg-zinc-200 dark:bg-zinc-800 rounded-xl" />
      <div className="h-3.5 bg-zinc-200 dark:bg-zinc-800 rounded w-3/4" />
      <div className="h-2.5 bg-zinc-200 dark:bg-zinc-800 rounded w-1/2" />
    </div>
  );
}

export default function PublicHome() {
  const { t, locale } = useTranslation();
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
      <header className="sticky top-0 z-40 w-full bg-white/85 dark:bg-zinc-900/85 backdrop-blur-md border-b border-zinc-200/80 dark:border-zinc-800 transition-colors">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-18 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <img
              src="/PLANET-CINEMA-LOGO-2-COLOR.png"
              alt="Planet Cinema"
              className="h-9 sm:h-10 w-auto object-contain"
            />
          </Link>

          <div className="flex items-center gap-3">
            <LanguageToggle />
            <ThemeToggle />
            <Link
              href="/login"
              className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-sm"
            >
              <ShieldCheck className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">{t("home.staffLogin")}</span>
            </Link>
          </div>
        </div>
      </header>

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

        {/* Movie Grid Section (arranged downwards with infinite scroll) */}
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
              {displayedMovies.map((movie) => {
                const genresStr = movie.genres?.map((g) => g.genre.name).join(", ") || "-";
                const isComingSoon = activeTab === "COMING_SOON" || movie.status === "COMING_SOON";

                return (
                  <Link
                    key={movie.id}
                    href={`/movies/${movie.id}`}
                    className="group bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800 rounded-2xl overflow-hidden shadow-xs hover:shadow-xl hover:border-indigo-400/50 dark:hover:border-indigo-500/40 transition-all duration-300 flex flex-col cursor-pointer"
                  >
                    {/* Poster Area */}
                    <div className="relative aspect-[2/3] overflow-hidden bg-zinc-950">
                      {movie.poster ? (
                        <img
                          src={movie.poster}
                          alt={movie.title}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 ease-out"
                        />
                      ) : (
                        <div className="w-full h-full flex flex-col items-center justify-center text-zinc-500 p-3 text-center">
                          <Film className="w-8 h-8 mb-1.5 opacity-50" />
                          <span className="text-[11px] line-clamp-2">{movie.title}</span>
                        </div>
                      )}

                      {/* Top Badges */}
                      <div className="absolute top-2 inset-x-2 flex items-center justify-between pointer-events-none">
                        <span
                          className={`px-2 py-0.5 text-[9px] font-black rounded-lg border backdrop-blur-md shadow-xs ${getCensorshipBadgeClass(
                            movie.censorshipRating
                          )}`}
                        >
                          {movie.censorshipRating || "SU"}
                        </span>

                        {isComingSoon && (
                          <span className="px-2 py-0.5 text-[9px] font-black rounded-lg bg-amber-500 text-white shadow-xs uppercase tracking-wider">
                            Soon
                          </span>
                        )}
                      </div>

                      {/* Gradient Overlay for Hover Action */}
                      <div className="absolute inset-0 bg-gradient-to-t from-zinc-950 via-zinc-950/30 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-end p-2.5">
                        <div className="w-full py-2 px-3 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-[11px] rounded-xl shadow-md flex items-center justify-center gap-1.5 transform translate-y-2 group-hover:translate-y-0 transition-transform duration-300">
                          {isComingSoon ? (
                            <>
                              <span>{t("home.viewDetails") || "Detail"}</span>
                              <ArrowRight className="w-3 h-3" />
                            </>
                          ) : (
                            <>
                              <Ticket className="w-3 h-3" />
                              <span>{t("home.bookTicket") || "Pesan"}</span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Card Content */}
                    <div className="p-3 flex-1 flex flex-col justify-between space-y-2">
                      <div className="space-y-1">
                        <span className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider line-clamp-1 block">
                          {genresStr}
                        </span>
                        <h3 className="font-bold text-zinc-900 dark:text-zinc-50 text-xs sm:text-sm leading-snug group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors line-clamp-2">
                          {movie.title}
                        </h3>
                      </div>

                      <div className="pt-1.5 border-t border-zinc-100 dark:border-zinc-800/80 flex items-center justify-between text-[10px] text-zinc-500 dark:text-zinc-400">
                        <div className="flex items-center gap-1">
                          <Clock className="w-3 h-3 text-zinc-400" />
                          <span>
                            {movie.durationMinutes
                              ? formatDuration(movie.durationMinutes, locale)
                              : t("home.detailsUnspecified")}
                          </span>
                        </div>

                        {movie.language && (
                          <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300">
                            {movie.language}
                          </span>
                        )}
                      </div>
                    </div>
                  </Link>
                );
              })}

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
        <section className="pt-12 border-t border-zinc-200 dark:border-zinc-800 space-y-8">
          <div className="text-center max-w-2xl mx-auto space-y-2">
            <span className="text-xs font-black uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
              Planet Cinema Experience
            </span>
            <h2 className="text-2xl sm:text-3xl font-black tracking-tight text-zinc-900 dark:text-zinc-50">
              {t("home.features.title")}
            </h2>
            <p className="text-sm text-zinc-500 dark:text-zinc-400">
              {t("home.features.subtitle")}
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="p-6 bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800 rounded-3xl shadow-sm space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 border border-indigo-200/80 dark:border-indigo-800/60 flex items-center justify-center">
                <Armchair className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-zinc-900 dark:text-zinc-50">
                {t("home.features.feature1Title")}
              </h3>
              <p className="text-sm text-zinc-500 dark:text-zinc-400 leading-relaxed">
                {t("home.features.feature1Desc")}
              </p>
            </div>

            <div className="p-6 bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800 rounded-3xl shadow-sm space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 border border-emerald-200/80 dark:border-emerald-800/60 flex items-center justify-center">
                <QrCode className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-zinc-900 dark:text-zinc-50">
                {t("home.features.feature2Title")}
              </h3>
              <p className="text-sm text-zinc-500 dark:text-zinc-400 leading-relaxed">
                {t("home.features.feature2Desc")}
              </p>
            </div>

            <div className="p-6 bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800 rounded-3xl shadow-sm space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 border border-amber-200/80 dark:border-amber-800/60 flex items-center justify-center">
                <Ticket className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-zinc-900 dark:text-zinc-50">
                {t("home.features.feature3Title")}
              </h3>
              <p className="text-sm text-zinc-500 dark:text-zinc-400 leading-relaxed">
                {t("home.features.feature3Desc")}
              </p>
            </div>
          </div>
        </section>
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
