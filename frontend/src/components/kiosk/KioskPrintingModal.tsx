"use client";

import React from "react";
import { Printer } from "lucide-react";
import { KioskOrderResult } from "../../lib/api/orderApi";

interface KioskPrintingModalProps {
  isPrinting: boolean;
  activeOrder: KioskOrderResult | null;
  countdown: number;
  onResetToStandby: () => void;
  formatCurrency: (amount: number) => string;
}

export function KioskPrintingModal({
  isPrinting,
  activeOrder,
  countdown,
  onResetToStandby,
  formatCurrency,
}: KioskPrintingModalProps) {
  if (!isPrinting || !activeOrder) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-xl flex flex-col items-center justify-center p-6 animate-fade-in">
      <div className="max-w-md w-full bg-zinc-900 border border-zinc-800 rounded-3xl p-8 text-center shadow-2xl relative overflow-hidden">
        {/* Pulsing Top Glow */}
        <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-emerald-500 via-rose-500 to-emerald-500 animate-pulse" />

        <div className="w-20 h-20 mx-auto rounded-full bg-emerald-500/10 border-2 border-emerald-500/40 flex items-center justify-center text-emerald-400 mb-5 shadow-[0_0_30px_rgba(16,185,129,0.3)]">
          <Printer className="w-10 h-10 animate-bounce" />
        </div>

        <h3 className="text-2xl font-black text-white mb-1">Tiket Sedang Dicetak!</h3>
        <p className="text-zinc-400 text-xs mb-6">
          Silakan ambil tiket fisik Anda pada slot printer di bawah layar.
        </p>

        {/* Ticket Summary Card */}
        <div className="bg-zinc-950/80 border border-zinc-800 rounded-2xl p-4 text-left mb-6 space-y-2">
          <div className="flex justify-between items-center text-xs">
            <span className="text-zinc-400">Film:</span>
            <span className="font-bold text-white uppercase">{activeOrder.movie.title}</span>
          </div>
          <div className="flex justify-between items-center text-xs">
            <span className="text-zinc-400">Studio:</span>
            <span className="font-semibold text-rose-400">
              {activeOrder.studio.name} ({activeOrder.studio.type})
            </span>
          </div>
          <div className="flex justify-between items-center text-xs">
            <span className="text-zinc-400">Kursi:</span>
            <span className="font-bold text-emerald-400">
              {activeOrder.tickets.map((t) => t.seatLabel).join(", ")} ({activeOrder.tickets.length} Tiket)
            </span>
          </div>
          <div className="flex justify-between items-center text-xs">
            <span className="text-zinc-400">Total:</span>
            <span className="font-bold text-white">{formatCurrency(activeOrder.totalAmount)}</span>
          </div>
        </div>

        <div className="flex items-center justify-between text-xs text-zinc-500 pt-2 border-t border-zinc-800">
          <span>Kembali ke layar utama dalam</span>
          <span className="font-mono text-rose-400 font-bold text-sm">{countdown}s</span>
        </div>

        <button
          type="button"
          onClick={onResetToStandby}
          className="mt-4 w-full py-3 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-bold transition cursor-pointer"
        >
          Selesai Sekarang
        </button>
      </div>
    </div>
  );
}
