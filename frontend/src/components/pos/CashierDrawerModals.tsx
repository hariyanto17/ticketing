"use client";

import React from "react";
import { Modal } from "@/components/ui/modal";
import { Spinner } from "@/components/ui/spinner";
import { CurrencyInput } from "@/components/ui/CurrencyInput";
import { CashDrawer } from "@/lib/api/opsApi";
import { DrawerClosingSummary } from "./DrawerClosingSummary";

interface CashierDrawerModalsProps {
  isOpenDrawerModalOpen: boolean;
  setIsOpenDrawerModalOpen: (open: boolean) => void;
  isCloseDrawerModalOpen: boolean;
  setIsCloseDrawerModalOpen: (open: boolean) => void;
  drawerOpeningBalance: number;
  setDrawerOpeningBalance: (val: number) => void;
  drawerActualBalance: number;
  setDrawerActualBalance: (val: number) => void;
  drawerNotes?: string;
  setDrawerNotes?: (val: string) => void;
  isOpeningDrawer: boolean;
  isClosingDrawer: boolean;
  onOpenDrawerSubmit: (e: React.FormEvent) => void;
  onCloseDrawerSubmit: (e: React.FormEvent) => void;
  drawerSummary?: CashDrawer | null;
  onCloseSummary?: () => void;
}

export function CashierDrawerModals({
  isOpenDrawerModalOpen,
  setIsOpenDrawerModalOpen,
  isCloseDrawerModalOpen,
  setIsCloseDrawerModalOpen,
  drawerOpeningBalance,
  setDrawerOpeningBalance,
  drawerActualBalance,
  setDrawerActualBalance,
  drawerNotes = "",
  setDrawerNotes,
  isOpeningDrawer,
  isClosingDrawer,
  onOpenDrawerSubmit,
  onCloseDrawerSubmit,
  drawerSummary,
  onCloseSummary,
}: CashierDrawerModalsProps) {
  const handleCloseModalClose = () => {
    setIsCloseDrawerModalOpen(false);
    if (onCloseSummary) {
      onCloseSummary();
    }
  };

  return (
    <>
      {/* Open Cash Drawer Modal */}
      <Modal
        isOpen={isOpenDrawerModalOpen}
        onClose={() => setIsOpenDrawerModalOpen(false)}
        title="Buka Sesi Laci Kas (Open Cash Drawer)"
      >
        <form onSubmit={onOpenDrawerSubmit} className="space-y-6 py-4">
          <div className="p-4 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900 rounded-2xl">
            <p className="text-xs text-emerald-800 dark:text-emerald-300 font-semibold leading-relaxed">
              Silakan masukkan nominal modal awal uang tunai yang ada di dalam laci kas sebelum memulai transaksi kasir tiket.
            </p>
          </div>

          <CurrencyInput
            label="Saldo Awal Kas Tunai (IDR)"
            value={drawerOpeningBalance}
            onChange={(val) => setDrawerOpeningBalance(val)}
            placeholder="500.000"
            min={0}
            required
          />

          <div className="flex gap-3 justify-end pt-2">
            <button
              type="button"
              onClick={() => setIsOpenDrawerModalOpen(false)}
              className="px-4 py-2.5 border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-900 text-zinc-700 dark:text-zinc-300 rounded-xl text-xs font-semibold cursor-pointer"
            >
              Nanti Saja
            </button>
            <button
              type="submit"
              disabled={isOpeningDrawer}
              className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:bg-zinc-350 text-white font-bold rounded-xl text-xs cursor-pointer flex items-center gap-2 shadow-sm"
            >
              {isOpeningDrawer ? <Spinner className="w-4 h-4" /> : "Buka Laci Kas & Mulai Transaksi"}
            </button>
          </div>
        </form>
      </Modal>

      {/* Close Cash Drawer Modal */}
      <Modal
        isOpen={isCloseDrawerModalOpen}
        onClose={handleCloseModalClose}
        title={drawerSummary ? "Ringkasan Rekonsiliasi Tutup Laci Kas" : "Tutup Sesi Laci Kas (End Shift)"}
      >
        {!drawerSummary ? (
          <form onSubmit={onCloseDrawerSubmit} className="space-y-5 py-4">
            <div className="p-4 bg-zinc-50 dark:bg-zinc-900/60 border border-zinc-200 dark:border-zinc-800 rounded-2xl">
              <p className="text-xs text-zinc-600 dark:text-zinc-300 font-medium leading-relaxed">
                Hitung jumlah fisik uang tunai yang ada di laci kas saat ini. Sistem akan membandingkan uang tunai fisik terhadap modal awal dan seluruh penjualan tiket.
              </p>
            </div>

            <CurrencyInput
              label="Fisik Kas Aktual di Laci Kas (IDR)"
              value={drawerActualBalance}
              onChange={(val) => setDrawerActualBalance(val)}
              placeholder="1.500.000"
              min={0}
              required
            />

            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-zinc-700 dark:text-zinc-300">
                Catatan Kasir / Alasan Selisih <span className="text-zinc-400 font-normal">(Wajib diisi jika ada selisih)</span>
              </label>
              <textarea
                value={drawerNotes}
                onChange={(e) => setDrawerNotes && setDrawerNotes(e.target.value)}
                placeholder="Contoh: Kembalian pelanggan tertinggal Rp 2.000, atau Kas klop pas 100%..."
                rows={2}
                className="w-full px-3.5 py-2.5 text-xs bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-xl text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all resize-none"
              />
            </div>

            <p className="text-[11px] text-zinc-400 dark:text-zinc-500 leading-relaxed">
              Setelah dikonfirmasi, sesi kasir ini akan ditutup dan sistem akan menampilkan rincian penjualan (Tunai, QRIS) serta status selisih kas.
            </p>

            <div className="flex gap-3 justify-end pt-2">
              <button
                type="button"
                onClick={handleCloseModalClose}
                className="px-4 py-2.5 border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-900 text-zinc-700 dark:text-zinc-300 rounded-xl text-xs font-semibold cursor-pointer"
              >
                Batal
              </button>
              <button
                type="submit"
                disabled={isClosingDrawer}
                className="px-4 py-2.5 bg-rose-600 hover:bg-rose-700 disabled:bg-zinc-350 text-white font-bold rounded-xl text-xs cursor-pointer flex items-center gap-2 shadow-sm"
              >
                {isClosingDrawer ? <Spinner className="w-4 h-4" /> : "Tutup Laci & Rekonsiliasi"}
              </button>
            </div>
          </form>
        ) : (
          <DrawerClosingSummary
            summary={drawerSummary}
            onFinish={handleCloseModalClose}
          />
        )}
      </Modal>
    </>
  );
}

