"use client";

import React from "react";
import { Armchair, Clock, Film } from "lucide-react";
import { Schedule } from "@/services/studioApi";
import { formatDuration, getCensorshipBadgeClass } from "@/lib/formatDuration";
import { useTranslation } from "@/lib/i18n";

export interface GroupedStudioSchedule {
  studio: any;
  schedules: Schedule[];
}

interface CustomerDisplayStandbyBoardProps {
  schedulesLoading: boolean;
  groupedStudioSchedules: GroupedStudioSchedule[];
}

export function CustomerDisplayStandbyBoard({
  schedulesLoading,
  groupedStudioSchedules,
}: CustomerDisplayStandbyBoardProps) {
  const { t, locale, formatDate, formatCurrency } = useTranslation();

  return (
    <div className="flex-1 flex flex-col justify-start max-w-7xl mx-auto w-full p-4 sm:p-6 md:p-8 space-y-6">
      {/* Billboard Top Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-zinc-200 dark:border-zinc-800">
        <div>
          <h2 className="text-xl sm:text-2xl font-black text-zinc-900 dark:text-zinc-50 tracking-tight flex items-center gap-2.5">
            <Film className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
            <span>{t("cashier.standbyTitle") || "Jadwal Tayang Hari Ini"}</span>
          </h2>
          <p className="text-xs sm:text-sm text-zinc-500 dark:text-zinc-400 mt-0.5">
            {new Date().toLocaleDateString("id-ID", { weekday: "long" })}, {formatDate(new Date())}
          </p>
        </div>

        <div className="flex items-center gap-2 text-xs font-semibold px-3.5 py-1.5 rounded-xl bg-zinc-100 dark:bg-zinc-800/80 border border-zinc-200 dark:border-zinc-700/60 text-zinc-600 dark:text-zinc-300 self-start sm:self-auto">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          <span>Realtime Showtimes Board</span>
        </div>
      </div>

      {schedulesLoading ? (
        <div className="flex-1 flex flex-col items-center justify-center py-24 gap-3">
          <div className="w-8 h-8 border-3 border-indigo-600 border-t-transparent rounded-full animate-spin" />
          <p className="text-xs text-zinc-400 font-medium">Memuat jadwal tayang hari ini...</p>
        </div>
      ) : groupedStudioSchedules.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center py-24 gap-3 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl p-8 text-center shadow-2xs">
          <Armchair className="w-12 h-12 text-zinc-300 dark:text-zinc-700" />
          <h3 className="text-base font-bold text-zinc-800 dark:text-zinc-200">Belum Ada Jadwal Hari Ini</h3>
          <p className="text-xs text-zinc-400 max-w-sm">
            Silakan tanyakan kepada kasir kami mengenai informasi jam tayang berikutnya.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
          {groupedStudioSchedules.map((group) => {
            const studio = group.studio;
            const typeStyles =
              {
                VIP: "bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/20",
                PREMIERE: "bg-purple-500/10 text-purple-700 dark:text-purple-300 border-purple-500/20",
                REGULAR:
                  "bg-indigo-500/10 text-indigo-700 dark:text-indigo-300 border-indigo-500/20",
              }[studio?.type as "VIP" | "PREMIERE" | "REGULAR"] ||
              "bg-zinc-100 text-zinc-600 border-zinc-200";

            return (
              <div
                key={studio.id}
                className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl p-5 shadow-sm space-y-4 hover:border-zinc-300 dark:hover:border-zinc-700 transition-all flex flex-col justify-between"
              >
                {/* Studio Card Header */}
                <div className="flex items-center justify-between gap-2 pb-3 border-b border-zinc-100 dark:border-zinc-800/80">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-800 flex items-center justify-center text-indigo-600 dark:text-indigo-400 font-bold text-xs">
                      <Armchair className="w-4 h-4" />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-50">{studio.name}</h3>
                      <span className="text-[11px] font-mono text-zinc-400">({studio.code})</span>
                    </div>
                  </div>

                  <span
                    className={`px-2 py-0.5 rounded-md text-[10px] font-bold border uppercase tracking-wider ${typeStyles}`}
                  >
                    {studio.type || "REGULAR"}
                  </span>
                </div>

                {/* Showtimes List for this Studio */}
                <div className="space-y-3 flex-1">
                  {group.schedules.map((sched) => {
                    const start = new Date(sched.startTime).toLocaleTimeString([], {
                      hour: "2-digit",
                      minute: "2-digit",
                      hour12: false,
                    });
                    const end = sched.endTime
                      ? new Date(sched.endTime).toLocaleTimeString([], {
                          hour: "2-digit",
                          minute: "2-digit",
                          hour12: false,
                        })
                      : null;

                    return (
                      <div
                        key={sched.id}
                        className="p-3 rounded-2xl bg-zinc-50/80 dark:bg-zinc-950/50 border border-zinc-150 dark:border-zinc-800/60 flex items-center justify-between gap-3"
                      >
                        <div className="space-y-1 min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-bold text-zinc-900 dark:text-zinc-100 truncate">
                              {sched.movie?.title}
                            </span>
                            {sched.movie?.censorshipRating && (
                              <span
                                className={`px-1.5 py-0.2 rounded text-[9px] font-bold border ${getCensorshipBadgeClass(
                                  sched.movie.censorshipRating
                                )}`}
                              >
                                {sched.movie.censorshipRating}
                              </span>
                            )}
                          </div>

                          <div className="flex items-center gap-2 text-[11px] text-zinc-500 dark:text-zinc-400">
                            {sched.movie?.durationMinutes && (
                              <span>{formatDuration(sched.movie.durationMinutes, locale)}</span>
                            )}
                            {end && (
                              <>
                                <span>•</span>
                                <span>Selesai: {end}</span>
                              </>
                            )}
                          </div>
                        </div>

                        <div className="flex flex-col items-end shrink-0">
                          <span className="text-sm font-black text-indigo-600 dark:text-indigo-400 font-mono">
                            {start}
                          </span>
                          <span className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400">
                            {formatCurrency(sched.ticketPrice)}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
