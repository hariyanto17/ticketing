"use client";

import React, { useState, useEffect, useRef } from "react";
import {
  Printer,
  QrCode,
  Ticket,
  Film,
  Clock,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  Delete,
  ArrowRight,
  RefreshCw,
  Search,
} from "lucide-react";
import { useKioskLookupMutation, useKioskPrintLogMutation, KioskOrderResult } from "../../lib/api/orderApi";
import { KioskCameraScanner } from "../../components/kiosk/KioskCameraScanner";
import { KioskTicketTemplate } from "../../components/kiosk/KioskTicketTemplate";
import { createPrinterAgentClient } from "../../lib/api/printerAgentClient";

export default function KioskPrintPage() {
  const [inputText, setInputText] = useState<string>("");
  const [activeOrder, setActiveOrder] = useState<KioskOrderResult | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [isPrinting, setIsPrinting] = useState<boolean>(false);
  const [countdown, setCountdown] = useState<number>(4);
  const [currentTime, setCurrentTime] = useState<string>("");

  const [lookupOrder] = useKioskLookupMutation();
  const [logPrint] = useKioskPrintLogMutation();

  const resetTimerRef = useRef<NodeJS.Timeout | null>(null);
  const barcodeBufferRef = useRef<string>("");
  const lastKeyTimeRef = useRef<number>(0);

  // Live Clock update
  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setCurrentTime(
        now.toLocaleTimeString("id-ID", {
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
          hour12: false,
        })
      );
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  // Hardware USB 2D Barcode Scanner Keyboard Listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const now = Date.now();

      // If key interval is fast (< 50ms), it's from a hardware scanner
      if (now - lastKeyTimeRef.current > 150) {
        barcodeBufferRef.current = "";
      }
      lastKeyTimeRef.current = now;

      if (e.key === "Enter") {
        if (barcodeBufferRef.current.length >= 4) {
          const scanned = barcodeBufferRef.current.trim();
          barcodeBufferRef.current = "";
          handleExecuteLookup(scanned);
        }
      } else if (e.key.length === 1) {
        barcodeBufferRef.current += e.key;
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  // Execute lookup and trigger printing
  const handleExecuteLookup = async (queryStr: string) => {
    const trimmed = queryStr.trim();
    if (!trimmed || isProcessing) return;

    try {
      setIsProcessing(true);
      setErrorMessage(null);

      const res = await lookupOrder({ query: trimmed }).unwrap();
      const orderData = res.data;

      setActiveOrder(orderData);
      setIsPrinting(true);

      // Trigger Printing
      await executePrinting(orderData);

      // Log print activity
      await logPrint({ orderId: orderData.orderId }).catch(() => {});

      // Auto-reset countdown
      let remaining = 4;
      setCountdown(remaining);
      resetTimerRef.current = setInterval(() => {
        remaining -= 1;
        setCountdown(remaining);
        if (remaining <= 0) {
          handleResetToStandby();
        }
      }, 1000);
    } catch (err: any) {
      console.error("Kiosk lookup failed:", err);
      const message = err?.data?.message || err?.message || "Pesanan tidak ditemukan atau belum lunas.";
      setErrorMessage(message);

      // Auto clear error message after 5 seconds
      setTimeout(() => {
        setErrorMessage(null);
      }, 5000);
    } finally {
      setIsProcessing(false);
    }
  };

  const executePrinting = async (order: KioskOrderResult) => {
    try {
      // 1. Try Hardware Printer Agent Client if available
      const printerClient = createPrinterAgentClient();
      const health = await printerClient.getHealth().catch(() => null);

      if (health && health.status === "ok") {
        for (const ticket of order.tickets) {
          await printerClient.printTicket({
            orderNumber: order.orderNumber,
            movieTitle: order.movie.title,
            studioName: order.studio.name,
            studioType: order.studio.type,
            date: order.showtime.businessDate || order.showtime.startTime,
            time: order.showtime.startTime,
            seatLabel: ticket.seatLabel,
            ticketNumber: ticket.ticketNumber,
            qrCode: ticket.qrCode,
            customerName: order.customerName,
            price: ticket.price,
          }).catch(() => {});
        }
        return;
      }
    } catch (e) {
      console.warn("PrinterAgent unavailable, falling back to browser print", e);
    }

    // 2. Fallback to Browser Print
    setTimeout(() => {
      window.print();
    }, 400);
  };

  const handleResetToStandby = () => {
    if (resetTimerRef.current) {
      clearInterval(resetTimerRef.current);
      resetTimerRef.current = null;
    }
    setActiveOrder(null);
    setIsPrinting(false);
    setInputText("");
    setErrorMessage(null);
    setCountdown(4);
  };

  // Virtual Keypad handlers
  const handleKeypadPress = (char: string) => {
    if (inputText.length < 30) {
      setInputText((prev) => prev + char);
    }
  };

  const handleBackspace = () => {
    setInputText((prev) => prev.slice(0, -1));
  };

  const handleClear = () => {
    setInputText("");
  };

  const formatCurrency = (amount: number) => {
    return `Rp ${amount.toLocaleString("id-ID")}`;
  };

  return (
    <main className="min-h-screen w-full bg-zinc-950 text-white flex flex-col justify-between overflow-hidden select-none font-sans">
      {/* Top Header Bar */}
      <header className="px-8 py-5 bg-zinc-900/60 border-b border-zinc-800 flex items-center justify-between backdrop-blur-md">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-rose-600 to-rose-400 flex items-center justify-center shadow-lg shadow-rose-600/30">
            <Film className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-extrabold tracking-wider bg-gradient-to-r from-white via-zinc-200 to-rose-400 bg-clip-text text-transparent">
              PLANET CINEMA
            </h1>
            <p className="text-xs text-zinc-400 font-medium tracking-wide">
              Self-Service Ticket Dispenser Kiosk
            </p>
          </div>
        </div>

        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-semibold">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
            <span>Kiosk Siap Digunakan</span>
          </div>

          <div className="flex items-center gap-2 text-zinc-300 font-mono text-sm bg-zinc-800/80 px-4 py-1.5 rounded-xl border border-zinc-700/50">
            <Clock className="w-4 h-4 text-rose-400" />
            <span>{currentTime || "00:00:00"} WIB</span>
          </div>
        </div>
      </header>

      {/* Main Kiosk Content Area */}
      <div className="flex-1 max-w-7xl w-full mx-auto p-6 md:p-8 grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
        {/* Left View: Live Camera Scanner */}
        <section className="lg:col-span-6 h-[460px] sm:h-[500px] flex flex-col">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <QrCode className="w-5 h-5 text-rose-500" />
              <h2 className="text-base font-bold text-zinc-100">Scan Barcode / QR Tiket</h2>
            </div>
            <span className="text-xs text-zinc-400">Arahkan layar HP ke kamera</span>
          </div>

          <div className="flex-1 w-full relative">
            <KioskCameraScanner
              onScanSuccess={(decoded) => handleExecuteLookup(decoded)}
              isScanningPaused={isPrinting || isProcessing}
            />
          </div>

          <div className="mt-3 flex items-center justify-center gap-2 text-xs text-zinc-400 bg-zinc-900/40 p-2.5 rounded-xl border border-zinc-800/60">
            <Sparkles className="w-4 h-4 text-rose-400 shrink-0" />
            <span>Posisikan barcode tiket sekitar 15-20 cm tepat di depan lensa kamera</span>
          </div>
        </section>

        {/* Right View: Touch Keypad & Manual Input */}
        <section className="lg:col-span-6 flex flex-col justify-center bg-zinc-900/40 border border-zinc-800/80 rounded-3xl p-6 sm:p-8 shadow-2xl backdrop-blur-xl">
          <div className="mb-4">
            <h2 className="text-lg font-bold text-white mb-1">Ketik Nomor Booking / No. HP</h2>
            <p className="text-xs text-zinc-400">
              Masukkan Nomor Pesanan (<span className="text-rose-400 font-mono">ORD-...</span>) atau No. HP saat memesan
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
                  onClick={handleClear}
                  className="p-1 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs font-semibold px-2.5 py-1 ml-2 transition"
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
                onClick={() => handleKeypadPress(val)}
                className="h-14 rounded-2xl bg-zinc-800/70 hover:bg-zinc-700 active:scale-95 text-white font-mono font-bold text-lg border border-zinc-700/50 shadow transition flex items-center justify-center hover:border-rose-500/50"
              >
                {val}
              </button>
            ))}
          </div>

          {/* Action Row */}
          <div className="grid grid-cols-4 gap-2.5">
            <button
              type="button"
              onClick={handleBackspace}
              className="col-span-1 h-14 rounded-2xl bg-zinc-800/90 hover:bg-zinc-700 active:scale-95 text-zinc-300 font-bold border border-zinc-700/50 flex items-center justify-center transition"
              title="Hapus Satu Karakter"
            >
              <Delete className="w-6 h-6" />
            </button>

            <button
              type="button"
              onClick={() => handleExecuteLookup(inputText)}
              disabled={isProcessing || !inputText.trim()}
              className="col-span-3 h-14 rounded-2xl bg-gradient-to-r from-rose-600 to-rose-500 hover:from-rose-500 hover:to-rose-400 disabled:opacity-40 disabled:cursor-not-allowed active:scale-98 text-white font-extrabold text-base tracking-wide shadow-lg shadow-rose-600/30 flex items-center justify-center gap-2 transition"
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
      </div>

      {/* Printing Modal Overlay */}
      {isPrinting && activeOrder && (
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
                <span className="font-semibold text-rose-400">{activeOrder.studio.name} ({activeOrder.studio.type})</span>
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
              onClick={handleResetToStandby}
              className="mt-4 w-full py-3 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-bold transition"
            >
              Selesai Sekarang
            </button>
          </div>
        </div>
      )}

      {/* Hidden Printable Thermal Receipt Container */}
      {activeOrder && <KioskTicketTemplate order={activeOrder} />}

      {/* Bottom Footer Notice */}
      <footer className="px-8 py-3 bg-zinc-950 border-t border-zinc-900 text-center text-zinc-500 text-xs flex items-center justify-between">
        <span>Planet Cinema Ticketing POS & Kiosk Terminal System</span>
        <span>Butuh bantuan? Hubungi staf bioskop di area lobi</span>
      </footer>
    </main>
  );
}
