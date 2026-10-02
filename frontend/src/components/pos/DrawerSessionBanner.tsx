"use client";

import React from "react";
import { useTranslation } from "@/lib/i18n";

interface DrawerSessionBannerProps {
  drawerLoading: boolean;
  activeDrawer: any;
  onOpenDrawerClick: () => void;
  onCloseDrawerClick: () => void;
}

export function DrawerSessionBanner({
  drawerLoading,
  activeDrawer,
  onOpenDrawerClick,
  onCloseDrawerClick,
}: DrawerSessionBannerProps) {
  const { formatCurrency } = useTranslation();

  if (drawerLoading) return null;

  return (
    <div className="xl:col-span-12">
      {activeDrawer ? (
        <div className="p-4 rounded-3xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 flex items-center justify-between flex-wrap gap-4 shadow-sm">
          <div className="flex items-center gap-3.5">
            <span className="flex h-3.5 w-3.5 relative">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-emerald-500"></span>
            </span>
            <div>
              <h3 className="text-sm font-bold text-emerald-900 dark:text-emerald-200 flex items-center gap-2">
                Sesi Laci Kas Aktif (Cash Drawer Open)
              </h3>
              <p className="text-xs text-emerald-700 dark:text-emerald-400">
                Modal Awal: <span className="font-bold">{formatCurrency(activeDrawer.openingBalance)}</span> • Dibuka:{" "}
                {new Date(activeDrawer.openedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", hour12: false })}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onCloseDrawerClick}
            className="px-4 py-2 rounded-xl border border-rose-200 dark:border-rose-800 bg-white dark:bg-zinc-900 text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/50 text-xs font-bold transition-all cursor-pointer shadow-sm"
          >
            Tutup Sesi Laci Kas
          </button>
        </div>
      ) : (
        <div className="p-4 rounded-3xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900 flex items-center justify-between flex-wrap gap-4 shadow-sm">
          <div className="flex items-center gap-3.5">
            <span className="flex h-3.5 w-3.5 rounded-full bg-amber-500"></span>
            <div>
              <h3 className="text-sm font-bold text-amber-900 dark:text-amber-200">
                Sesi Laci Kas Belum Dibuka
              </h3>
              <p className="text-xs text-amber-700 dark:text-amber-400">
                Kasir wajib membuka sesi laci kas dengan modal awal sebelum dapat memproses transaksi tiket.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onOpenDrawerClick}
            className="px-4 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold transition-all cursor-pointer shadow-sm flex items-center gap-1.5"
          >
            Buka Laci Kas Sekarang
          </button>
        </div>
      )}
    </div>
  );
}
