"use client";

import React from "react";
import { Modal } from "@/components/ui/modal";
import { Spinner } from "@/components/ui/spinner";
import { CurrencyInput } from "@/components/ui/CurrencyInput";

interface CashierDrawerModalsProps {
  isOpenDrawerModalOpen: boolean;
  setIsOpenDrawerModalOpen: (open: boolean) => void;
  isCloseDrawerModalOpen: boolean;
  setIsCloseDrawerModalOpen: (open: boolean) => void;
  drawerOpeningBalance: number;
  setDrawerOpeningBalance: (val: number) => void;
  drawerActualBalance: number;
  setDrawerActualBalance: (val: number) => void;
  isOpeningDrawer: boolean;
  isClosingDrawer: boolean;
  onOpenDrawerSubmit: (e: React.FormEvent) => void;
  onCloseDrawerSubmit: (e: React.FormEvent) => void;
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
  isOpeningDrawer,
  isClosingDrawer,
  onOpenDrawerSubmit,
  onCloseDrawerSubmit,
}: CashierDrawerModalsProps) {
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
        onClose={() => setIsCloseDrawerModalOpen(false)}
        title="Close Cash Drawer Session"
      >
        <form onSubmit={onCloseDrawerSubmit} className="space-y-6 py-4">
          <CurrencyInput
            label="Enter Actual Cash Balance in Drawer (IDR)"
            value={drawerActualBalance}
            onChange={(val) => setDrawerActualBalance(val)}
            placeholder="1.500.000"
            min={0}
            required
          />

          <p className="text-xs text-zinc-400 leading-relaxed">
            Upon submitting, the system will calculate the expected sales balance against your cash count and record the overage/shortage variance.
          </p>

          <div className="flex gap-3 justify-end">
            <button
              type="button"
              onClick={() => setIsCloseDrawerModalOpen(false)}
              className="px-4 py-2.5 border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-900 text-zinc-700 dark:text-zinc-300 rounded-xl text-xs font-semibold cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isClosingDrawer}
              className="px-4 py-2.5 bg-rose-600 hover:bg-rose-700 disabled:bg-zinc-350 text-white font-bold rounded-xl text-xs cursor-pointer flex items-center gap-2"
            >
              {isClosingDrawer ? <Spinner className="w-4 h-4" /> : "Close Drawer & Submit"}
            </button>
          </div>
        </form>
      </Modal>
    </>
  );
}
