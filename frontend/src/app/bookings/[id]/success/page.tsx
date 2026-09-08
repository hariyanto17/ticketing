"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { useLookupBookingQuery } from "@/services/bookingApi";
import {
  useCreateQrisPaymentMutation,
  useGetPaymentStatusQuery,
  useLazyGetPaymentStatusQuery,
  useSimulateQrisSuccessMutation,
} from "@/services/paymentApi";
import { Spinner } from "@/components/ui/spinner";
import {
  CheckCircle2,
  Ticket,
  QrCode,
  Printer,
  HelpCircle,
  Copy,
  Check,
  Clock,
  RefreshCw,
  ShieldCheck,
  ArrowLeft,
  Calendar,
  Armchair,
  Sparkles,
  ExternalLink,
} from "lucide-react";
import Link from "next/link";
import { useTranslation } from "@/lib/i18n";
import { ThemeToggle } from "@/components/ui/ThemeToggle";
import { LanguageToggle } from "@/components/ui/LanguageToggle";
import { io } from "socket.io-client";
import { SOCKET_BASE_URL } from "@/lib/api/api";
import { useToast } from "@/components/ui/toast";

export default function BookingSuccess() {
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();

  const rawId = params?.id;
  const paramId = typeof rawId === "string" ? rawId : Array.isArray(rawId) ? rawId[0] : "";
  const orderId = paramId || searchParams.get("orderId") || "";

  const { t, formatDate, formatCurrency } = useTranslation();
  const { success: toastSuccess, error: toastError } = useToast();

  // 1. Fetch authoritative order details via public lookup
  const {
    data: lookupResponse,
    isLoading: isLookupLoading,
    refetch: refetchLookup,
  } = useLookupBookingQuery(orderId, {
    skip: !orderId,
    pollingInterval: 5000,
  });

  const order = useMemo(() => {
    return lookupResponse?.find((o) => o.id === orderId || o.orderNumber === orderId || o.bookingNumber === orderId) || lookupResponse?.[0] || null;
  }, [lookupResponse, orderId]);

  // 2. Fetch Payment Status
  const {
    data: paymentStatusData,
    isLoading: isPaymentStatusLoading,
    refetch: refetchPaymentStatus,
  } = useGetPaymentStatusQuery(orderId, {
    skip: !orderId,
    pollingInterval: order?.orderStatus === "PAID" ? 0 : 3000,
  });

  // QRIS Payment generation mutation
  const [createQrisPayment, { isLoading: isCreatingQris }] = useCreateQrisPaymentMutation();
  const [simulateQrisSuccess, { isLoading: isSimulating }] = useSimulateQrisSuccessMutation();
  const [triggerStatusCheck, { isFetching: isCheckingStatus }] = useLazyGetPaymentStatusQuery();

  const [qrisData, setQrisData] = useState<{
    qrUrl?: string;
    qrString?: string;
    expiredAt?: string;
  } | null>(null);

  const [copied, setCopied] = useState(false);
  const [remainingSeconds, setRemainingSeconds] = useState<number>(600);

  // Auto-generate QRIS charge if not already existing
  useEffect(() => {
    if (!orderId || !order) return;
    if (order.orderStatus === "PAID") return;

    if (paymentStatusData?.qrUrl || paymentStatusData?.qrString) {
      setQrisData({
        qrUrl: paymentStatusData.qrUrl,
        qrString: paymentStatusData.qrString,
        expiredAt: paymentStatusData.expiredAt,
      });
      return;
    }

    createQrisPayment(orderId)
      .unwrap()
      .then((res) => {
        setQrisData({
          qrUrl: res.qrUrl,
          qrString: res.qrString,
          expiredAt: res.expiredAt,
        });
      })
      .catch((err) => {
        console.warn("QRIS generation notice:", err);
      });
  }, [orderId, order?.orderStatus, paymentStatusData, createQrisPayment]);

  // Socket.IO realtime listener for payment completion
  useEffect(() => {
    if (!orderId) return;

    const socket = io(SOCKET_BASE_URL, {
      transports: ["websocket", "polling"],
      reconnection: true,
      reconnectionAttempts: 10,
    });

    socket.emit("join_showtime", order?.scheduleId || orderId);

    const handleOrderUpdate = () => {
      refetchLookup();
      refetchPaymentStatus();
    };

    socket.on("order_updated", handleOrderUpdate);
    socket.on("payment_update", handleOrderUpdate);

    return () => {
      socket.disconnect();
    };
  }, [orderId, order?.scheduleId, refetchLookup, refetchPaymentStatus]);

  // Expiration countdown
  const targetExpiry = useMemo(() => {
    if (qrisData?.expiredAt) {
      const parsed = new Date(qrisData.expiredAt).getTime();
      if (!isNaN(parsed) && parsed > Date.now()) {
        return new Date(parsed);
      }
    }
    return new Date(Date.now() + 10 * 60 * 1000);
  }, [qrisData?.expiredAt]);

  useEffect(() => {
    const timer = setInterval(() => {
      const now = Date.now();
      const diff = Math.floor((targetExpiry.getTime() - now) / 1000);
      if (diff <= 0) {
        setRemainingSeconds(0);
      } else {
        setRemainingSeconds(diff);
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [targetExpiry]);

  const formatCountdown = (secs: number) => {
    const mins = Math.floor(secs / 60);
    const s = secs % 60;
    return `${String(mins).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  };

  const handleCopy = () => {
    if (!order?.bookingNumber) return;
    navigator.clipboard.writeText(order.bookingNumber);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleManualCheckStatus = async () => {
    try {
      const res = await triggerStatusCheck(orderId).unwrap();
      await refetchLookup();
      if (res.orderStatus === "PAID" || res.paymentStatus === "PAID") {
        toastSuccess("Pembayaran telah berhasil dikonfirmasi!");
      } else {
        toastSuccess("Status pembayaran telah diperbarui.");
      }
    } catch (err: any) {
      toastError(err?.data?.message || "Gagal memeriksa status pembayaran.");
    }
  };

  const handleSimulatePayment = async () => {
    try {
      await simulateQrisSuccess(orderId).unwrap();
      await refetchLookup();
      await refetchPaymentStatus();
      toastSuccess("Simulasi pembayaran QRIS berhasil!");
    } catch (err: any) {
      toastError(err?.data?.message || "Gagal melakukan simulasi pembayaran.");
    }
  };

  if (!orderId) {
    return (
      <div className="text-center py-20 bg-zinc-50 dark:bg-zinc-950 min-h-screen">
        <h2 className="text-xl font-bold">Pemesanan tidak ditemukan</h2>
        <Link href="/" className="text-indigo-600 hover:underline mt-2 inline-block">
          Kembali ke beranda
        </Link>
      </div>
    );
  }

  if (isLookupLoading && !order) {
    return (
      <div className="flex justify-center items-center min-h-screen bg-zinc-50 dark:bg-zinc-950">
        <Spinner className="w-12 h-12" />
      </div>
    );
  }

  if (!order) {
    return (
      <div className="text-center py-20 bg-zinc-50 dark:bg-zinc-950 min-h-screen">
        <h2 className="text-xl font-bold">Pemesanan tidak ditemukan</h2>
        <p className="text-xs text-zinc-400 mt-1">ID Pemesanan: {orderId}</p>
        <Link href="/" className="text-indigo-600 hover:underline mt-4 inline-block">
          Kembali ke beranda
        </Link>
      </div>
    );
  }

  const isApproved = order.orderStatus === "PAID" || paymentStatusData?.orderStatus === "PAID";
  const schedule = order.schedule;
  const tickets = order.tickets || [];

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 font-sans pb-20">
      {/* Header */}
      <header className="sticky top-0 z-40 w-full bg-white/80 dark:bg-zinc-900/80 backdrop-blur-md border-b border-zinc-150 dark:border-zinc-800">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => router.push("/")}
              className="p-2 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-xl cursor-pointer"
            >
              <ArrowLeft className="w-5 h-5 text-zinc-600 dark:text-zinc-400" />
            </button>
            <span className="font-bold text-zinc-900 dark:text-zinc-50 text-sm sm:text-base">
              {isApproved ? "Tiket Masuk Bioskop" : "Konfirmasi Pembayaran QRIS"}
            </span>
          </div>

          <div className="flex items-center gap-2.5">
            <LanguageToggle />
            <ThemeToggle />
            <Link href="/" className="flex items-center pl-1">
              <img
                src="/PLANET-CINEMA-LOGO-2-COLOR.png"
                alt="Planet Cinema"
                className="h-7 w-auto object-contain"
              />
            </Link>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 sm:px-6 mt-8 space-y-6">
        {/* Status Card */}
        <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl p-6 sm:p-8 text-center space-y-4 shadow-sm">
          <div
            className={`mx-auto w-14 h-14 rounded-full flex items-center justify-center ${
              isApproved
                ? "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400"
                : "bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400"
            }`}
          >
            <CheckCircle2 className="w-8 h-8" />
          </div>

          <div className="space-y-1">
            <h1 className="text-2xl font-black text-zinc-900 dark:text-zinc-50">
              {isApproved ? "Pembayaran Berhasil! Tiket Aktif" : "Reservasi Kursi Berhasil!"}
            </h1>
            <p className="text-xs text-zinc-500 max-w-md mx-auto">
              {isApproved
                ? "Tiket digital Anda sudah terbit dan siap digunakan di pintu masuk teater."
                : "Kursi Anda telah ditahan. Silakan selesaikan pembayaran QRIS di bawah ini."}
            </p>
          </div>

          <div className="inline-flex items-center gap-2 px-4 py-2 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-2xl">
            <span className="text-xs font-bold text-zinc-400 uppercase tracking-wider">Booking ID:</span>
            <span className="text-sm font-black text-indigo-600 dark:text-indigo-400">{order.bookingNumber}</span>
            <button
              onClick={handleCopy}
              className="p-1 hover:bg-zinc-200 dark:hover:bg-zinc-800 rounded-lg cursor-pointer transition-colors"
              title="Salin Booking ID"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5 text-zinc-400" />}
            </button>
          </div>
        </div>

        {/* Dynamic Payment State: PENDING vs PAID */}
        {!isApproved ? (
          <div className="grid grid-cols-1 md:grid-cols-12 gap-6 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl p-6 sm:p-8 shadow-sm items-center">
            {/* Left instructions */}
            <div className="md:col-span-7 space-y-5">
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <span className="px-2.5 py-1 rounded-lg bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 text-xs font-bold border border-amber-200 dark:border-amber-800 flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 animate-spin" />
                    <span>Sisa Waktu: {formatCountdown(remainingSeconds)}</span>
                  </span>
                </div>
                <h2 className="text-lg font-bold text-zinc-900 dark:text-zinc-50">
                  Scan QRIS untuk Menyelesaikan Pembayaran
                </h2>
                <p className="text-xs text-zinc-500 leading-relaxed">
                  Buka aplikasi mobile banking (BCA, Mandiri, BRI, BNI) atau e-wallet (GoPay, OVO, Dana, ShopeePay) lalu scan QR code.
                </p>
              </div>

              <div className="p-4 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-2xl space-y-1">
                <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block">
                  Total Tagihan
                </span>
                <span className="text-2xl font-black text-indigo-600 dark:text-indigo-400">
                  {formatCurrency(order.totalAmount)}
                </span>
              </div>

              <div className="flex flex-wrap gap-2.5">
                <button
                  type="button"
                  onClick={handleManualCheckStatus}
                  disabled={isCheckingStatus}
                  className="px-4 py-2.5 rounded-xl bg-zinc-900 dark:bg-zinc-50 text-white dark:text-zinc-900 text-xs font-bold transition-all hover:bg-zinc-800 dark:hover:bg-zinc-200 flex items-center gap-2 cursor-pointer shadow-sm"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isCheckingStatus ? "animate-spin" : ""}`} />
                  <span>Cek Status Pembayaran</span>
                </button>

                <button
                  type="button"
                  onClick={handleSimulatePayment}
                  disabled={isSimulating}
                  className="px-3.5 py-2.5 rounded-xl border border-emerald-300 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 text-xs font-bold transition-all hover:bg-emerald-100 dark:hover:bg-emerald-900/60 flex items-center gap-1.5 cursor-pointer shadow-sm"
                  title="Simulasi QRIS Berhasil (Sandbox Testing)"
                >
                  <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Simulasi Bayar (Testing)</span>
                </button>
              </div>
            </div>

            {/* Right QRIS Display */}
            <div className="md:col-span-5 flex flex-col items-center justify-center p-6 border-2 border-dashed border-indigo-200 dark:border-indigo-900/60 rounded-3xl bg-indigo-50/30 dark:bg-indigo-950/10 space-y-3 text-center">
              {isCreatingQris ? (
                <div className="py-12 flex flex-col items-center gap-2">
                  <Spinner className="w-8 h-8 text-indigo-600" />
                  <span className="text-xs text-zinc-400">Menghasilkan QRIS...</span>
                </div>
              ) : qrisData?.qrUrl ? (
                <div className="p-3 bg-white rounded-2xl shadow-md border border-zinc-200">
                  <img
                    src={qrisData.qrUrl}
                    alt="Midtrans QRIS Code"
                    className="w-48 h-48 object-contain rounded-xl"
                  />
                </div>
              ) : (
                <div className="p-4 bg-white rounded-2xl shadow-md border border-zinc-200 flex items-center justify-center">
                  <QrCode className="w-40 h-40 text-zinc-850" />
                </div>
              )}

              <div className="space-y-0.5">
                <span className="text-xs font-bold text-zinc-800 dark:text-zinc-200 block">
                  QRIS Standar Pembayaran Nasional
                </span>
                <span className="text-[10px] text-zinc-400 block">
                  Planet Cinema Payment Gateway
                </span>
              </div>
            </div>
          </div>
        ) : (
          <div className="p-6 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 rounded-3xl flex items-center gap-4 text-emerald-800 dark:text-emerald-200">
            <CheckCircle2 className="w-8 h-8 text-emerald-600 shrink-0" />
            <div className="space-y-0.5">
              <h3 className="text-sm font-bold">Pembayaran Telah Dikonfirmasi</h3>
              <p className="text-xs text-emerald-700 dark:text-emerald-300">
                Tiket resmi Anda sudah aktif. Tunjukkan kode QR tiket di bawah kepada petugas saat memasuki studio.
              </p>
            </div>
          </div>
        )}

        {/* Booking & Movie Summary Card */}
        <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl p-6 sm:p-8 space-y-6 shadow-sm">
          <h2 className="text-base font-bold text-zinc-900 dark:text-zinc-50">
            Rincian Pemesanan
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 text-xs">
            <div className="space-y-1">
              <span className="text-zinc-400 block font-medium">Judul Film</span>
              <span className="font-bold text-zinc-900 dark:text-zinc-50 text-sm">
                {schedule?.movie?.title || "Film Planet Cinema"}
              </span>
            </div>

            <div className="space-y-1">
              <span className="text-zinc-400 block font-medium">Studio & Jadwal</span>
              <span className="font-bold text-zinc-900 dark:text-zinc-50">
                {schedule?.studio?.name} • {schedule?.startTime ? new Date(schedule.startTime).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "-"}
              </span>
              <span className="text-[11px] text-zinc-500 block">
                {schedule?.businessDate ? formatDate(schedule.businessDate) : "-"}
              </span>
            </div>

            <div className="space-y-1">
              <span className="text-zinc-400 block font-medium">Kursi Terpilih</span>
              <div className="flex gap-1.5 flex-wrap mt-0.5">
                {tickets.map((t) => (
                  <span
                    key={t.id}
                    className="px-2.5 py-1 bg-indigo-50 dark:bg-indigo-950/50 border border-indigo-200 dark:border-indigo-800 text-indigo-700 dark:text-indigo-300 rounded-lg font-black text-xs"
                  >
                    {t.showtimeSeat?.seat?.seatLabel || "-"}
                  </span>
                ))}
              </div>
            </div>

            <div className="space-y-1">
              <span className="text-zinc-400 block font-medium">Nama Pemesan</span>
              <span className="font-bold text-zinc-900 dark:text-zinc-50">
                {order.customerName}
              </span>
              <span className="text-[11px] text-zinc-500 block">
                {order.customerPhone}
              </span>
            </div>
          </div>

          {/* Detailed Price Breakdown */}
          {(() => {
            const rawSubtotal = (schedule as any)?.ticketPrice ? (schedule as any).ticketPrice * tickets.length : 0;
            const serviceFeeVal = order.totalAmount > rawSubtotal && rawSubtotal > 0
              ? order.totalAmount - rawSubtotal
              : (order.totalAmount > 0 && tickets.length > 0 && order.totalAmount > 4000 && (order.totalAmount - 4000) % tickets.length === 0 ? 4000 : 0);
            
            const ticketSubtotalVal = order.totalAmount - serviceFeeVal;
            const ticketPriceVal = tickets.length > 0 ? Math.floor(ticketSubtotalVal / tickets.length) : (schedule as any)?.ticketPrice || 0;

            return (
              <div className="pt-4 border-t border-zinc-150 dark:border-zinc-800 space-y-2 text-xs">
                <div className="flex justify-between text-zinc-600 dark:text-zinc-400">
                  <span>
                    Kursi ({tickets.length}x{ticketPriceVal > 0 ? ` @ ${formatCurrency(ticketPriceVal)}` : ""})
                  </span>
                  <span className="font-semibold text-zinc-900 dark:text-zinc-100">
                    {formatCurrency(ticketSubtotalVal)}
                  </span>
                </div>
                {serviceFeeVal > 0 && (
                  <div className="flex justify-between text-zinc-600 dark:text-zinc-400">
                    <span>Biaya Layanan</span>
                    <span className="font-semibold text-zinc-900 dark:text-zinc-100">
                      {formatCurrency(serviceFeeVal)}
                    </span>
                  </div>
                )}
                <div className="flex justify-between border-t border-zinc-150 dark:border-zinc-800 pt-2 text-sm font-bold text-zinc-900 dark:text-zinc-50">
                  <span>Total Pembayaran</span>
                  <span className="text-indigo-600 dark:text-indigo-400 font-black">
                    {formatCurrency(order.totalAmount)}
                  </span>
                </div>
              </div>
            );
          })()}
        </div>

        {/* Digital Tickets section (When PAID) */}
        {isApproved && tickets.length > 0 && (
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl p-6 sm:p-8 space-y-6 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-base font-bold text-zinc-900 dark:text-zinc-50 flex items-center gap-2">
                  <Ticket className="w-5 h-5 text-indigo-600" />
                  <span>E-Ticket Resmi</span>
                </h2>
                <p className="text-xs text-zinc-400">Scan QR code tiket ini di pintu masuk teater.</p>
              </div>

              <span className="px-3 py-1 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 text-xs font-bold border border-emerald-200 dark:border-emerald-800">
                {tickets.length} Tiket Aktif
              </span>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              {tickets.map((t) => (
                <div
                  key={t.id}
                  className="p-5 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-2xl flex items-center justify-between gap-4"
                >
                  <div className="space-y-1.5">
                    <span className="px-2 py-0.5 rounded bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 text-[10px] font-extrabold uppercase">
                      {schedule?.studio?.name}
                    </span>
                    <h3 className="text-lg font-black text-zinc-900 dark:text-zinc-50">
                      Kursi {t.showtimeSeat?.seat?.seatLabel || "-"}
                    </h3>
                    <p className="text-[11px] text-zinc-400 font-mono">
                      No: {t.ticketNumber}
                    </p>
                  </div>

                  <div className="w-20 h-20 bg-white p-1.5 rounded-xl border border-zinc-200 flex items-center justify-center shrink-0">
                    <QrCode className="w-full h-full text-zinc-900" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="flex flex-wrap items-center justify-between gap-4 pt-2 text-xs">
          <Link
            href="/"
            className="px-4 py-2 rounded-xl bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 text-zinc-700 dark:text-zinc-300 font-semibold transition-colors"
          >
            Kembali ke Beranda
          </Link>
          <Link
            href={`/bookings/lookup?query=${order.bookingNumber}`}
            className="text-indigo-600 dark:text-indigo-400 hover:underline font-semibold"
          >
            Cari / Lacak Tiket Lainnya →
          </Link>
        </div>
      </main>
    </div>
  );
}
