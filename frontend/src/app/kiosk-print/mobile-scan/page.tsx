"use client";

import React, { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import {
  Printer,
  Smartphone,
  CheckCircle2,
  AlertCircle,
  Search,
  Sparkles,
  ArrowRight,
  RefreshCw,
  Film,
  Clock,
  Armchair,
  MapPin,
  Ticket,
} from "lucide-react";
import { io, Socket } from "socket.io-client";
import { SOCKET_BASE_URL } from "@/lib/api/api";
import { useKioskLookupMutation, KioskOrderResult } from "@/lib/api/orderApi";

function MobileKioskScanContent() {
  const searchParams = useSearchParams();
  const kioskId = (searchParams?.get("kiosk") || "KIOSK-01").toUpperCase();

  const [inputQuery, setInputQuery] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(false);
  const [order, setOrder] = useState<KioskOrderResult | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [printSuccess, setPrintSuccess] = useState<boolean>(false);
  const [socketConnected, setSocketConnected] = useState<boolean>(false);

  const [lookupOrder] = useKioskLookupMutation();

  useEffect(() => {
    const socket = io(SOCKET_BASE_URL, {
      transports: ["websocket", "polling"],
      reconnection: true,
    });

    socket.on("connect", () => {
      setSocketConnected(true);
      // Notify Kiosk that a mobile device has opened the page
      socket.emit("kiosk_customer_connected", {
        kioskId,
        customerDevice: "Browser HP Pengunjung",
      });
    });

    socket.on("disconnect", () => {
      setSocketConnected(false);
    });

    return () => {
      socket.disconnect();
    };
  }, [kioskId]);

  const handleLookup = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const query = inputQuery.trim();
    if (!query) return;

    try {
      setLoading(true);
      setErrorMessage(null);
      setPrintSuccess(false);

      const res = await lookupOrder({ query }).unwrap();
      setOrder(res.data);
    } catch (err: any) {
      console.error("Lookup error:", err);
      setOrder(null);
      setErrorMessage(
        err?.data?.message || err?.message || "Pesanan tidak ditemukan atau belum lunas."
      );
    } finally {
      setLoading(false);
    }
  };

  const handleTriggerPrint = async () => {
    if (!order) return;
    try {
      setLoading(true);
      setErrorMessage(null);

      // Trigger via API
      const response = await fetch(`${SOCKET_BASE_URL}/api/tickets/kiosk/trigger-print`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          kioskId,
          query: order.orderNumber,
        }),
      });

      const resData = await response.json();
      if (!response.ok) {
        throw new Error(resData.message || "Gagal mengirim perintah cetak");
      }

      setPrintSuccess(true);
    } catch (err: any) {
      console.error("Print trigger failed:", err);
      setErrorMessage(err?.message || "Gagal mencetak tiket di Kiosk.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-zinc-950 text-white font-sans p-4 sm:p-6 flex flex-col justify-between max-w-lg mx-auto">
      <div>
        {/* Header */}
        <header className="flex items-center justify-between pb-4 border-b border-zinc-800 mb-6">
          <div className="flex items-center gap-3">
            <img
              src="/PLANET-CINEMA-LOGO-2-COLOR.png"
              alt="Planet Cinema"
              className="h-9 w-auto object-contain"
            />
            <div>
              <h1 className="text-sm font-extrabold text-white">PLANET CINEMA</h1>
              <p className="text-[11px] text-zinc-400">Mobile Ticket Dispenser</p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 bg-rose-500/10 border border-rose-500/30 px-2.5 py-1 rounded-xl">
            <span className="text-[10px] text-zinc-400 uppercase font-semibold">Kiosk:</span>
            <span className="font-mono text-xs font-bold text-rose-400">{kioskId}</span>
          </div>
        </header>

        {/* Success Card */}
        {printSuccess ? (
          <div className="bg-zinc-900 border border-emerald-500/40 rounded-3xl p-6 text-center space-y-4 shadow-2xl animate-fade-in">
            <div className="w-16 h-16 mx-auto rounded-full bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shadow-[0_0_20px_rgba(16,185,129,0.3)]">
              <CheckCircle2 className="w-8 h-8" />
            </div>

            <div>
              <h2 className="text-lg font-bold text-white">Tiket Sedang Dicetak!</h2>
              <p className="text-xs text-zinc-400 mt-1">
                Silakan ambil tiket fisik Anda di mesin kiosk <strong className="text-rose-400 font-mono">{kioskId}</strong> di hadapan Anda.
              </p>
            </div>

            <div className="bg-zinc-950 p-4 rounded-2xl border border-zinc-800 text-left space-y-1.5 text-xs">
              <div className="flex justify-between">
                <span className="text-zinc-400">No. Pesanan:</span>
                <span className="font-mono font-bold text-white">{order?.orderNumber}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-400">Film:</span>
                <span className="font-bold text-rose-400 uppercase">{order?.movie.title}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-400">Kursi:</span>
                <span className="font-bold text-emerald-400">
                  {order?.tickets.map((t) => t.seatLabel).join(", ")}
                </span>
              </div>
            </div>

            <button
              type="button"
              onClick={() => {
                setOrder(null);
                setPrintSuccess(false);
                setInputQuery("");
              }}
              className="w-full py-3 rounded-2xl bg-zinc-800 hover:bg-zinc-700 text-xs font-bold text-zinc-200 transition cursor-pointer"
            >
              Cetak Tiket Lain
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Instruction Banner */}
            <div className="bg-gradient-to-br from-rose-950/40 to-zinc-900 border border-rose-900/40 rounded-3xl p-5 shadow-xl">
              <div className="flex items-center gap-2.5 text-rose-400 mb-2">
                <Smartphone className="w-5 h-5" />
                <h2 className="text-sm font-bold text-white">Cetak Tiket di Mesin Kiosk</h2>
              </div>
              <p className="text-xs text-zinc-300 leading-relaxed">
                Masukkan Nomor Pesanan (<span className="text-rose-400 font-mono">ORD-...</span>) atau Nomor HP yang digunakan saat pemesanan.
              </p>
            </div>

            {/* Form Input */}
            <form onSubmit={handleLookup} className="space-y-3">
              <div className="relative">
                <input
                  type="text"
                  value={inputQuery}
                  onChange={(e) => setInputQuery(e.target.value)}
                  placeholder="Contoh: ORD-20260904-XXXX / 0812..."
                  className="w-full h-14 bg-zinc-900 border-2 border-zinc-700 focus:border-rose-500 rounded-2xl px-4 text-white font-mono text-base placeholder:text-zinc-500 focus:outline-none transition shadow-inner"
                />
              </div>

              {errorMessage && (
                <div className="p-3 rounded-2xl bg-rose-500/10 border border-rose-500/30 flex items-center gap-2.5 text-rose-400 text-xs font-semibold">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{errorMessage}</span>
                </div>
              )}

              <button
                type="submit"
                disabled={loading || !inputQuery.trim()}
                className="w-full h-13 rounded-2xl bg-rose-600 hover:bg-rose-500 disabled:opacity-40 text-white font-bold text-sm flex items-center justify-center gap-2 transition shadow-lg shadow-rose-600/30 cursor-pointer"
              >
                {loading ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Mencari Pesanan...</span>
                  </>
                ) : (
                  <>
                    <Search className="w-4 h-4" />
                    <span>Cari Tiket</span>
                  </>
                )}
              </button>
            </form>

            {/* Order Preview & Print Confirmation */}
            {order && (
              <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-5 space-y-4 shadow-xl animate-fade-in">
                <div className="border-b border-zinc-800 pb-3">
                  <span className="text-[10px] font-mono text-zinc-500 uppercase">Detail Pesanan</span>
                  <h3 className="text-base font-extrabold text-white uppercase mt-0.5">
                    {order.movie.title}
                  </h3>
                </div>

                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div className="bg-zinc-950 p-3 rounded-xl border border-zinc-800">
                    <span className="text-zinc-500 block text-[10px]">Studio</span>
                    <span className="font-bold text-rose-400">{order.studio.name}</span>
                  </div>

                  <div className="bg-zinc-950 p-3 rounded-xl border border-zinc-800">
                    <span className="text-zinc-500 block text-[10px]">Kursi</span>
                    <span className="font-bold text-emerald-400">
                      {order.tickets.map((t) => t.seatLabel).join(", ")}
                    </span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleTriggerPrint}
                  disabled={loading}
                  className="w-full h-14 rounded-2xl bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 text-white font-extrabold text-sm tracking-wide shadow-lg shadow-emerald-600/30 flex items-center justify-center gap-2 transition cursor-pointer"
                >
                  {loading ? (
                    <>
                      <RefreshCw className="w-5 h-5 animate-spin" />
                      <span>Mengirim ke Kiosk...</span>
                    </>
                  ) : (
                    <>
                      <Printer className="w-5 h-5" />
                      <span>Cetak Tiket di {kioskId} Sekarang</span>
                    </>
                  )}
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      <footer className="pt-6 text-center text-zinc-600 text-[11px]">
        Planet Cinema Indonesia &bull; Kiosk Dispenser Bridge
      </footer>
    </main>
  );
}

export default function MobileKioskScanPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-zinc-950 flex items-center justify-center text-white">
          <RefreshCw className="w-6 h-6 animate-spin text-rose-500" />
        </div>
      }
    >
      <MobileKioskScanContent />
    </Suspense>
  );
}
