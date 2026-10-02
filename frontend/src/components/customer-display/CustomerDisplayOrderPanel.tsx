import React from "react";
import { Ticket, Clock, CheckCircle2 } from "lucide-react";

interface CustomerDisplayOrderPanelProps {
  movie: {
    title: string;
    censorshipRating?: string | null;
  };
  schedule: {
    studioName: string;
    startTime: string;
    businessDate?: string;
  };
  selectedSeats: Array<{
    id: string;
    seat: { seatLabel: string };
  }>;
  quantity: number;
  ticketPrice: number;
  totalAmount: number;
  formatDate: (dateStr: string) => string;
  formatCurrency: (amount: number) => string;
  t: (key: string) => string;
}

export const CustomerDisplayOrderPanel: React.FC<CustomerDisplayOrderPanelProps> = ({
  movie,
  schedule,
  selectedSeats,
  quantity,
  ticketPrice,
  totalAmount,
  formatDate,
  formatCurrency,
  t,
}) => {
  return (
    <div className="w-full lg:w-80 xl:w-96 2xl:w-[420px] shrink-0 h-auto lg:h-full bg-white dark:bg-zinc-900/80 border border-zinc-200 dark:border-zinc-800 rounded-2xl sm:rounded-3xl p-4 sm:p-5 xl:p-6 flex flex-col justify-between shadow-lg dark:shadow-2xl overflow-hidden transition-colors duration-200">
      {/* Title: Ringkasan Pesanan */}
      <div className="shrink-0 border-b border-zinc-200 dark:border-zinc-800 pb-2.5 sm:pb-3">
        <h3 className="text-base sm:text-lg xl:text-xl font-black text-zinc-900 dark:text-white flex items-center gap-2">
          <Ticket className="w-4 h-4 sm:w-5 sm:h-5 text-indigo-600 dark:text-indigo-500" />
          {t("customerDisplay.orderSummary")}
        </h3>
      </div>

      {/* MOVIE, STUDIO, SHOWTIME SPECS */}
      <div className="shrink-0 flex flex-col gap-2 sm:gap-2.5 bg-zinc-50 dark:bg-zinc-950/80 p-3 sm:p-3.5 rounded-2xl border border-zinc-200 dark:border-zinc-800/90 shadow-sm dark:shadow-inner my-2 sm:my-2.5 transition-colors duration-200">
        {/* 1. FILM / MOVIE */}
        <div className="space-y-0.5">
          <span className="text-[9px] sm:text-[10px] font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider block">
            {t("customerDisplay.movie")}
          </span>
          <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
            <p className="text-sm sm:text-base xl:text-lg font-bold text-zinc-950 dark:text-white leading-tight">
              {movie.title}
            </p>
            {movie.censorshipRating && (
              <span className="text-[9px] sm:text-[10px] px-1.5 py-0.5 rounded font-bold bg-zinc-200 dark:bg-zinc-800 text-zinc-800 dark:text-zinc-300 border border-zinc-300 dark:border-zinc-700">
                {movie.censorshipRating}
              </span>
            )}
          </div>
        </div>

        <div className="h-[1px] bg-zinc-200 dark:bg-zinc-800/80 w-full" />

        {/* 2. STUDIO */}
        <div className="space-y-0.5">
          <span className="text-[9px] sm:text-[10px] font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider block">
            {t("customerDisplay.studio")}
          </span>
          <p className="text-xs sm:text-sm xl:text-base font-bold text-emerald-600 dark:text-emerald-400 leading-tight">
            {schedule.studioName}
          </p>
        </div>

        <div className="h-[1px] bg-zinc-200 dark:bg-zinc-800/80 w-full" />

        {/* 3. JAM TAYANG / SHOWTIME */}
        <div className="space-y-0.5">
          <span className="text-[9px] sm:text-[10px] font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider block">
            {t("customerDisplay.showtime")} & {t("customerDisplay.date")}
          </span>
          <p className="text-xs sm:text-sm xl:text-base font-bold text-indigo-600 dark:text-indigo-400 flex items-center gap-1.5 leading-tight">
            <Clock className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-indigo-600 dark:text-indigo-400 shrink-0" />
            <span>
              {new Date(schedule.startTime).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", hour12: false })}
            </span>
            <span className="text-[11px] sm:text-xs font-medium text-zinc-500 dark:text-zinc-400">
              • {formatDate(schedule.businessDate || schedule.startTime)}
            </span>
          </p>
        </div>
      </div>

      {/* Selected Seats Badges */}
      <div className="flex-1 min-h-[80px] lg:min-h-0 flex flex-col space-y-1.5 my-1.5 sm:my-2 overflow-hidden">
        <div className="flex justify-between items-center text-xs font-bold text-zinc-500 dark:text-zinc-400 shrink-0">
          <span>
            {t("customerDisplay.selectedSeats")} ({quantity})
          </span>
        </div>

        {quantity > 0 ? (
          <div className="flex-1 min-h-0 max-h-32 lg:max-h-none overflow-y-auto flex flex-wrap content-start gap-1.5 p-2 sm:p-2.5 bg-zinc-50 dark:bg-zinc-950/60 rounded-2xl border border-zinc-200 dark:border-zinc-800/80">
            {selectedSeats.map((s) => (
              <span
                key={s.id}
                className="px-2 sm:px-2.5 py-0.5 sm:py-1 bg-indigo-50 dark:bg-indigo-600/30 border border-indigo-200 dark:border-indigo-500/50 rounded-lg text-xs font-extrabold text-indigo-700 dark:text-indigo-200 flex items-center gap-1 shadow-sm"
              >
                <CheckCircle2 className="w-3 h-3 text-indigo-600 dark:text-indigo-400" />
                {s.seat.seatLabel}
              </span>
            ))}
          </div>
        ) : (
          <div className="flex-1 flex items-center justify-center p-3 bg-zinc-50 dark:bg-zinc-950/40 rounded-2xl border border-dashed border-zinc-200 dark:border-zinc-800">
            <p className="text-xs text-zinc-400 dark:text-zinc-500 italic">
              {t("customerDisplay.noSeatsSelected")}
            </p>
          </div>
        )}
      </div>

      {/* Price Calculation & Grand Total */}
      <div className="shrink-0 border-t border-b border-zinc-200 dark:border-zinc-800 py-2.5 sm:py-3 space-y-1.5 sm:space-y-2">
        <div className="flex justify-between text-xs text-zinc-500 dark:text-zinc-400">
          <span>{t("customerDisplay.ticketPrice")}</span>
          <span className="font-medium text-zinc-800 dark:text-zinc-200">{formatCurrency(ticketPrice)}</span>
        </div>
        <div className="flex justify-between text-xs text-zinc-500 dark:text-zinc-400">
          <span>{t("customerDisplay.tickets")}</span>
          <span className="font-semibold text-zinc-800 dark:text-zinc-200">x{quantity}</span>
        </div>
        <div className="flex justify-between items-baseline pt-1.5 border-t border-zinc-200 dark:border-zinc-800/60">
          <span className="text-xs sm:text-sm font-bold text-zinc-700 dark:text-zinc-300">{t("customerDisplay.totalAmount")}</span>
          <span className="text-xl sm:text-2xl xl:text-3xl font-black text-emerald-600 dark:text-emerald-400 tracking-tight">
            {formatCurrency(totalAmount)}
          </span>
        </div>
      </div>

      {/* Live Connected Status */}
      <div className="shrink-0 flex items-center justify-center gap-2 text-[10px] sm:text-[11px] font-semibold text-zinc-500 dark:text-zinc-400 pt-2">
        <span className="w-2 h-2 rounded-full bg-emerald-500 dark:bg-emerald-400 animate-pulse" />
        <span>{t("customerDisplay.liveConnected")}</span>
      </div>
    </div>
  );
};
