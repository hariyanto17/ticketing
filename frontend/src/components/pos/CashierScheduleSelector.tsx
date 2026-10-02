"use client";

import React from "react";
import { Clock, Eye, EyeOff } from "lucide-react";
import { Spinner } from "@/components/ui/spinner";
import { Schedule } from "@/services/studioApi";
import { useTranslation } from "@/lib/i18n";

interface CashierScheduleSelectorProps {
  isLoading: boolean;
  todaySchedules: Schedule[];
  tomorrowSchedules: Schedule[];
  showTomorrow: boolean;
  setShowTomorrow: (val: boolean) => void;
  selectedSchedule: Schedule | null;
  onSelectSchedule: (sched: Schedule) => void;
}

export function CashierScheduleSelector({
  isLoading,
  todaySchedules,
  tomorrowSchedules,
  showTomorrow,
  setShowTomorrow,
  selectedSchedule,
  onSelectSchedule,
}: CashierScheduleSelectorProps) {
  const { t, formatDate, formatCurrency } = useTranslation();

  return (
    <div className="p-6 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h2 className="text-lg font-bold text-zinc-900 dark:text-zinc-50 flex items-center gap-2">
          <Clock className="w-5 h-5 text-emerald-600" /> {t("cashier.schedule")}
        </h2>

        {tomorrowSchedules.length > 0 && (
          <button
            type="button"
            onClick={() => setShowTomorrow(!showTomorrow)}
            className="text-xs font-semibold px-3 py-1.5 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300 flex items-center gap-1.5 transition cursor-pointer shadow-sm"
          >
            {showTomorrow ? (
              <>
                <EyeOff className="w-3.5 h-3.5 text-zinc-500" />
                <span>Sembunyikan Jadwal Besok</span>
              </>
            ) : (
              <>
                <Eye className="w-3.5 h-3.5 text-indigo-500" />
                <span>Tampilkan Jadwal Besok ({tomorrowSchedules.length})</span>
              </>
            )}
          </button>
        )}
      </div>

      {isLoading ? (
        <div className="flex justify-center py-6">
          <Spinner className="w-8 h-8" />
        </div>
      ) : todaySchedules.length === 0 && tomorrowSchedules.length === 0 ? (
        <p className="text-zinc-400 text-sm italic">{t("cashier.noSchedules")}</p>
      ) : (
        <div className="space-y-5">
          {/* Today's Section */}
          <div className="space-y-2.5">
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-md text-[11px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                Hari Ini
              </span>
              <span className="text-xs text-zinc-500 dark:text-zinc-400 font-medium">
                {new Date().toLocaleDateString("id-ID", { weekday: "long" })}, {formatDate(new Date())}
              </span>
            </div>

            {todaySchedules.length === 0 ? (
              <p className="text-xs text-zinc-400 italic pl-1">Tidak ada jadwal tayang untuk hari ini.</p>
            ) : (
              <div className="flex flex-wrap gap-2.5">
                {todaySchedules.map((sched) => {
                  const start = new Date(sched.startTime).toLocaleTimeString([], {
                    hour: "2-digit",
                    minute: "2-digit",
                    hour12: false,
                  });
                  const studioName = sched.studio?.name || "Studio";
                  const isSelected = selectedSchedule?.id === sched.id;

                  return (
                    <button
                      key={sched.id}
                      type="button"
                      onClick={() => onSelectSchedule(sched)}
                      className={`px-4 py-3 rounded-2xl border text-sm font-semibold transition-all cursor-pointer flex items-center gap-2.5 ${
                        isSelected
                          ? "border-emerald-600 bg-emerald-50/40 dark:bg-emerald-950/30 text-emerald-600 dark:text-emerald-400 ring-2 ring-emerald-500/20 shadow-sm"
                          : "border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 hover:border-zinc-300 dark:hover:border-zinc-700 text-zinc-800 dark:text-zinc-200"
                      }`}
                    >
                      <Clock className="w-4 h-4 text-emerald-500 shrink-0" />
                      <span className="font-bold">{start}</span>
                      <span className="text-xs px-2 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 font-medium">
                        {studioName}
                      </span>
                      <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                        {formatCurrency(sched.ticketPrice)}
                      </span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Tomorrow's Section */}
          {showTomorrow && tomorrowSchedules.length > 0 && (
            <div className="pt-4 border-t border-zinc-150 dark:border-zinc-800/80 space-y-2.5 animate-in fade-in slide-in-from-top-1 duration-200">
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-0.5 rounded-md text-[11px] font-bold bg-indigo-100 text-indigo-800 dark:bg-indigo-950/60 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
                  Besok
                </span>
                <span className="text-xs text-zinc-500 dark:text-zinc-400 font-medium">
                  {(() => {
                    const tmr = new Date();
                    tmr.setDate(tmr.getDate() + 1);
                    return `${tmr.toLocaleDateString("id-ID", { weekday: "long" })}, ${formatDate(tmr)}`;
                  })()}
                </span>
              </div>

              <div className="flex flex-wrap gap-2.5">
                {tomorrowSchedules.map((sched) => {
                  const start = new Date(sched.startTime).toLocaleTimeString([], {
                    hour: "2-digit",
                    minute: "2-digit",
                    hour12: false,
                  });
                  const studioName = sched.studio?.name || "Studio";
                  const isSelected = selectedSchedule?.id === sched.id;

                  return (
                    <button
                      key={sched.id}
                      type="button"
                      onClick={() => onSelectSchedule(sched)}
                      className={`px-4 py-3 rounded-2xl border text-sm font-semibold transition-all cursor-pointer flex items-center gap-2.5 ${
                        isSelected
                          ? "border-indigo-600 bg-indigo-50/40 dark:bg-indigo-950/30 text-indigo-600 dark:text-indigo-400 ring-2 ring-indigo-500/20 shadow-sm"
                          : "border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 hover:border-zinc-300 dark:hover:border-zinc-700 text-zinc-800 dark:text-zinc-200"
                      }`}
                    >
                      <Clock className="w-4 h-4 text-indigo-500 shrink-0" />
                      <span className="font-bold">{start}</span>
                      <span className="text-xs px-2 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 font-medium">
                        {studioName}
                      </span>
                      <span className="text-xs font-semibold text-indigo-600 dark:text-indigo-400">
                        {formatCurrency(sched.ticketPrice)}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
