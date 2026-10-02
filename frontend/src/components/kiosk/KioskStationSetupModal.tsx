"use client";

import React from "react";
import { Radio } from "lucide-react";

interface KioskStationSetupModalProps {
  isOpen: boolean;
  onClose: () => void;
  kioskId: string;
  customKioskInput: string;
  setCustomKioskInput: (val: string) => void;
  onSaveKioskId: (targetId?: string) => void;
}

export function KioskStationSetupModal({
  isOpen,
  onClose,
  kioskId,
  customKioskInput,
  setCustomKioskInput,
  onSaveKioskId,
}: KioskStationSetupModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-zinc-900 border border-zinc-700/80 rounded-3xl p-6 sm:p-7 shadow-2xl animate-fade-in">
        <div className="flex items-center gap-3 mb-2">
          <div className="p-2.5 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-500">
            <Radio className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-white">Pilih Stasiun Kiosk</h3>
            <p className="text-xs text-zinc-400">Tentukan nomor stasiun untuk unit komputer kiosk ini.</p>
          </div>
        </div>

        <div className="my-5 space-y-3">
          <label className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider block">
            Pilih Cepat Nomor Kiosk:
          </label>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
            {["KIOSK-01", "KIOSK-02", "KIOSK-03", "KIOSK-04"].map((preset) => (
              <button
                key={preset}
                type="button"
                onClick={() => onSaveKioskId(preset)}
                className={`py-3 px-2 rounded-2xl border font-mono font-bold text-sm flex flex-col items-center justify-center gap-1 transition cursor-pointer active:scale-95 ${
                  kioskId === preset
                    ? "bg-rose-600 border-rose-500 text-white shadow-lg shadow-rose-600/30"
                    : "bg-zinc-800/80 hover:bg-zinc-700 border-zinc-700 text-zinc-200"
                }`}
              >
                <span>{preset}</span>
                <span className="text-[9px] font-sans font-normal opacity-80">
                  {preset === "KIOSK-01"
                    ? "Mesin 1"
                    : preset === "KIOSK-02"
                    ? "Mesin 2"
                    : preset === "KIOSK-03"
                    ? "Mesin 3"
                    : "Mesin 4"}
                </span>
              </button>
            ))}
          </div>

          <div className="pt-2">
            <label className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider block mb-1.5">
              Atau Ketik ID Kustom:
            </label>
            <input
              type="text"
              value={customKioskInput}
              onChange={(e) => setCustomKioskInput(e.target.value.toUpperCase())}
              placeholder="Contoh: KIOSK-VIP, KIOSK-05"
              className="w-full bg-zinc-950 border border-zinc-700 rounded-2xl px-4 py-3 text-white font-mono text-sm uppercase focus:outline-none focus:border-rose-500 shadow-inner"
            />
          </div>
        </div>

        <div className="flex gap-2.5 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 py-3 rounded-2xl bg-zinc-800 hover:bg-zinc-700 text-xs font-semibold text-zinc-300 transition cursor-pointer"
          >
            Batal
          </button>
          <button
            type="button"
            onClick={() => onSaveKioskId()}
            className="flex-1 py-3 rounded-2xl bg-rose-600 hover:bg-rose-500 text-xs font-bold text-white shadow-lg shadow-rose-600/30 transition cursor-pointer"
          >
            Simpan Stasiun Ini
          </button>
        </div>
      </div>
    </div>
  );
}
