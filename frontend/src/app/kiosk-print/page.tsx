"use client";

import React, { useState, useEffect, useRef, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Printer,
  QrCode,
  Smartphone,
  Clock,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  Delete,
  ArrowRight,
  RefreshCw,
  Search,
  LogOut,
  ArrowLeft,
  User as UserIcon,
  Wifi,
  Radio,
  Settings,
} from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import { io, Socket } from "socket.io-client";
import { useKioskLookupMutation, useKioskPrintLogMutation, KioskOrderResult } from "../../lib/api/orderApi";
import { KioskTicketTemplate } from "../../components/kiosk/KioskTicketTemplate";
import { createPrinterAgentClient } from "../../lib/api/printerAgentClient";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { clearCredentials } from "@/store/authSlice";
import { useLogoutMutation } from "@/services/authApi";
import { useToast } from "@/components/ui/toast";
import { SOCKET_BASE_URL } from "@/lib/api/api";

function KioskPrintContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const dispatch = useAppDispatch();
  const { error: toastError, success: toastSuccess, info: toastInfo } = useToast();
  const [logout] = useLogoutMutation();
  const user = useAppSelector((state) => state.auth.user);

  // Kiosk Station ID Configuration
  const [kioskId, setKioskId] = useState<string>("KIOSK-01");
  const [isEditingKioskId, setIsEditingKioskId] = useState<boolean>(false);
  const [customKioskInput, setCustomKioskInput] = useState<string>("");

  // Real-time socket state
  const [isConnectedToSocket, setIsConnectedToSocket] = useState<boolean>(false);
  const [lastCustomerDevice, setLastCustomerDevice] = useState<string | null>(null);

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
  const socketRef = useRef<Socket | null>(null);

  // Load Kiosk ID from URL or localStorage, or prompt first-time setup
  useEffect(() => {
    const urlKiosk = searchParams?.get("kiosk");
    if (urlKiosk) {
      const sanitized = urlKiosk.toUpperCase();
      setKioskId(sanitized);
      localStorage.setItem("pc_kiosk_id", sanitized);
    } else {
      const saved = localStorage.getItem("pc_kiosk_id");
      if (saved) {
        setKioskId(saved.toUpperCase());
      } else {
        // First time opening on this browser/PC: prompt setup modal so user can pick KIOSK-01, KIOSK-02, etc.
        setCustomKioskInput("KIOSK-01");
        setIsEditingKioskId(true);
      }
    }
  }, [searchParams]);

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

  // Socket.IO Connection & Kiosk Room Registration
  useEffect(() => {
    if (!kioskId) return;

    const socket = io(SOCKET_BASE_URL, {
      transports: ["websocket", "polling"],
      reconnection: true,
      reconnectionAttempts: 15,
      reconnectionDelay: 1000,
    });
    socketRef.current = socket;

    socket.on("connect", () => {
      setIsConnectedToSocket(true);
      console.log(`[Kiosk] Connected to socket, joining room: kiosk_${kioskId}`);
      socket.emit("join_kiosk", kioskId);
    });

    socket.on("disconnect", () => {
      setIsConnectedToSocket(false);
      console.warn("[Kiosk] Disconnected from socket server");
    });

    // Handle print triggers received from mobile app or web scanner
    socket.on("kiosk_print_order", (data: { kioskId: string; query: string; order?: KioskOrderResult }) => {
      console.log("[Kiosk] Received print order event:", data);
      if (data?.kioskId?.toUpperCase() === kioskId.toUpperCase()) {
        if (data.order) {
          handleDirectOrderPrint(data.order);
        } else if (data.query) {
          handleExecuteLookup(data.query);
        }
      }
    });

    // Customer phone connection feedback
    socket.on("kiosk_customer_connected", (data: { kioskId: string; customerDevice?: string }) => {
      if (data?.kioskId?.toUpperCase() === kioskId.toUpperCase()) {
        setLastCustomerDevice(data.customerDevice || "HP Pengunjung");
        setTimeout(() => setLastCustomerDevice(null), 5000);
      }
    });

    return () => {
      if (socket) {
        socket.emit("leave_kiosk", kioskId);
        socket.disconnect();
      }
    };
  }, [kioskId]);

  // Hardware USB 2D Barcode Scanner Keyboard Listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const now = Date.now();

      // If key interval is fast (< 150ms), it's from a hardware scanner
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

  const handleDirectOrderPrint = async (orderData: KioskOrderResult) => {
    if (isProcessing || isPrinting) return;
    try {
      setIsProcessing(true);
      setErrorMessage(null);
      setActiveOrder(orderData);
      setIsPrinting(true);

      // Trigger thermal printer
      await executePrinting(orderData);

      // Log print activity
      await logPrint({ orderId: orderData.orderId }).catch(() => {});

      // Auto-reset countdown
      startResetCountdown();
    } catch (err: any) {
      console.error("Direct print failed:", err);
      setErrorMessage(err?.message || "Gagal mencetak tiket.");
    } finally {
      setIsProcessing(false);
    }
  };

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
      startResetCountdown();
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

  const startResetCountdown = () => {
    if (resetTimerRef.current) clearInterval(resetTimerRef.current);
    let remaining = 4;
    setCountdown(remaining);
    resetTimerRef.current = setInterval(() => {
      remaining -= 1;
      setCountdown(remaining);
      if (remaining <= 0) {
        handleResetToStandby();
      }
    }, 1000);
  };

  const executePrinting = async (order: KioskOrderResult) => {
    try {
      const printerClient = createPrinterAgentClient();
      const dateVal = order.showtime.businessDate || order.showtime.startTime;
      const d = new Date(dateVal);
      const showDate = isNaN(d.getTime())
        ? String(dateVal)
        : `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}/${d.getFullYear()}`;
      const showTime = new Date(order.showtime.startTime).toLocaleTimeString("id-ID", {
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
      });

      for (const ticket of order.tickets) {
        const row = ticket.row || ticket.seatLabel.replace(/[0-9]/g, "") || "A";
        const seatNumber = Number(ticket.seatNumber) || parseInt(ticket.seatLabel.replace(/[^0-9]/g, ""), 10) || 1;
        const seat = ticket.seatLabel || `${row}${seatNumber}`;
        const price = Number(ticket.price) || (order.tickets.length ? Math.round(order.totalAmount / order.tickets.length) : 0);

        await printerClient.printTicket({
          mode: "print",
          ticketNumber: ticket.ticketNumber,
          orderNumber: order.orderNumber,
          movie: order.movie.title,
          studio: order.studio.name,
          showDate: showDate,
          showTime: showTime,
          seat: seat,
          row: row,
          seatNumber: seatNumber,
          price: price,
          totalAmount: Number(order.totalAmount) || price,
          qrCode: ticket.qrCode || ticket.ticketNumber,
          customerName: order.customerName || undefined,
        }).catch((err) => {
          console.warn("[PrinterAgent] Silent print ticket error:", err);
        });
      }
    } catch (e) {
      console.warn("[PrinterAgent] Silent print error:", e);
    }
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

  const handleLogout = async () => {
    try {
      await logout().unwrap();
      dispatch(clearCredentials());
      toastSuccess("Berhasil keluar.");
      router.push("/login");
    } catch (err: any) {
      dispatch(clearCredentials());
      router.push("/login");
    }
  };

  const handleSaveKioskId = (targetId?: string) => {
    const val = (targetId || customKioskInput).trim();
    if (val) {
      const sanitized = val.toUpperCase();
      setKioskId(sanitized);
      localStorage.setItem("pc_kiosk_id", sanitized);
      setIsEditingKioskId(false);
      toastSuccess(`Stasiun Kiosk berhasil disetel ke: ${sanitized}`);
    }
  };

  const isAdmin =
    (user?.role || "").toUpperCase().includes("ADMIN") ||
    (user?.role || "").toUpperCase().includes("CASHIER");

  // Mobile pairing URL encoded in QR Code
  const pairingQrValue = typeof window !== "undefined"
    ? `${window.location.origin}/kiosk-print/mobile-scan?kiosk=${encodeURIComponent(kioskId)}`
    : `https://ticket.168billiard.online/kiosk-print/mobile-scan?kiosk=${encodeURIComponent(kioskId)}`;

  return (
    <main className="min-h-screen w-full bg-zinc-950 text-white flex flex-col justify-between overflow-hidden select-none font-sans">
      {/* Top Header Bar */}
      <header className="px-6 lg:px-8 py-4 bg-zinc-900/60 border-b border-zinc-800 flex items-center justify-between backdrop-blur-md">
        <div className="flex items-center gap-3">
          <img
            src="/PLANET-CINEMA-LOGO-2-COLOR.png"
            alt="Planet Cinema"
            className="h-10 w-auto object-contain"
          />
          <div>
            <h1 className="text-base font-extrabold tracking-wider text-white">
              PLANET CINEMA
            </h1>
            <div className="flex items-center gap-2">
              <p className="text-xs text-zinc-400 font-medium tracking-wide">
                Self-Service Ticket Dispenser Kiosk
              </p>
              <button
                type="button"
                onClick={() => {
                  setCustomKioskInput(kioskId);
                  setIsEditingKioskId(true);
                }}
                className="px-2 py-0.5 rounded bg-zinc-800 hover:bg-zinc-700 text-[10px] font-mono font-bold text-rose-400 border border-zinc-700 flex items-center gap-1 transition cursor-pointer"
                title="Klik untuk ubah ID Stasiun Kiosk"
              >
                <Radio className="w-2.5 h-2.5" />
                <span>{kioskId}</span>
              </button>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3 sm:gap-5">
          {/* Socket Realtime Connection Status */}
          <div
            className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border text-xs font-semibold ${
              isConnectedToSocket
                ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400"
                : "bg-amber-500/10 border-amber-500/30 text-amber-400 animate-pulse"
            }`}
          >
            <span
              className={`w-2 h-2 rounded-full ${
                isConnectedToSocket ? "bg-emerald-400 animate-ping" : "bg-amber-400"
              }`}
            />
            <span className="hidden sm:inline">
              {isConnectedToSocket ? "Realtime Socket Siap" : "Menghubungkan Socket..."}
            </span>
          </div>

          <div className="flex items-center gap-2 text-zinc-300 font-mono text-xs sm:text-sm bg-zinc-800/80 px-3 sm:px-4 py-1.5 rounded-xl border border-zinc-700/50">
            <Clock className="w-4 h-4 text-rose-400" />
            <span>{currentTime || "00:00:00"} WIB</span>
          </div>

          {user && (
            <div className="flex items-center gap-2">
              <div className="hidden md:flex items-center gap-2 bg-zinc-900 border border-zinc-800 px-3 py-1.5 rounded-xl text-xs text-zinc-300">
                <UserIcon className="w-3.5 h-3.5 text-rose-400" />
                <span className="font-semibold text-zinc-200">{user.name || user.username}</span>
                <span className="text-[10px] text-zinc-500 uppercase px-1.5 py-0.5 rounded bg-zinc-800">
                  {user.role}
                </span>
              </div>

              {isAdmin && (
                <button
                  type="button"
                  onClick={() => router.push("/admin/dashboard")}
                  className="px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 rounded-xl text-xs font-semibold text-zinc-200 flex items-center gap-1.5 transition cursor-pointer"
                  title="Kembali ke Dashboard Admin"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Admin</span>
                </button>
              )}

              <button
                type="button"
                onClick={handleLogout}
                className="px-3 py-1.5 bg-rose-950/40 hover:bg-rose-900/60 border border-rose-800/50 hover:border-rose-700 rounded-xl text-xs font-semibold text-rose-300 flex items-center gap-1.5 transition cursor-pointer"
                title="Keluar / Logout"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Keluar</span>
              </button>
            </div>
          )}
        </div>
      </header>

      {/* Customer Connected Floating Notification */}
      {lastCustomerDevice && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-40 bg-emerald-500/90 text-white font-bold px-6 py-2.5 rounded-2xl shadow-2xl flex items-center gap-3 backdrop-blur-md animate-bounce border border-emerald-400">
          <Smartphone className="w-5 h-5 animate-pulse" />
          <span>{lastCustomerDevice} terhubung! Menunggu perintah cetak...</span>
        </div>
      )}

      {/* Main Kiosk Content Area */}
      <div className="flex-1 max-w-7xl w-full mx-auto p-6 md:p-8 grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
        {/* Left View: Dynamic Kiosk Pairing QR Code & Mobile App Instructions */}
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
              <QRCodeSVG
                value={pairingQrValue}
                size={168}
                level="H"
                includeMargin={false}
              />
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
                  Tekan tombol <strong className="text-rose-400 font-semibold">&quot;Cetak di Kiosk&quot;</strong> dan scan QR ini atau masukkan kode <span className="font-mono font-bold text-white bg-zinc-800 px-1.5 py-0.5 rounded border border-zinc-700">{kioskId}</span>.
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

        {/* Right View: Touch Keypad & Manual Input (Fallback) */}
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
                  onClick={handleClear}
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
                onClick={() => handleKeypadPress(val)}
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
              onClick={handleBackspace}
              className="col-span-1 h-14 rounded-2xl bg-zinc-800/90 hover:bg-zinc-700 active:scale-95 text-zinc-300 font-bold border border-zinc-700/50 flex items-center justify-center transition cursor-pointer"
              title="Hapus Satu Karakter"
            >
              <Delete className="w-6 h-6" />
            </button>

            <button
              type="button"
              onClick={() => handleExecuteLookup(inputText)}
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
              className="mt-4 w-full py-3 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-bold transition cursor-pointer"
            >
              Selesai Sekarang
            </button>
          </div>
        </div>
      )}

      {/* Edit Kiosk Station ID Modal */}
      {isEditingKioskId && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4">
          <div className="max-w-md w-full bg-zinc-900 border border-zinc-700/80 rounded-3xl p-6 sm:p-7 shadow-2xl animate-fade-in">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2.5 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-500">
                <Radio className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-white">Pilih Stasiun Kiosk</h3>
                <p className="text-xs text-zinc-400">
                  Tentukan nomor stasiun untuk unit komputer kiosk ini.
                </p>
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
                    onClick={() => handleSaveKioskId(preset)}
                    className={`py-3 px-2 rounded-2xl border font-mono font-bold text-sm flex flex-col items-center justify-center gap-1 transition cursor-pointer active:scale-95 ${
                      kioskId === preset
                        ? "bg-rose-600 border-rose-500 text-white shadow-lg shadow-rose-600/30"
                        : "bg-zinc-800/80 hover:bg-zinc-700 border-zinc-700 text-zinc-200"
                    }`}
                  >
                    <span>{preset}</span>
                    <span className="text-[9px] font-sans font-normal opacity-80">
                      {preset === "KIOSK-01" ? "Mesin 1" : preset === "KIOSK-02" ? "Mesin 2" : preset === "KIOSK-03" ? "Mesin 3" : "Mesin 4"}
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
                onClick={() => setIsEditingKioskId(false)}
                className="flex-1 py-3 rounded-2xl bg-zinc-800 hover:bg-zinc-700 text-xs font-semibold text-zinc-300 transition cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={() => handleSaveKioskId()}
                className="flex-1 py-3 rounded-2xl bg-rose-600 hover:bg-rose-500 text-xs font-bold text-white shadow-lg shadow-rose-600/30 transition cursor-pointer"
              >
                Simpan Stasiun Ini
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Hidden Printable Thermal Receipt Container */}
      {activeOrder && <KioskTicketTemplate order={activeOrder} />}

      {/* Bottom Footer Notice */}
      <footer className="px-8 py-3 bg-zinc-950 border-t border-zinc-900 text-center text-zinc-500 text-xs flex items-center justify-between">
        <span>Planet Cinema Ticketing POS & Kiosk Terminal System</span>
        <span>Stasiun Kiosk: <strong className="text-zinc-400 font-mono">{kioskId}</strong></span>
      </footer>
    </main>
  );
}

export default function KioskPrintPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-zinc-950 flex items-center justify-center text-white">
          <RefreshCw className="w-8 h-8 animate-spin text-rose-500" />
        </div>
      }
    >
      <KioskPrintContent />
    </Suspense>
  );
}
