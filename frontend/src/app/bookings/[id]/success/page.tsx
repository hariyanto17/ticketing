"use client";

import React, { useState, useEffect, useMemo } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { useLookupBookingQuery } from "@/services/bookingApi";
import {
  useCreateQrisPaymentMutation,
  useGetPaymentStatusQuery,
  useLazyGetPaymentStatusQuery,
  useSimulateQrisSuccessMutation,
} from "@/services/paymentApi";
import { Spinner } from "@/components/ui/spinner";
import { CheckCircle2, Copy, Check, ArrowLeft } from "lucide-react";
import Link from "next/link";
import { useTranslation } from "@/lib/i18n";
import { ThemeToggle } from "@/components/ui/ThemeToggle";
import { LanguageToggle } from "@/components/ui/LanguageToggle";
import { io } from "socket.io-client";
import { SOCKET_BASE_URL } from "@/lib/api/api";
import { useToast } from "@/components/ui/toast";
import { QrisPaymentPanel } from "@/components/booking-success/QrisPaymentPanel";
import { BookingReceiptSummary } from "@/components/booking-success/BookingReceiptSummary";
import { SuccessTicketList } from "@/components/booking-success/SuccessTicketList";

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
    return (
      lookupResponse?.find(
        (o) => o.id === orderId || o.orderNumber === orderId || o.bookingNumber === orderId
      ) ||
      lookupResponse?.[0] ||
      null
    );
  }, [lookupResponse, orderId]);

  // 2. Fetch Payment Status
  const {
    data: paymentStatusData,
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
            <span className="text-sm font-black text-indigo-600 dark:text-indigo-400">
              {order.bookingNumber}
            </span>
            <button
              onClick={handleCopy}
              className="p-1 hover:bg-zinc-200 dark:hover:bg-zinc-800 rounded-lg cursor-pointer transition-colors"
              title="Salin Booking ID"
            >
              {copied ? (
                <Check className="w-3.5 h-3.5 text-emerald-600" />
              ) : (
                <Copy className="w-3.5 h-3.5 text-zinc-400" />
              )}
            </button>
          </div>
        </div>

        {/* Dynamic Payment State: PENDING vs PAID */}
        {!isApproved ? (
          <QrisPaymentPanel
            remainingSeconds={remainingSeconds}
            formatCountdown={formatCountdown}
            totalAmount={order.totalAmount}
            formatCurrency={formatCurrency}
            handleManualCheckStatus={handleManualCheckStatus}
            isCheckingStatus={isCheckingStatus}
            handleSimulatePayment={handleSimulatePayment}
            isSimulating={isSimulating}
            isCreatingQris={isCreatingQris}
            qrisData={qrisData}
          />
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
        <BookingReceiptSummary
          order={order}
          schedule={schedule}
          tickets={tickets}
          formatDate={formatDate}
          formatCurrency={formatCurrency}
        />

        {/* Digital Tickets section (When PAID) */}
        {isApproved && tickets.length > 0 && (
          <SuccessTicketList tickets={tickets} studioName={schedule?.studio?.name} />
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
