"use client";

import React, { useState } from "react";
import { useGetPublicMoviesQuery } from "@/services/bookingApi";
import { Film, Calendar, Search, ShieldCheck, Ticket } from "lucide-react";
import { Spinner } from "@/components/ui/spinner";
import Link from "next/link";
import { useTranslation } from "@/lib/i18n";

export default function PublicHome() {
  const [tab, setTab] = useState<"NOW_SHOWING" | "COMING_SOON">("NOW_SHOWING");
  const todayStr = React.useMemo(() => {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, "0");
    const day = String(now.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  }, []);

  const { data: response, isLoading } = useGetPublicMoviesQuery({
    status: tab,
    hasSchedule: tab === "NOW_SHOWING" ? true : undefined,
    startDate: todayStr,
  });
  const { t } = useTranslation();

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 font-sans">
      {/* Public Header */}
      <header className="sticky top-0 z-40 w-full bg-white/80 dark:bg-zinc-900/80 backdrop-blur-md border-b border-zinc-150 dark:border-zinc-800 transition-colors">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <img
              src="/PLANET-CINEMA-LOGO-2-COLOR.png"
              alt="Planet Cinema"
              className="h-10 w-auto object-contain"
            />
          </Link>
          
          <div className="flex items-center gap-4">
            <Link
              href="/bookings/lookup"
              className="px-4 py-2 border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-900 text-zinc-700 dark:text-zinc-300 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer"
            >
              <Search className="w-3.5 h-3.5" /> {t("home.lookupBooking")}
            </Link>
            <Link
              href="/login"
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-sm"
            >
              <ShieldCheck className="w-3.5 h-3.5" /> {t("home.staffLogin")}
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Banner Section */}
      <section className="relative overflow-hidden bg-indigo-950 py-20 text-center text-white">
        <div className="absolute inset-0 bg-gradient-to-t from-zinc-950/80 to-transparent z-1" />
        <div className="relative z-10 max-w-4xl mx-auto px-6 space-y-4">
          <span className="px-3.5 py-1.5 bg-indigo-500/20 border border-indigo-500/30 rounded-full text-xs font-bold tracking-wider text-indigo-300 uppercase">
            {t("home.eTicket")}
          </span>
          <h1 className="text-4xl md:text-5xl font-black tracking-tight text-white">
            {t("home.heroTitle")}
          </h1>
          <p className="text-zinc-300 text-sm md:text-base max-w-xl mx-auto leading-relaxed">
            {t("home.heroSubtitle")}
          </p>
        </div>
      </section>

      {/* Main Movie Catalog grid */}
      <main className="max-w-7xl mx-auto px-6 py-12 space-y-8">
        <div className="flex justify-between items-center border-b border-zinc-200 dark:border-zinc-800 pb-4">
          <div className="flex gap-4">
            <button
              onClick={() => setTab("NOW_SHOWING")}
              className={`pb-3 text-sm font-bold border-b-2 transition-all cursor-pointer ${
                tab === "NOW_SHOWING"
                  ? "border-indigo-600 text-indigo-600 dark:text-indigo-400"
                  : "border-transparent text-zinc-400 hover:text-zinc-600"
              }`}
            >
              {t("home.nowShowing")}
            </button>
            <button
              onClick={() => setTab("COMING_SOON")}
              className={`pb-3 text-sm font-bold border-b-2 transition-all cursor-pointer ${
                tab === "COMING_SOON"
                  ? "border-indigo-600 text-indigo-600 dark:text-indigo-400"
                  : "border-transparent text-zinc-400 hover:text-zinc-600"
              }`}
            >
              {t("home.comingSoon")}
            </button>
          </div>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-20"><Spinner className="w-12 h-12" /></div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-6">
            {response?.data?.map((movie) => (
              <Link
                href={`/movies/${movie.id}`}
                key={movie.id}
                className="group bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl overflow-hidden shadow-sm hover:shadow-md transition-all flex flex-col cursor-pointer"
              >
                <div className="relative aspect-[3/4] overflow-hidden bg-zinc-100 dark:bg-zinc-800">
                  {movie.poster ? (
                    <img
                      src={movie.poster}
                      alt={movie.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-350"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-zinc-400"><Film className="w-10 h-10" /></div>
                  )}
                  <span className="absolute top-3 right-3 px-2 py-1 bg-zinc-900/80 text-[10px] font-bold rounded-lg text-white backdrop-blur-sm">
                    {movie.censorshipRating}
                  </span>
                </div>

                <div className="p-4 flex-1 flex flex-col justify-between space-y-2">
                  <div className="space-y-1">
                    <span className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider block">
                      {movie.genres?.map((g) => g.genre.name).join(", ") || "-"}
                    </span>
                    <h3 className="font-bold text-zinc-900 dark:text-zinc-50 text-sm leading-snug group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                      {movie.title}
                    </h3>
                  </div>
                  <div className="text-[11px] text-zinc-400 flex items-center gap-1.5">
                    {movie.durationMinutes && <span>{movie.durationMinutes} min</span>}
                    {movie.durationMinutes && movie.language && <span>•</span>}
                    {movie.language && <span>{movie.language}</span>}
                    {!movie.durationMinutes && !movie.language && <span>{t("home.detailsUnspecified")}</span>}
                  </div>
                </div>
              </Link>
            ))}
            {(!response?.data || response.data.length === 0) && (
              <div className="col-span-full py-16 text-center text-zinc-400 italic">{t("home.noMovies")}</div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
