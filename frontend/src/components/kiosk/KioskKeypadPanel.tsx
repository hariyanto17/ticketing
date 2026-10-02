"use client";

import React from "react";
import { Search, AlertCircle, Delete, RefreshCw, Printer, ArrowRight } from "lucide-react";

interface KioskKeypadPanelProps {
  inputText: string;
  errorMessage: string | null;
  isProcessing: boolean;
  onKeypadPress: (char: string) => void;
  onBackspace: () => void;
  onClear: () => void;
  onExecuteLookup: (queryStr: string) => void;
}

export function KioskKeypadPanel({
  inputText,
  errorMessage,
  isProcessing,
  onKeypadPress,
  onBackspace,
  onClear,
  onExecuteLookup,
}: KioskKeypadPanelProps) {
  return (
    <section className="lg:col-span-6 flex flex-col justify-center bg-zinc-900/40 border border-zinc-800/80 rounded-3xl p-6 sm:p-8 shadow-2xl backdrop-blur-xl">
      <div className="mb-4">
        <h2 className="text-lg font-bold text-white mb-1">Ketik Nomor Booking / No. HP</h2>
        <p className="text-xs text-zinc-400">
          Alternatif jika tanpa HP: Masukkan No. Pesanan (<span className="text-rose-400 font-mono">ORD-...</span>) atau No. HP
        </p>
      </div>

      {/* Large Input Display Box */}
      <div className="relative mb-4">
        <div className="w-full min-h-[58px] bg-zinc-950 border-2 border-zinc-700 focus-within:border-rose-500 rounded-2xl flex items-center px-4 py-2 transition shadow-inner">
          <Search className="w-5 h-5 text-zinc-500 mr-2 shrink-0" />
          <span className="text-xl font-mono tracking-wider text-white font-bold flex-1 overflow-x-auto whitespace-nowrap">
            {inputText || (
              <span className="text-zinc-600 font-normal text-sm font-sans">
                Contoh: ORD-20260904-XXXX atau 0812...
              </span>
            )}
          </span>
          {inputText.length > 0 && (
            <button
              type="button"
              onClick={onClear}
              className="p-1 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs font-semibold px-2.5 py-1 ml-2 transition cursor-pointer"
            >
              Hapus
            </button>
          )}
        </div>
      </div>

      {/* Error Banner */}
      {errorMessage && (
        <div className="mb-4 p-3.5 rounded-2xl bg-rose-500/10 border border-rose-500/30 flex items-center gap-3 text-rose-400 text-xs font-semibold animate-shake">
          <AlertCircle className="w-5 h-5 shrink-0 text-rose-500" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Touchscreen Numeric & Quick Keypad */}
      <div className="grid grid-cols-3 gap-2.5 mb-4">
        {["1", "2", "3", "4", "5", "6", "7", "8", "9", "08", "0", "ORD-"].map((val) => (
          <button
            key={val}
            type="button"
            onClick={() => onKeypadPress(val)}
            className="h-14 rounded-2xl bg-zinc-800/70 hover:bg-zinc-700 active:scale-95 text-white font-mono font-bold text-lg border border-zinc-700/50 shadow transition flex items-center justify-center hover:border-rose-500/50 cursor-pointer"
          >
            {val}
          </button>
        ))}
      </div>

      {/* Action Row */}
      <div className="grid grid-cols-4 gap-2.5">
        <button
          type="button"
          onClick={onBackspace}
          className="col-span-1 h-14 rounded-2xl bg-zinc-800/90 hover:bg-zinc-700 active:scale-95 text-zinc-300 font-bold border border-zinc-700/50 flex items-center justify-center transition cursor-pointer"
          title="Hapus Satu Karakter"
        >
          <Delete className="w-6 h-6" />
        </button>

        <button
          type="button"
          onClick={() => onExecuteLookup(inputText)}
          disabled={isProcessing || !inputText.trim()}
          className="col-span-3 h-14 rounded-2xl bg-gradient-to-r from-rose-600 to-rose-500 hover:from-rose-500 hover:to-rose-400 disabled:opacity-40 disabled:cursor-not-allowed active:scale-98 text-white font-extrabold text-base tracking-wide shadow-lg shadow-rose-600/30 flex items-center justify-center gap-2 transition cursor-pointer"
        >
          {isProcessing ? (
            <>
              <RefreshCw className="w-5 h-5 animate-spin" />
              <span>Mencari Pesanan...</span>
            </>
          ) : (
            <>
              <Printer className="w-5 h-5" />
              <span>Cari & Cetak Tiket</span>
              <ArrowRight className="w-5 h-5" />
            </>
          )}
        </button>
      </div>
    </section>
  );
}
