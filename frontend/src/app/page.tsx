"use client";

import React, { useRef, useState, useEffect } from "react";
import { useGetPublicMoviesQuery } from "@/services/bookingApi";
import { Movie } from "@/lib/api/movieApi";
import {
  Film,
  Calendar,
  Search,
  ShieldCheck,
  Ticket,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  QrCode,
  Armchair,
  CheckCircle2,
  Clock,
  ArrowRight,
  Flame,
  Play,
  Layers,
} from "lucide-react";
import { Spinner } from "@/components/ui/spinner";
import Link from "next/link";
import { useTranslation } from "@/lib/i18n";
import { formatDuration, getCensorshipBadgeClass } from "@/lib/formatDuration";
import { ThemeToggle } from "@/components/ui/ThemeToggle";
import { LanguageToggle } from "@/components/ui/LanguageToggle";

interface MovieCarouselProps {
  title: string;
  subtitle: string;
  icon: React.ReactNode;
  badge?: string;
  movies: Movie[];
  isLoading: boolean;
  emptyText: string;
  isComingSoon?: boolean;
}

function MovieCarousel({
  title,
  subtitle,
  icon,
  badge,
  movies,
  isLoading,
  emptyText,
  isComingSoon = false,
}: MovieCarouselProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);
  const { t, locale } = useTranslation();

  const checkScroll = () => {
    if (!scrollRef.current) return;
    const { scrollLeft, scrollWidth, clientWidth } = scrollRef.current;
    setCanScrollLeft(scrollLeft > 10);
    setCanScrollRight(scrollLeft + clientWidth < scrollWidth - 10);
  };

  useEffect(() => {
    checkScroll();
    const el = scrollRef.current;
    if (!el) return;
    el.addEventListener("scroll", checkScroll, { passive: true });
    window.addEventListener("resize", checkScroll);
    return () => {
      el.removeEventListener("scroll", checkScroll);
      window.removeEventListener("resize", checkScroll);
    };
  }, [movies]);

  const handleScroll = (direction: "left" | "right") => {
    if (!scrollRef.current) return;
    const scrollAmount = Math.min(scrollRef.current.clientWidth * 0.75, 500);
    scrollRef.current.scrollBy({
      left: direction === "left" ? -scrollAmount : scrollAmount,
      behavior: "smooth",
    });
  };

  return (
    <section className="space-y-4">
      {/* Section Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 border border-indigo-150 dark:border-indigo-800/60">
              {icon}
            </div>
            <h2 className="text-xl sm:text-2xl font-black tracking-tight text-zinc-900 dark:text-zinc-50 flex items-center gap-2">
              {title}
              {badge && (
                <span className="text-[11px] px-2 py-0.5 font-bold rounded-full bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800/80">
                  {badge}
                </span>
              )}
            </h2>
          </div>
          <p className="text-xs sm:text-sm text-zinc-500 dark:text-zinc-400">
            {subtitle}
          </p>
        </div>

        {/* Carousel Navigation Buttons */}
        {movies && movies.length > 0 && (
          <div className="flex items-center gap-1.5 self-end sm:self-auto">
            <button
              onClick={() => handleScroll("left")}
              disabled={!canScrollLeft}
              aria-label={t("home.prev") || "Previous"}
              className="p-2 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 disabled:opacity-30 disabled:cursor-not-allowed transition-all shadow-xs active:scale-95 cursor-pointer"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={() => handleScroll("right")}
              disabled={!canScrollRight}
              aria-label={t("home.next") || "Next"}
              className="p-2 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 disabled:opacity-30 disabled:cursor-not-allowed transition-all shadow-xs active:scale-95 cursor-pointer"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>

      {/* Carousel Track */}
      {isLoading ? (
        <div className="flex gap-4 overflow-hidden py-2">
          {[1, 2, 3, 4, 5, 6].map((idx) => (
            <div
              key={idx}
              className="w-[160px] sm:w-[185px] md:w-[200px] shrink-0 rounded-2xl bg-zinc-100 dark:bg-zinc-900/60 border border-zinc-200/80 dark:border-zinc-800/80 p-3 space-y-3 animate-pulse"
            >
              <div className="aspect-[2/3] bg-zinc-200 dark:bg-zinc-800 rounded-xl" />
              <div className="h-3.5 bg-zinc-200 dark:bg-zinc-800 rounded w-3/4" />
              <div className="h-2.5 bg-zinc-200 dark:bg-zinc-800 rounded w-1/2" />
            </div>
          ))}
        </div>
      ) : !movies || movies.length === 0 ? (
        <div className="py-12 px-6 text-center border-2 border-dashed border-zinc-200 dark:border-zinc-800/80 rounded-2xl bg-zinc-50/50 dark:bg-zinc-900/20">
          <Film className="w-8 h-8 mx-auto text-zinc-400 dark:text-zinc-600 mb-2" />
          <p className="text-zinc-500 dark:text-zinc-400 text-xs font-medium">{emptyText}</p>
        </div>
      ) : (
        <div
          ref={scrollRef}
          className="flex gap-4 overflow-x-auto py-2 scroll-smooth no-scrollbar select-none [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
          style={{ scrollSnapType: "x mandatory" }}
        >
          {movies.map((movie) => {
            const genresStr = movie.genres?.map((g) => g.genre.name).join(", ") || "-";
            return (
              <Link
                key={movie.id}
                href={`/movies/${movie.id}`}
                style={{ scrollSnapAlign: "start" }}
                className="group w-[160px] sm:w-[185px] md:w-[200px] shrink-0 bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800 rounded-2xl overflow-hidden shadow-xs hover:shadow-lg hover:border-indigo-400/50 dark:hover:border-indigo-500/40 transition-all duration-300 flex flex-col cursor-pointer"
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
        </div>
      )}
    </section>
  );
}

export default function PublicHome() {
  const todayStr = React.useMemo(() => {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, "0");
    const day = String(now.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  }, []);

  // Fetch Now Showing (with schedules)
  const { data: nowShowingResponse, isLoading: nowShowingLoading } = useGetPublicMoviesQuery({
    status: "NOW_SHOWING",
    hasSchedule: true,
    startDate: todayStr,
  });

  // Fetch Coming Soon
  const { data: comingSoonResponse, isLoading: comingSoonLoading } = useGetPublicMoviesQuery({
    status: "COMING_SOON",
  });

  const { t } = useTranslation();

  const nowShowingMovies = nowShowingResponse?.data || [];
  const comingSoonMovies = comingSoonResponse?.data || [];

  const scrollToMovies = () => {
    const el = document.getElementById("movies-section");
    if (el) {
      el.scrollIntoView({ behavior: "smooth" });
    }
  };

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 font-sans text-zinc-900 dark:text-zinc-100">
      {/* Public Header */}
      <header className="sticky top-0 z-40 w-full bg-white/85 dark:bg-zinc-900/85 backdrop-blur-md border-b border-zinc-200/80 dark:border-zinc-800 transition-colors">
        <div className="max-w-7xl mx-auto px-6 h-18 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <img
              src="/PLANET-CINEMA-LOGO-2-COLOR.png"
              alt="Planet Cinema"
              className="h-10 w-auto object-contain"
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




      {/* Main Carousels Container */}
      <main id="movies-section" className="max-w-7xl mx-auto px-6 py-14 space-y-16">
        {/* CAROUSEL 1: SEDANG TAYANG (NOW SHOWING) */}
        <MovieCarousel
          title={t("home.nowShowing")}
          subtitle={t("home.nowShowingSubtitle")}
          icon={<Flame className="w-5 h-5" />}
          badge={nowShowingMovies.length > 0 ? `${nowShowingMovies.length} Film` : undefined}
          movies={nowShowingMovies}
          isLoading={nowShowingLoading}
          emptyText={t("home.noNowShowing")}
          isComingSoon={false}
        />

        {/* CAROUSEL 2: COMING SOON (SEGERA TAYANG) */}
        <MovieCarousel
          title={t("home.comingSoon")}
          subtitle={t("home.comingSoonSubtitle")}
          icon={<Sparkles className="w-5 h-5" />}
          badge={comingSoonMovies.length > 0 ? `${comingSoonMovies.length} Film` : undefined}
          movies={comingSoonMovies}
          isLoading={comingSoonLoading}
          emptyText={t("home.noComingSoon")}
          isComingSoon={true}
        />

        {/* FEATURES HIGHLIGHT SECTION */}
        <section className="pt-10 border-t border-zinc-200 dark:border-zinc-800 space-y-8">
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
        <div className="max-w-7xl mx-auto px-6 flex flex-col sm:flex-row items-center justify-between gap-6">
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
