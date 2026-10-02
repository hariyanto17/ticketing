"use client";

import React, { useState, useEffect, useRef, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Smartphone, RefreshCw } from "lucide-react";
import { io, Socket } from "socket.io-client";
import { useKioskLookupMutation, useKioskPrintLogMutation, KioskOrderResult } from "../../lib/api/orderApi";
import { KioskTicketTemplate } from "../../components/kiosk/KioskTicketTemplate";
import { createPrinterAgentClient } from "../../lib/api/printerAgentClient";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { clearCredentials } from "@/store/authSlice";
import { useLogoutMutation } from "@/services/authApi";
import { useToast } from "@/components/ui/toast";
import { SOCKET_BASE_URL } from "@/lib/api/api";

// Modular Subcomponents
import { KioskHeader } from "@/components/kiosk/KioskHeader";
import { KioskQrCodePanel } from "@/components/kiosk/KioskQrCodePanel";
import { KioskKeypadPanel } from "@/components/kiosk/KioskKeypadPanel";
import { KioskStationSetupModal } from "@/components/kiosk/KioskStationSetupModal";
import { KioskPrintingModal } from "@/components/kiosk/KioskPrintingModal";

function KioskPrintContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const dispatch = useAppDispatch();
  const { success: toastSuccess } = useToast();
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
        setCustomKioskInput("KIOSK-01");
        setIsEditingKioskId(true);
      }
    }
  }, [searchParams]);

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
      socket.emit("join_kiosk", kioskId);
    });

    socket.on("disconnect", () => {
      setIsConnectedToSocket(false);
    });

    socket.on("kiosk_print_order", (data: { kioskId: string; query: string; order?: KioskOrderResult }) => {
      if (data?.kioskId?.toUpperCase() === kioskId.toUpperCase()) {
        if (data.order) {
          handleDirectOrderPrint(data.order);
        } else if (data.query) {
          handleExecuteLookup(data.query);
        }
      }
    });

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

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const now = Date.now();
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

      await executePrinting(orderData);
      await logPrint({ orderId: orderData.orderId }).catch(() => {});
      startResetCountdown();
    } catch (err: any) {
      setErrorMessage(err?.message || "Gagal mencetak tiket.");
    } finally {
      setIsProcessing(false);
    }
  };

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

      await executePrinting(orderData);
      await logPrint({ orderId: orderData.orderId }).catch(() => {});
      startResetCountdown();
    } catch (err: any) {
      const message = err?.data?.message || err?.message || "Pesanan tidak ditemukan atau belum lunas.";
      setErrorMessage(message);
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
        const price =
          Number(ticket.price) || (order.tickets.length ? Math.round(order.totalAmount / order.tickets.length) : 0);

        await printerClient
          .printTicket({
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
          })
          .catch((err) => {
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
    } catch {
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

  const pairingQrValue =
    typeof window !== "undefined"
      ? `${window.location.origin}/kiosk-print/mobile-scan?kiosk=${encodeURIComponent(kioskId)}`
      : `https://ticket.168billiard.online/kiosk-print/mobile-scan?kiosk=${encodeURIComponent(kioskId)}`;

  return (
    <main className="min-h-screen w-full bg-zinc-950 text-white flex flex-col justify-between overflow-hidden select-none font-sans">
      <KioskHeader
        kioskId={kioskId}
        onEditKioskId={() => {
          setCustomKioskInput(kioskId);
          setIsEditingKioskId(true);
        }}
        isConnectedToSocket={isConnectedToSocket}
        currentTime={currentTime}
        user={user}
        isAdmin={isAdmin}
        onAdminClick={() => router.push("/admin/dashboard")}
        onLogout={handleLogout}
      />

      {lastCustomerDevice && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-40 bg-emerald-500/90 text-white font-bold px-6 py-2.5 rounded-2xl shadow-2xl flex items-center gap-3 backdrop-blur-md animate-bounce border border-emerald-400">
          <Smartphone className="w-5 h-5 animate-pulse" />
          <span>{lastCustomerDevice} terhubung! Menunggu perintah cetak...</span>
        </div>
      )}

      <div className="flex-1 max-w-7xl w-full mx-auto p-6 md:p-8 grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
        <KioskQrCodePanel kioskId={kioskId} pairingQrValue={pairingQrValue} />
        <KioskKeypadPanel
          inputText={inputText}
          errorMessage={errorMessage}
          isProcessing={isProcessing}
          onKeypadPress={handleKeypadPress}
          onBackspace={handleBackspace}
          onClear={handleClear}
          onExecuteLookup={handleExecuteLookup}
        />
      </div>

      <KioskPrintingModal
        isPrinting={isPrinting}
        activeOrder={activeOrder}
        countdown={countdown}
        onResetToStandby={handleResetToStandby}
        formatCurrency={formatCurrency}
      />

      <KioskStationSetupModal
        isOpen={isEditingKioskId}
        onClose={() => setIsEditingKioskId(false)}
        kioskId={kioskId}
        customKioskInput={customKioskInput}
        setCustomKioskInput={setCustomKioskInput}
        onSaveKioskId={handleSaveKioskId}
      />

      {activeOrder && <KioskTicketTemplate order={activeOrder} />}

      <footer className="px-8 py-3 bg-zinc-950 border-t border-zinc-900 text-center text-zinc-500 text-xs flex items-center justify-between">
        <span>Planet Cinema Ticketing POS & Kiosk Terminal System</span>
        <span>
          Stasiun Kiosk: <strong className="text-zinc-400 font-mono">{kioskId}</strong>
        </span>
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
