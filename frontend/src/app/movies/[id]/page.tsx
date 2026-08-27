"use client";

import React, { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useGetPublicMovieByIdQuery, useGetPublicSchedulesQuery } from "@/services/bookingApi";
import { Spinner } from "@/components/ui/spinner";
import { ArrowLeft, Clock, Film, Calendar, Building2, Languages, PlayCircle } from "lucide-react";
import Link from "next/link";
import { useTranslation } from "@/lib/i18n";

const formatDuration = (minutes: number | null | undefined, locale: string, unavailable: string) => {
  if (!minutes) return unavailable;
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  const minuteLabel = locale === "id" ? "menit" : "min";
  const hourLabel = locale === "id" ? "jam" : "hr";
  if (!hours) return `${remainingMinutes} ${minuteLabel}`;
  if (!remainingMinutes) return `${hours} ${hourLabel}`;
  return `${hours} ${hourLabel} ${remainingMinutes} ${minuteLabel}`;
};

export default function PublicMovieDetail() {
  const params = useParams();
  const router = useRouter();
  const movieId = params.id as string;
  const { t, locale, formatDate } = useTranslation();

  const todayStr = React.useMemo(() => {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, "0");
    const day = String(now.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  }, []);

  const { data: movieResponse, isLoading: movieLoading } = useGetPublicMovieByIdQuery(movieId);
  const { data: schedulesResponse, isLoading: schedulesLoading } = useGetPublicSchedulesQuery({ movieId, startDate: todayStr });

  const [selectedDate, setSelectedDate] = useState<string>("");

  if (movieLoading || schedulesLoading) {
    return (
      <div className="flex justify-center items-center min-h-screen bg-zinc-50 dark:bg-zinc-950">
        <Spinner className="w-12 h-12" />
      </div>
    );
  }

  const movie = movieResponse?.data;
  if (!movie) {
    return (
      <div className="text-center py-20 bg-zinc-50 dark:bg-zinc-950 min-h-screen">
        <h2 className="text-xl font-bold">{t("movieDetail.notFound")}</h2>
        <Link href="/" className="text-indigo-600 hover:underline mt-2 inline-block">{t("movieDetail.backHome")}</Link>
      </div>
    );
  }

  // Extract and sort unique dates from schedules
  const schedules = schedulesResponse?.data || [];
  const uniqueDates = Array.from(new Set(schedules.map((s) => s.businessDate.split("T")[0])))
    .sort((a, b) => a.localeCompare(b));

  useEffect(() => {
    if (!selectedDate && uniqueDates.length > 0) {
      setSelectedDate(uniqueDates[0]);
    }
  }, [selectedDate, uniqueDates]);

  const filteredSchedules = schedules.filter((s) => s.businessDate.split("T")[0] === selectedDate);

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 font-sans pb-16">
      {/* Header */}
      <header className="sticky top-0 z-40 w-full bg-white/80 dark:bg-zinc-900/80 backdrop-blur-md border-b border-zinc-150 dark:border-zinc-800">
        <div className="max-w-5xl mx-auto px-6 h-16 flex items-center gap-4">
          <button onClick={() => router.push("/")} className="p-2 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-xl cursor-pointer">
            <ArrowLeft className="w-5 h-5 text-zinc-600 dark:text-zinc-400" />
          </button>
          <span className="font-bold text-zinc-850 dark:text-zinc-200">{t("movieDetail.title")}</span>
        </div>
      </header>

      {/* Main Info */}
      <main className="max-w-5xl mx-auto px-6 mt-8 space-y-12">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 items-start">
          {/* Poster */}
          <div className="aspect-[3/4] rounded-3xl overflow-hidden border border-zinc-200 dark:border-zinc-850 bg-zinc-100 dark:bg-zinc-900">
            {movie.poster ? (
              <img src={movie.poster} alt={movie.title} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-zinc-400"><Film className="w-12 h-12" /></div>
            )}
          </div>

          {/* Details */}
          <div className="md:col-span-2 space-y-6">
            <div className="space-y-2">
              <span className="px-3 py-1 bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-150 dark:border-indigo-900 text-indigo-600 dark:text-indigo-400 rounded-lg text-xs font-bold uppercase tracking-wider">
                {movie.genres?.map((g) => g.genre.name).join(", ") || "-"}
              </span>
              <h1 className="text-3xl font-black text-zinc-900 dark:text-zinc-50">{movie.title}</h1>
              {movie.originalTitle && movie.originalTitle !== movie.title && (
                <p className="text-zinc-400 italic text-sm">{movie.originalTitle}</p>
              )}
            </div>

            <div className="flex flex-wrap gap-4 text-xs font-semibold text-zinc-600 dark:text-zinc-400 bg-white dark:bg-zinc-900 p-4 border border-zinc-150 dark:border-zinc-850 rounded-2xl">
              <div className="flex items-center gap-1.5">
                <Clock className="w-4 h-4 text-indigo-500" />
                <span>{formatDuration(movie.durationMinutes, locale, t("movieDetail.unavailable"))}</span>
              </div>
              <div>•</div>
              <div>{t("movieDetail.censorship")}: {movie.censorshipRating}</div>
              {movie.language && (
                <>
                  <div>•</div>
                  <div>{t("movieDetail.language")}: {movie.language}</div>
                </>
              )}
              {movie.subtitle && (
                <>
                  <div>•</div>
                  <div>{t("movieDetail.subtitles")}: {movie.subtitle}</div>
                </>
              )}
            </div>

            <div className="space-y-2">
              <h3 className="text-xs font-bold text-zinc-400 uppercase tracking-wider">{t("movieDetail.synopsis")}</h3>
              <p className="text-zinc-600 dark:text-zinc-300 text-sm leading-relaxed">{movie.synopsis || t("movieDetail.noSynopsis")}</p>
            </div>

            <div className="grid grid-cols-1 gap-3">
              <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-4">
                <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-zinc-400">
                  <Building2 className="w-4 h-4 text-indigo-500" /> {t("movieDetail.productionHouse")}
                </div>
                <p className="mt-2 text-sm font-semibold text-zinc-900 dark:text-zinc-50">{movie.productionHouse?.name || t("movieDetail.unavailable")}</p>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-x-4 gap-y-5 border-t border-zinc-200 dark:border-zinc-800 pt-5">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">{t("movieDetail.releaseDate")}</p>
                <p className="mt-1 text-sm font-semibold text-zinc-800 dark:text-zinc-200">{movie.releaseDate ? formatDate(movie.releaseDate, { day: "numeric", month: "long", year: "numeric" }) : t("movieDetail.unavailable")}</p>
              </div>
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">{t("movieDetail.status")}</p>
                <p className="mt-1 text-sm font-semibold text-zinc-800 dark:text-zinc-200">{movie.status.replaceAll("_", " ")}</p>
              </div>
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">Bahasa</p>
                <p className="mt-1 text-sm font-semibold text-zinc-800 dark:text-zinc-200">{movie.language || t("movieDetail.unavailable")}</p>
              </div>
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">Subtitle</p>
                <p className="mt-1 text-sm font-semibold text-zinc-800 dark:text-zinc-200">{movie.subtitle || t("movieDetail.unavailable")}</p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3 text-sm">
              <div className="flex items-center gap-2 text-zinc-600 dark:text-zinc-300">
                <Languages className="w-4 h-4 text-indigo-500" />
                <span>{movie.genres?.map((genre) => genre.genre.name).join(", ") || t("movieDetail.genreUnavailable")}</span>
              </div>
              {movie.trailerUrl && (
                <a
                  href={movie.trailerUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2 text-xs font-bold text-white transition-colors hover:bg-indigo-700"
                >
                  <PlayCircle className="w-4 h-4" /> {t("movieDetail.watchTrailer")}
                </a>
              )}
            </div>
          </div>
        </div>

        {/* Schedules / Showtime Selector */}
        <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl p-6 md:p-8 space-y-8">
          <div className="space-y-1">
            <h2 className="text-lg font-bold text-zinc-900 dark:text-zinc-50 flex items-center gap-2">
              <Calendar className="w-5 h-5 text-indigo-600" /> {t("movieDetail.selectShowtime")}
            </h2>
            <p className="text-xs text-zinc-400">{t("movieDetail.chooseDate")}</p>
          </div>

          {uniqueDates.length > 0 ? (
            <div className="space-y-6">
              {/* Date tabs */}
              <div className="flex flex-wrap gap-2.5">
                {uniqueDates.map((date) => {
                  const d = new Date(date);
                  const active = selectedDate === date;
                  return (
                    <button
                      key={date}
                      onClick={() => setSelectedDate(date)}
                      className={`px-5 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                        active
                          ? "bg-indigo-600 text-white shadow-sm"
                          : "bg-zinc-50 dark:bg-zinc-950 hover:bg-zinc-100 border border-zinc-200 dark:border-zinc-800 text-zinc-700 dark:text-zinc-300"
                      }`}
                    >
                      {d.toLocaleDateString([], { weekday: "short", month: "short", day: "numeric" })}
                    </button>
                  );
                })}
              </div>

              {/* Showtimes Grid */}
              <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3">
                {filteredSchedules.map((schedule) => {
                  const startTime = new Date(schedule.startTime).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
                  return (
                    <button
                      key={schedule.id}
                      onClick={() => router.push(`/bookings/checkout?scheduleId=${schedule.id}`)}
                      className="p-4 bg-zinc-50 dark:bg-zinc-950 hover:bg-indigo-50/50 dark:hover:bg-indigo-950/20 border border-zinc-200 dark:border-zinc-850 hover:border-indigo-200 rounded-2xl text-left space-y-3 transition-all cursor-pointer group"
                    >
                      <div className="flex justify-between items-start">
                        <span className="text-base font-bold text-zinc-900 dark:text-zinc-50 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                          {startTime}
                        </span>
                        <span className="px-2 py-0.5 bg-zinc-200 dark:bg-zinc-850 rounded text-[9px] font-bold text-zinc-600 dark:text-zinc-400">
                          {schedule.studio?.code}
                        </span>
                      </div>
                      <div className="flex justify-between text-[11px] text-zinc-400">
                        <span>{t("movieDetail.studio")}: {schedule.studio?.name}</span>
                        <span className="font-semibold text-emerald-600">Rp {schedule.ticketPrice.toLocaleString()}</span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          ) : (
            <div className="py-12 text-center text-zinc-400 italic">{t("movieDetail.noShowtimes")}</div>
          )}
        </div>
      </main>
    </div>
  );
}
