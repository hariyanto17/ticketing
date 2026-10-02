"use client";

import React from "react";
import { Plus, Armchair, Film, Bell, AlertTriangle, Clock, Edit, Trash } from "lucide-react";
import { Schedule, Studio } from "@/services/studioApi";
import { getDingdongConflict } from "@/lib/scheduleHelpers";
import { formatDuration } from "@/lib/formatDuration";
import { useTranslation } from "@/lib/i18n";

export interface StudioScheduleGroup {
  studio: Studio;
  schedules: Schedule[];
}

interface ScheduleStudioCardsProps {
  isLoading: boolean;
  groupedStudioSchedules: StudioScheduleGroup[];
  onOpenAdd: (studioId?: string) => void;
  onOpenEdit: (schedule: Schedule) => void;
  onOpenDelete: (schedule: Schedule) => void;
}

export function ScheduleStudioCards({
  isLoading,
  groupedStudioSchedules,
  onOpenAdd,
  onOpenEdit,
  onOpenDelete,
}: ScheduleStudioCardsProps) {
  const { t, locale, formatDate, formatCurrency } = useTranslation();

  if (isLoading) {
    return (
      <div className="p-12 text-center text-zinc-500 dark:text-zinc-400 bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800 rounded-2xl">
        <div className="animate-spin w-6 h-6 border-2 border-zinc-600 dark:border-zinc-300 border-t-transparent rounded-full mx-auto mb-3" />
        <p className="text-sm">Memuat jadwal tayang studio...</p>
      </div>
    );
  }

  if (groupedStudioSchedules.length === 0) {
    return (
      <div className="p-12 text-center text-zinc-500 dark:text-zinc-400 bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800 rounded-2xl">
        <Armchair className="w-10 h-10 text-zinc-300 dark:text-zinc-700 mx-auto mb-3" />
        <p className="text-sm font-medium">{t("schedules.noSchedulesInStudio")}</p>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {groupedStudioSchedules.map((group) => {
        const typeStyles =
          {
            VIP: "bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/20",
            PREMIERE: "bg-purple-500/10 text-purple-700 dark:text-purple-300 border-purple-500/20",
            REGULAR: "bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 border-zinc-200 dark:border-zinc-700",
          }[group.studio?.type as "VIP" | "PREMIERE" | "REGULAR"] ||
          "bg-zinc-100 text-zinc-600 border-zinc-200";

        return (
          <div
            key={group.studio.id}
            className="bg-white dark:bg-zinc-900/90 border border-zinc-200/80 dark:border-zinc-800/80 rounded-2xl overflow-hidden shadow-2xs transition-all hover:border-zinc-300/80 dark:hover:border-zinc-700/80"
          >
            {/* Studio Section Header */}
            <div className="px-5 py-3.5 bg-zinc-50/50 dark:bg-zinc-800/30 border-b border-zinc-150/70 dark:border-zinc-800/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex flex-wrap items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-zinc-200/70 dark:bg-zinc-800 flex items-center justify-center text-zinc-700 dark:text-zinc-300 shrink-0">
                  <Armchair className="w-4 h-4" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-sm font-bold text-zinc-900 dark:text-zinc-100">{group.studio.name}</h2>
                    <span className="text-xs font-mono text-zinc-400 dark:text-zinc-500">
                      ({group.studio.code})
                    </span>
                  </div>
                </div>

                <span
                  className={`px-2 py-0.5 rounded-md text-[10px] font-semibold border uppercase tracking-wider ${typeStyles}`}
                >
                  {group.studio.type || "REGULAR"}
                </span>

                <span className="text-xs text-zinc-500 dark:text-zinc-400 flex items-center gap-1.5 font-medium ml-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-zinc-300 dark:bg-zinc-600" />
                  {group.schedules.length} Jadwal
                </span>
              </div>

              <button
                type="button"
                onClick={() => onOpenAdd(group.studio.id)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-zinc-700 dark:text-zinc-300 bg-white dark:bg-zinc-800 border border-zinc-200/90 dark:border-zinc-700/80 hover:bg-zinc-50 dark:hover:bg-zinc-750 hover:text-zinc-900 dark:hover:text-zinc-100 shadow-2xs transition-all cursor-pointer self-start sm:self-auto"
              >
                <Plus className="w-3.5 h-3.5 text-zinc-500 dark:text-zinc-400" />
                <span>{t("schedules.create")}</span>
              </button>
            </div>

            {/* Studio Schedules Table */}
            {group.schedules.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-zinc-150/80 dark:border-zinc-800/80 text-zinc-400 dark:text-zinc-500 font-semibold uppercase tracking-wider text-[11px]">
                      <th className="py-2.5 px-5">{t("schedules.movie")}</th>
                      <th className="py-2.5 px-5">{t("schedules.dingdongTime")}</th>
                      <th className="py-2.5 px-5">{t("schedules.showTime")}</th>
                      <th className="py-2.5 px-5">{t("schedules.price")}</th>
                      <th className="py-2.5 px-5">{t("schedules.status")}</th>
                      <th className="py-2.5 px-5 text-right">{t("schedules.actions")}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-150/60 dark:divide-zinc-800/60">
                    {group.schedules.map((s) => {
                      const startDate = new Date(s.startTime);
                      const dingdongDate = new Date(startDate.getTime() - 15 * 60 * 1000);
                      const dingdong = !isNaN(dingdongDate.getTime())
                        ? dingdongDate.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", hour12: false })
                        : "-";
                      const start = !isNaN(startDate.getTime())
                        ? startDate.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", hour12: false })
                        : "-";
                      const end = s.endTime
                        ? new Date(s.endTime).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", hour12: false })
                        : "-";
                      const date = formatDate(s.businessDate || s.startTime);
                      const dingdongConflict = getDingdongConflict(s, group.schedules);

                      return (
                        <tr
                          key={s.id}
                          className={`transition-colors ${
                            dingdongConflict
                              ? "bg-rose-500/5 hover:bg-rose-500/10"
                              : "hover:bg-zinc-50/50 dark:hover:bg-zinc-800/30"
                          }`}
                        >
                          {/* Movie */}
                          <td className="py-3 px-5">
                            <div className="flex items-center gap-3">
                              {s?.movie?.poster ? (
                                <img
                                  src={s.movie.poster}
                                  alt={s.movie?.title || "Movie"}
                                  className="w-8 h-11 object-cover rounded-md border border-zinc-200/60 dark:border-zinc-800 shadow-2xs shrink-0"
                                />
                              ) : (
                                <div className="w-8 h-11 rounded-md bg-zinc-100 dark:bg-zinc-800 border border-zinc-200/60 dark:border-zinc-800 flex items-center justify-center text-zinc-400 shrink-0">
                                  <Film className="w-4 h-4" />
                                </div>
                              )}
                              <div>
                                <span className="font-semibold text-zinc-900 dark:text-zinc-100 text-xs block">
                                  {s?.movie?.title || "-"}
                                </span>
                                {s?.movie?.durationMinutes ? (
                                  <span className="text-[11px] text-zinc-400 dark:text-zinc-500">
                                    {formatDuration(s.movie.durationMinutes, locale)}
                                  </span>
                                ) : null}
                              </div>
                            </div>
                          </td>

                          {/* Dingdong */}
                          <td className="py-3 px-5">
                            {dingdongConflict ? (
                              <div className="flex flex-col">
                                <span className="text-xs font-mono font-bold text-rose-600 dark:text-rose-400 flex items-center gap-1.5">
                                  <Bell className="w-3.5 h-3.5 text-rose-500 shrink-0" />
                                  <span>{dingdong}</span>
                                  <span className="px-1.5 py-0.2 rounded text-[10px] font-sans font-bold bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20">
                                    -15 mnt
                                  </span>
                                </span>
                                <span
                                  className="text-[10px] text-rose-500 dark:text-rose-400 font-medium mt-0.5 flex items-center gap-1"
                                  title={`Jam dindong (${dingdong}) bertabrakan dengan "${dingdongConflict.prevMovie}" yang baru selesai pukul ${dingdongConflict.prevEndTimeStr}`}
                                >
                                  <AlertTriangle className="w-3 h-3 shrink-0" />
                                  Selesai sblmnya: {dingdongConflict.prevEndTimeStr}
                                </span>
                              </div>
                            ) : (
                              <div className="flex flex-col">
                                <span className="text-xs font-mono font-semibold text-amber-600 dark:text-amber-400 flex items-center gap-1.5">
                                  <Bell className="w-3.5 h-3.5 text-amber-500 shrink-0" /> {dingdong}
                                </span>
                                <span className="text-[11px] text-zinc-400 dark:text-zinc-500 mt-0.5">-15 mnt</span>
                              </div>
                            )}
                          </td>

                          {/* Showtime */}
                          <td className="py-3 px-5">
                            <div className="flex flex-col">
                              <span className="text-zinc-800 dark:text-zinc-200 font-medium text-xs">{date}</span>
                              <span className="text-xs font-mono font-medium text-zinc-600 dark:text-zinc-400 flex items-center gap-1.5 mt-0.5">
                                <Clock className="w-3.5 h-3.5 text-zinc-400 dark:text-zinc-500" /> {start} - {end}
                              </span>
                            </div>
                          </td>

                          {/* Price */}
                          <td className="py-3 px-5 font-mono font-semibold text-zinc-900 dark:text-zinc-100 text-xs">
                            {formatCurrency(s.ticketPrice)}
                          </td>

                          {/* Status */}
                          <td className="py-3 px-5">
                            {s.status === "PUBLISHED" ? (
                              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                                {s.status}
                              </span>
                            ) : s.status === "CLOSED" ? (
                              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-rose-500/10 text-rose-700 dark:text-rose-400 border border-rose-500/20">
                                <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
                                {s.status}
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-zinc-500/10 text-zinc-700 dark:text-zinc-300 border border-zinc-500/20">
                                <span className="w-1.5 h-1.5 rounded-full bg-zinc-400" />
                                {s.status}
                              </span>
                            )}
                          </td>

                          {/* Actions */}
                          <td className="py-3 px-5 text-right">
                            <div className="flex items-center justify-end gap-1">
                              <button
                                onClick={() => onOpenEdit(s)}
                                className="p-1.5 text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg transition-colors cursor-pointer"
                                title={t("schedules.edit")}
                              >
                                <Edit className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => onOpenDelete(s)}
                                className="p-1.5 text-zinc-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 rounded-lg transition-colors cursor-pointer"
                                title={t("schedules.deleteTitle")}
                              >
                                <Trash className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="py-8 px-5 text-center text-zinc-400 dark:text-zinc-500 text-xs flex flex-col items-center justify-center gap-2">
                <p>{t("schedules.noSchedulesInStudio")}</p>
                <button
                  type="button"
                  onClick={() => onOpenAdd(group.studio.id)}
                  className="text-xs font-semibold text-zinc-700 dark:text-zinc-300 hover:text-zinc-900 dark:hover:text-zinc-100 underline underline-offset-2 cursor-pointer"
                >
                  + {t("schedules.addScheduleForStudio")}
                </button>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
