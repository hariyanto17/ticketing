"use client";

import React, { useState } from "react";
import { useLazyLookupBookingQuery } from "@/services/bookingApi";
import { Spinner } from "@/components/ui/spinner";
import { ArrowLeft, Search, Ticket, Calendar, QrCode, Printer, HelpCircle } from "lucide-react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useTranslation } from "@/lib/i18n";

export default function BookingLookup() {
  const router = useRouter();
  const [queryVal, setQueryVal] = useState("");
  const [trigger, { data: results, isLoading, isError }] = useLazyLookupBookingQuery();
  const { t, formatDate, formatCurrency } = useTranslation();

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!queryVal.trim()) return;
    trigger(queryVal.trim());
  };

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 font-sans pb-16">
      {/* Header */}
      <header className="sticky top-0 z-40 w-full bg-white/80 dark:bg-zinc-900/80 backdrop-blur-md border-b border-zinc-150 dark:border-zinc-800">
        <div className="max-w-3xl mx-auto px-6 h-16 flex items-center gap-4">
          <button onClick={() => router.push("/")} className="p-2 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-xl cursor-pointer">
            <ArrowLeft className="w-5 h-5 text-zinc-600 dark:text-zinc-400" />
          </button>
          <span className="font-bold text-zinc-850 dark:text-zinc-200">{t("booking.lookupTitle")}</span>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-6 mt-8 space-y-6">
        {/* Search Card */}
        <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-850 rounded-3xl p-6 md:p-8 space-y-4 shadow-sm">
          <h1 className="text-xl font-bold text-zinc-900 dark:text-zinc-50">{t("booking.retrieveDetails")}</h1>
          <p className="text-xs text-zinc-400">{t("booking.bookingHelp")}</p>

          <form onSubmit={handleSearch} className="flex gap-3">
            <input
              type="text"
              placeholder="e.g. BOOK-20260806-00001 or Phone number"
              value={queryVal}
              onChange={(e) => setQueryVal(e.target.value)}
              className="flex-1 px-4 py-2.5 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
              required
            />
            <button
              type="submit"
              disabled={isLoading}
              className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:bg-zinc-300 text-white font-bold rounded-xl text-xs flex items-center gap-1.5 cursor-pointer"
            >
              {isLoading ? <Spinner className="w-4 h-4" /> : <><Search className="w-4 h-4" /> {t("booking.search")}</>}
            </button>
          </form>
        </div>

        {/* Results List */}
        {results && (
          <div className="space-y-6">
            {results.map((order) => {
              const isApproved = order.orderStatus === "PAID";
              return (
                <div
                  key={order.id}
                  className="bg-white dark:bg-zinc-900 border border-zinc-250 dark:border-zinc-800 rounded-3xl p-6 md:p-8 space-y-6 shadow-sm"
                >
                  <div className="flex justify-between items-start border-b border-zinc-100 dark:border-zinc-800 pb-4">
                    <div>
                      <span className="text-[10px] font-bold text-zinc-400 uppercase block">{t("booking.bookingNumber")}</span>
                      <h2 className="text-lg font-black text-zinc-900 dark:text-zinc-50">{order.bookingNumber}</h2>
                    </div>

                    <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                      order.orderStatus === "PENDING"
                        ? "bg-amber-50 text-amber-600"
                        : order.orderStatus === "CANCELLED"
                        ? "bg-rose-50 text-rose-600"
                        : "bg-emerald-50 text-emerald-600"
                    }`}>
                      {order.orderStatus}
                    </span>
                  </div>

                  <div className="grid gap-4 sm:grid-cols-2 text-xs">
                    <div>
                      <span className="text-zinc-400 block mb-0.5">{t("booking.movieTitle")}</span>
                      <span className="font-bold text-zinc-900 dark:text-zinc-50">{order.schedule?.movie?.title}</span>
                    </div>
                    <div>
                      <span className="text-zinc-400 block mb-0.5">{t("booking.showtimeStudio")}</span>
                      <span className="font-bold text-zinc-900 dark:text-zinc-50">
                        {order.schedule && formatDate(order.schedule.startTime, { dateStyle: "medium", timeStyle: "short" })} ({order.schedule?.studio?.code})
                      </span>
                    </div>
                    <div>
                      <span className="text-zinc-400 block mb-0.5">{t("booking.seatsReserved")}</span>
                      <div className="flex gap-1.5 flex-wrap mt-0.5">
                        {order.tickets.map((t) => (
                          <span key={t.id} className="px-2 py-0.5 bg-zinc-50 dark:bg-zinc-850 rounded font-bold border border-zinc-150 dark:border-zinc-800">
                            {t.showtimeSeat?.seat?.seatLabel || "-"}
                          </span>
                        ))}
                      </div>
                    </div>
                    <div>
                      <span className="text-zinc-400 block mb-0.5">{t("booking.totalPaid")}</span>
                      <span className="font-extrabold text-indigo-600 dark:text-indigo-400">{formatCurrency(order.totalAmount)}</span>
                    </div>
                  </div>

                  {isApproved ? (
                    <div className="border-t border-zinc-100 dark:border-zinc-800 pt-4 flex flex-wrap gap-4 items-center justify-between">
                      <div className="flex gap-2">
                        {order.tickets.map((t) => (
                          <div key={t.id} className="p-2 border border-zinc-150 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 rounded-xl flex items-center gap-2">
                            <span className="text-[10px] font-bold text-zinc-700 dark:text-zinc-350">{t.showtimeSeat?.seat?.seatLabel}</span>
                            <QrCode className="w-5 h-5 text-zinc-600" />
                          </div>
                        ))}
                      </div>

                      <Link
                        href={`/admin/tickets/${order.id}/print`}
                        target="_blank"
                        className="px-4 py-2 border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-900 text-zinc-700 dark:text-zinc-300 rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer"
                      >
                        <Printer className="w-4 h-4" /> Print Tickets Receipt
                      </Link>
                    </div>
                  ) : order.orderStatus === "PENDING" ? (
                    <div className="p-4 bg-amber-50 dark:bg-amber-955/20 border border-amber-100 dark:border-amber-900 rounded-2xl flex gap-3 text-amber-800 dark:text-amber-400 leading-relaxed text-xs">
                      <HelpCircle className="w-5 h-5 shrink-0 mt-0.5" />
                      <div>
                        <span className="font-bold block mb-0.5">{t("booking.pendingConfirmation")}</span>
                        {t("booking.transferInstruction")} <strong className="text-indigo-600">{formatCurrency(order.totalAmount)}</strong>
                        <button
                          onClick={() => router.push(`/bookings/success?orderId=${order.id}`)}
                          className="text-indigo-600 hover:underline font-bold block mt-1 cursor-pointer"
                        >
                          {t("booking.viewPayment")}
                        </button>
                      </div>
                    </div>
                  ) : null}
                </div>
              );
            })}
            {results.length === 0 && (
              <p className="text-center text-zinc-400 italic py-12">{t("booking.noBookings")}</p>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
