"use client";

import React from "react";
import { QrCode, Sparkles } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";

interface KioskQrCodePanelProps {
  kioskId: string;
  pairingQrValue: string;
}

export function KioskQrCodePanel({ kioskId, pairingQrValue }: KioskQrCodePanelProps) {
  return (
    <section className="lg:col-span-6 flex flex-col justify-center bg-zinc-900/50 border border-zinc-800/80 rounded-3xl p-6 sm:p-8 shadow-2xl backdrop-blur-xl relative overflow-hidden">
      {/* Top Decorative Header */}
      <div className="flex items-center justify-between mb-4 border-b border-zinc-800 pb-3">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-500">
            <QrCode className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-extrabold text-white">Scan Barcode / QR Kiosk</h2>
            <p className="text-xs text-zinc-400">Gunakan Aplikasi Planet Cinema di HP Anda</p>
          </div>
        </div>

        <div className="flex items-center gap-1.5 bg-zinc-950/80 border border-rose-500/40 px-3 py-1 rounded-xl">
          <span className="text-[10px] text-zinc-400 uppercase font-semibold">Stasiun:</span>
          <span className="font-mono text-xs font-black text-rose-400">{kioskId}</span>
        </div>
      </div>

      {/* QR Code Container */}
      <div className="flex flex-col sm:flex-row items-center gap-6 bg-zinc-950/80 border border-zinc-800 rounded-2xl p-5 mb-4 shadow-inner">
        <div className="p-3 bg-white rounded-2xl shadow-xl shrink-0 flex items-center justify-center">
          <QRCodeSVG value={pairingQrValue} size={168} level="H" includeMargin={false} />
        </div>

        {/* Instruction Steps */}
        <div className="space-y-3 flex-1 w-full">
          <div className="flex items-start gap-3">
            <span className="w-6 h-6 rounded-full bg-rose-600/20 text-rose-400 border border-rose-500/30 text-xs font-bold flex items-center justify-center shrink-0">
              1
            </span>
            <p className="text-xs text-zinc-300">
              Buka aplikasi <strong className="text-white font-semibold">Planet Cinema</strong> di smartphone Anda.
            </p>
          </div>

          <div className="flex items-start gap-3">
            <span className="w-6 h-6 rounded-full bg-rose-600/20 text-rose-400 border border-rose-500/30 text-xs font-bold flex items-center justify-center shrink-0">
              2
            </span>
            <p className="text-xs text-zinc-300">
              Masuk ke menu <strong className="text-white font-semibold">Tiket Saya</strong> & pilih pesanan Anda.
            </p>
          </div>

          <div className="flex items-start gap-3">
            <span className="w-6 h-6 rounded-full bg-rose-600/20 text-rose-400 border border-rose-500/30 text-xs font-bold flex items-center justify-center shrink-0">
              3
            </span>
            <p className="text-xs text-zinc-300">
              Tekan tombol <strong className="text-rose-400 font-semibold">&quot;Cetak di Kiosk&quot;</strong> dan scan QR ini atau masukkan kode{" "}
              <span className="font-mono font-bold text-white bg-zinc-800 px-1.5 py-0.5 rounded border border-zinc-700">
                {kioskId}
              </span>
              .
            </p>
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between text-xs text-zinc-400 bg-zinc-900/60 p-3 rounded-xl border border-zinc-800/80">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>Tiket fisik akan langsung keluar otomatis dari printer kiosk</span>
        </div>
        <span className="text-[11px] text-zinc-500 font-mono hidden sm:inline">Socket Active</span>
      </div>
    </section>
  );
}
