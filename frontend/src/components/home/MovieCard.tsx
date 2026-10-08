import React from "react";
import Link from "next/link";
import { Film, Ticket, ArrowRight, Clock, Calendar } from "lucide-react";
import { Movie } from "@/lib/api/movieApi";
import { formatDuration, getCensorshipBadgeClass } from "@/lib/formatDuration";

export function MovieCardSkeleton() {
  return (
    <div className="rounded-2xl bg-zinc-100 dark:bg-zinc-900/60 border border-zinc-200/80 dark:border-zinc-800/80 p-3 space-y-3 animate-pulse">
      <div className="aspect-[2/3] bg-zinc-200 dark:bg-zinc-800 rounded-xl" />
      <div className="h-3.5 bg-zinc-200 dark:bg-zinc-800 rounded w-3/4" />
      <div className="h-2.5 bg-zinc-200 dark:bg-zinc-800 rounded w-1/2" />
    </div>
  );
}

interface MovieCardProps {
  movie: Movie;
  activeTab: "NOW_SHOWING" | "COMING_SOON";
  locale: string;
  t: (key: string) => string;
  formatDate: (value: string | Date, options?: Intl.DateTimeFormatOptions) => string;
}

export function MovieCard({ movie, activeTab, locale, t, formatDate }: MovieCardProps) {
  const genresStr = movie.genres?.map((g) => g.genre.name).join(", ") || "-";
  const isComingSoon = activeTab === "COMING_SOON" || movie.status === "COMING_SOON";

  return (
    <Link
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
          {isComingSoon ? (
            <div className="min-w-0">
              <div className="flex items-center gap-1 text-zinc-400">
                <Calendar className="w-3 h-3" />
                <span>{t("movieDetail.releaseDate")}</span>
              </div>
              <span className="mt-0.5 block truncate font-semibold text-zinc-700 dark:text-zinc-300">
                {movie.releaseDate
                  ? formatDate(movie.releaseDate, {
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                      timeZone: "UTC",
                    })
                  : t("home.detailsUnspecified")}
              </span>
            </div>
          ) : (
            <div className="flex items-center gap-1">
              <Clock className="w-3 h-3 text-zinc-400" />
              <span>
                {movie.durationMinutes
                  ? formatDuration(movie.durationMinutes, locale)
                  : t("home.detailsUnspecified")}
              </span>
            </div>
          )}

          {movie.language && (
            <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300">
              {movie.language}
            </span>
          )}
        </div>
      </div>
    </Link>
  );
}
