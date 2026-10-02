"use client";

import React from "react";
import { Monitor, Cast } from "lucide-react";
import { useTranslation } from "@/lib/i18n";

interface CashierTopBarProps {
  isCustomerDisplayConnected: boolean;
  onOpenCustomerDisplay: () => void;
}

export function CashierTopBar({
  isCustomerDisplayConnected,
  onOpenCustomerDisplay,
}: CashierTopBarProps) {
  const { t } = useTranslation();

  return (
    <div className="xl:col-span-12 flex items-center justify-between flex-wrap gap-4 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-4 rounded-3xl shadow-sm">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-2xl bg-indigo-50 dark:bg-indigo-950/50 border border-indigo-200 dark:border-indigo-800 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
          <Monitor className="w-5 h-5" />
        </div>
        <div>
          <h2 className="text-sm font-bold text-zinc-900 dark:text-zinc-50">
            {t("cashier.seatLayout")} & Customer Screen
          </h2>
          <p className="text-xs text-zinc-400">
            Sinkronisasi layar pelanggan realtime pada monitor kedua.
          </p>
        </div>
      </div>

      <div className="flex items-center gap-3">
        {isCustomerDisplayConnected && (
          <div className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 text-xs font-bold">
            <span className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
            </span>
            <span>{t("cashier.customerDisplayActive")}</span>
          </div>
        )}

        <button
          type="button"
          onClick={onOpenCustomerDisplay}
          className="px-4 py-2.5 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition-all cursor-pointer shadow-md shadow-indigo-500/20 flex items-center gap-2"
        >
          <Cast className="w-4 h-4" />
          <span>{t("cashier.displayOnSecondMonitor")}</span>
        </button>
      </div>
    </div>
  );
}
