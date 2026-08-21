"use client";

import React from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { useGetOrdersQuery } from "@/services/orderApi";
import { Spinner } from "@/components/ui/spinner";
import { CheckCircle2, Ticket, QrCode, Printer, HelpCircle, PhoneCall, Copy, Check } from "lucide-react";
import Link from "next/link";

export default function BookingSuccess() {
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();

  // We can pass orderId via search parameters or path ID
  const orderId = (params.id as string) || searchParams.get("orderId") || "";

  const { data: ordersResponse, isLoading } = useGetOrdersQuery({
    search: orderId || undefined,
  });

  const order = ordersResponse?.data?.find((o) => o.id === orderId);

  const [copied, setCopied] = React.useState(false);

  const handleCopy = () => {
    if (!order?.bookingNumber) return;
    navigator.clipboard.writeText(order.bookingNumber);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-screen bg-zinc-50 dark:bg-zinc-950">
        <Spinner className="w-12 h-12" />
      </div>
    );
  }

  if (!order) {
    return (
      <div className="text-center py-20 bg-zinc-50 dark:bg-zinc-950 min-h-screen">
        <h2 className="text-xl font-bold">Booking not found</h2>
        <Link href="/" className="text-indigo-600 hover:underline mt-2 inline-block">Back to home</Link>
      </div>
    );
  }

  const isApproved = order.orderStatus === "PAID";

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 font-sans pb-16">
      {/* Header */}
      <header className="sticky top-0 z-40 w-full bg-white/80 dark:bg-zinc-900/80 backdrop-blur-md border-b border-zinc-150 dark:border-zinc-800">
        <div className="max-w-3xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link href="/" className="text-lg font-black text-indigo-600 dark:text-indigo-400">
            🎬 Planet Cinema
          </Link>
          <span className="text-xs text-zinc-400">Booking Confirmation</span>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-6 mt-8 space-y-6">
        {/* Status Card */}
        <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl p-6 md:p-8 text-center space-y-4 shadow-sm">
          <div className="mx-auto w-12 h-12 bg-emerald-50 dark:bg-emerald-950/20 text-emerald-600 rounded-full flex items-center justify-center">
            <CheckCircle2 className="w-7 h-7" />
          </div>
          <div className="space-y-1">
            <h1 className="text-2xl font-black text-zinc-900 dark:text-zinc-50">Reservation Successful!</h1>
            <p className="text-xs text-zinc-500">Your seats are held. Complete the payment below.</p>
          </div>

          <div className="inline-flex items-center gap-2 px-4 py-2 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-850 rounded-2xl">
            <span className="text-xs font-bold text-zinc-400 uppercase tracking-wider">Booking ID:</span>
            <span className="text-sm font-black text-zinc-800 dark:text-zinc-100">{order.bookingNumber}</span>
            <button onClick={handleCopy} className="p-1 hover:bg-zinc-200 dark:hover:bg-zinc-800 rounded-lg">
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5 text-zinc-400" />}
            </button>
          </div>
        </div>

        {/* Dynamic Payment State */}
        {!isApproved ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl p-6 md:p-8 shadow-sm">
            {/* QRIS Instructions */}
            <div className="space-y-4">
              <h2 className="text-base font-bold text-zinc-900 dark:text-zinc-50">Scan QRIS to Pay</h2>
              <p className="text-xs text-zinc-500 leading-relaxed">
                Scan the QRIS code with your banking or e-wallet application. Transfer the exact amount shown below:
              </p>
              <div className="p-4 bg-zinc-50 dark:bg-zinc-950 border border-zinc-150 dark:border-zinc-850 rounded-2xl space-y-1">
                <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block">Amount Due</span>
                <span className="text-xl font-black text-indigo-600 dark:text-indigo-400">
                  Rp {order.totalAmount.toLocaleString()}
                </span>
              </div>
              <div className="p-3 bg-amber-50 dark:bg-amber-955/20 border border-amber-100 dark:border-amber-900 rounded-xl flex gap-2 text-[11px] text-amber-800 dark:text-amber-400 leading-relaxed">
                <HelpCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>Seats are held for 10 minutes. Once payment is scanned, our staff will approve and activate your ticket.</span>
              </div>
            </div>

            {/* QRIS Placeholder Image */}
            <div className="flex flex-col items-center justify-center p-4 border border-dashed border-zinc-200 dark:border-zinc-800 rounded-2xl bg-zinc-50 dark:bg-zinc-950/20 space-y-2">
              <div className="w-36 h-36 bg-white border border-zinc-200 rounded-xl flex items-center justify-center shadow-sm relative overflow-hidden">
                {/* Visual QR pattern simulated */}
                <QrCode className="w-28 h-28 text-zinc-800" />
              </div>
              <span className="text-[10px] font-bold text-zinc-400 tracking-wider uppercase">Planet Cinema QRIS Network</span>
            </div>
          </div>
        ) : (
          <div className="p-6 bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-150 dark:border-emerald-900/30 rounded-3xl flex gap-3 text-emerald-800 dark:text-emerald-300">
            <CheckCircle2 className="w-5 h-5 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <h4 className="text-xs font-bold uppercase tracking-wider">Payment Confirmed</h4>
              <p className="text-[11px] text-emerald-700/80 dark:text-emerald-400/80 leading-relaxed">
                Your tickets are fully paid and active! Show the QR code below at the cinema gates to enter the studio.
              </p>
            </div>
          </div>
        )}

        {/* Booking Details */}
        <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl p-6 md:p-8 space-y-6 shadow-sm">
          <h2 className="text-base font-bold text-zinc-900 dark:text-zinc-50">Booking details</h2>

          <div className="grid gap-4 md:grid-cols-2 text-xs">
            <div className="space-y-1">
              <span className="text-zinc-400 block">Movie Title</span>
              <span className="font-bold text-zinc-900 dark:text-zinc-50">{order.schedule?.movie?.title}</span>
            </div>
            <div className="space-y-1">
              <span className="text-zinc-400 block">Showtime & Studio</span>
              <span className="font-bold text-zinc-900 dark:text-zinc-50">
                {order.schedule && new Date(order.schedule.startTime).toLocaleString([], { dateStyle: "short", timeStyle: "short" })} ({order.schedule?.studio?.code})
              </span>
            </div>
            <div className="space-y-1">
              <span className="text-zinc-400 block">Seats Reserved</span>
              <div className="flex gap-1.5 flex-wrap mt-0.5">
                {order.tickets.map((t) => (
                  <span key={t.id} className="px-2 py-0.5 bg-zinc-100 dark:bg-zinc-850 rounded font-bold">
                    {t.showtimeSeat?.seat?.seatLabel || "-"}
                  </span>
                ))}
              </div>
            </div>
            <div className="space-y-1">
              <span className="text-zinc-400 block">Guest Customer</span>
              <span className="font-bold text-zinc-900 dark:text-zinc-50">{order.customerName} ({order.customerPhone})</span>
            </div>
          </div>
        </div>

        {/* Ticket bar / print buttons if PAID */}
        {isApproved && (
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl p-6 md:p-8 space-y-6 shadow-sm">
            <h2 className="text-base font-bold text-zinc-900 dark:text-zinc-50">Digital Entry Tickets</h2>
            <div className="grid gap-4 sm:grid-cols-2">
              {order.tickets.map((t) => (
                <div key={t.id} className="p-4 bg-zinc-50 dark:bg-zinc-950 border border-zinc-150 dark:border-zinc-850 rounded-2xl flex items-center justify-between gap-4">
                  <div className="space-y-1">
                    <span className="text-xs font-bold text-zinc-800 dark:text-zinc-200">Seat {t.showtimeSeat?.seat?.seatLabel || "-"}</span>
                    <p className="text-[10px] text-zinc-400">{t.ticketNumber}</p>
                  </div>
                  <div className="w-16 h-16 bg-white border border-zinc-200 rounded-lg flex items-center justify-center p-1">
                    <QrCode className="w-full h-full text-zinc-850" />
                  </div>
                </div>
              ))}
            </div>

            <div className="flex gap-3 justify-end border-t border-zinc-100 dark:border-zinc-800 pt-4">
              <Link
                href={`/admin/tickets/${order.id}/print`}
                target="_blank"
                className="px-4 py-2 border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-900 text-zinc-700 dark:text-zinc-300 rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer"
              >
                <Printer className="w-4 h-4" /> Print Tickets Receipt
              </Link>
            </div>
          </div>
        )}

        <div className="flex justify-between items-center text-xs">
          <Link href="/" className="text-indigo-600 hover:underline">Back to catalog</Link>
          <Link href="/bookings/lookup" className="text-zinc-400 hover:text-zinc-600">Lookup another booking</Link>
        </div>
      </main>
    </div>
  );
}
