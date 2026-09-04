"use client";

import React, { useState } from "react";
import {
  useGetClosingSummaryQuery,
  useCreateClosingMutation,
  useGetClosingsHistoryQuery
} from "@/services/opsApi";
import { useToast } from "@/components/ui/toast";
import { Spinner } from "@/components/ui/spinner";
import { DateTimePicker } from "@/components/ui/DateTimePicker";
import { Calendar, DollarSign, Ticket, ShieldAlert, Sparkles, UserCheck } from "lucide-react";
import { useTranslation } from "@/lib/i18n";

export default function DailyClosingPage() {
  const { t, formatCurrency, formatNumber, formatDate } = useTranslation();
  const todayStr = new Date().toISOString().split("T")[0];
  const [selectedDate, setSelectedDate] = useState(todayStr);

  const { data: summary, isLoading: summaryLoading, refetch: refetchSummary } = useGetClosingSummaryQuery(selectedDate);
  const { data: history, isLoading: historyLoading, refetch: refetchHistory } = useGetClosingsHistoryQuery();
  const [createClosing, { isLoading: isClosing }] = useCreateClosingMutation();
  const { success: toastSuccess, error: toastError } = useToast();

  const handlePerformClosing = async () => {
    if (!window.confirm(t("closing.confirm"))) {
      return;
    }
    try {
      await createClosing({ businessDate: selectedDate }).unwrap();
      toastSuccess(t("closing.success"));
      refetchSummary();
      refetchHistory();
    } catch (err: any) {
      toastError(err?.data?.message || t("closing.failed"));
    }
  };

  return (
    <div className="space-y-8 font-sans">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50 flex items-center gap-2">
          {t("closing.title")}
        </h1>
        <p className="text-zinc-500 dark:text-zinc-400 mt-1">
          {t("closing.subtitle")}
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
        {/* Left Side: Summary & Action */}
        <div className="lg:col-span-2 space-y-6">
          <div className="p-6 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl space-y-6">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <h2 className="text-lg font-bold text-zinc-900 dark:text-zinc-50 flex items-center gap-2">
                <Calendar className="w-5 h-5 text-indigo-600" /> {t("closing.summary")}
              </h2>
              <DateTimePicker
                mode="date"
                value={selectedDate}
                onChange={(val) => val && setSelectedDate(val)}
                className="w-48"
              />
            </div>

            {summaryLoading ? (
              <div className="flex justify-center py-12"><Spinner className="w-8 h-8" /></div>
            ) : summary ? (
              <div className="space-y-6">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="p-4 bg-zinc-50 dark:bg-zinc-950 border border-zinc-150 dark:border-zinc-850 rounded-2xl flex items-center gap-3">
                    <div className="p-2.5 bg-indigo-50 dark:bg-indigo-950/20 text-indigo-600 dark:text-indigo-400 rounded-xl">
                      <DollarSign className="w-5 h-5" />
                    </div>
                    <div>
                      <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block">{t("closing.revenue")}</span>
                      <span className="text-base font-bold text-zinc-900 dark:text-zinc-50">{formatCurrency(summary.totalRevenue)}</span>
                    </div>
                  </div>

                  <div className="p-4 bg-zinc-50 dark:bg-zinc-950 border border-zinc-150 dark:border-zinc-850 rounded-2xl flex items-center gap-3">
                    <div className="p-2.5 bg-purple-50 dark:bg-purple-950/20 text-purple-600 dark:text-purple-400 rounded-xl">
                      <Ticket className="w-5 h-5" />
                    </div>
                    <div>
                      <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block">{t("closing.ticketsSold")}</span>
                      <span className="text-base font-bold text-zinc-900 dark:text-zinc-50">{formatNumber(summary.totalTicketsSold)}</span>
                    </div>
                  </div>
                </div>

                {/* Breakdown by Channel (POS Loket vs Online Mobile) */}
                <div className="grid gap-4 sm:grid-cols-2">
                  {/* POS Cashier Box */}
                  <div className="p-4 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-2xl space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400 flex items-center gap-1.5">
                        <span>🖥️</span> Penjualan Loket (POS)
                      </span>
                      <span className="text-xs font-bold text-zinc-500">
                        {formatNumber(summary.posTicketsSold || 0)} Tiket
                      </span>
                    </div>
                    <div className="text-xl font-black text-zinc-900 dark:text-zinc-50">
                      {formatCurrency(summary.posRevenue || 0)}
                    </div>
                    <div className="space-y-1.5 text-xs text-zinc-500 pt-1 border-t border-zinc-200/60 dark:border-zinc-800/60">
                      <div className="flex justify-between">
                        <span>Tunai (Cash Fisik):</span>
                        <span className="font-semibold text-zinc-800 dark:text-zinc-200">{formatCurrency(summary.posCashRevenue || 0)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>QRIS Loket:</span>
                        <span className="font-semibold text-zinc-800 dark:text-zinc-200">{formatCurrency(summary.posQrisRevenue || 0)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Total Transaksi Loket:</span>
                        <span className="font-semibold text-zinc-800 dark:text-zinc-200">{formatNumber(summary.posTransactions || 0)} invoice</span>
                      </div>
                    </div>
                  </div>

                  {/* Online Mobile Box */}
                  <div className="p-4 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-2xl space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold uppercase tracking-wider text-sky-600 dark:text-sky-400 flex items-center gap-1.5">
                        <span>📱</span> Penjualan Online (Mobile)
                      </span>
                      <span className="text-xs font-bold text-zinc-500">
                        {formatNumber(summary.onlineTicketsSold || 0)} Tiket
                      </span>
                    </div>
                    <div className="text-xl font-black text-zinc-900 dark:text-zinc-50">
                      {formatCurrency(summary.onlineRevenue || 0)}
                    </div>
                    <div className="space-y-1.5 text-xs text-zinc-500 pt-1 border-t border-zinc-200/60 dark:border-zinc-800/60">
                      <div className="flex justify-between">
                        <span>QRIS / Payment Gateway:</span>
                        <span className="font-semibold text-zinc-800 dark:text-zinc-200">{formatCurrency(summary.onlineQrisRevenue || summary.onlineRevenue || 0)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Total Booking Online:</span>
                        <span className="font-semibold text-zinc-800 dark:text-zinc-200">{formatNumber(summary.onlineTransactions || 0)} order</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Combined Total Recap */}
                <div className="p-5 border border-zinc-200 dark:border-zinc-800 rounded-2xl space-y-3 text-sm bg-zinc-50/50 dark:bg-zinc-900/40">
                  <div className="flex justify-between font-bold text-sm">
                    <span className="text-zinc-700 dark:text-zinc-300">Total Keseluruhan (POS + Online):</span>
                    <span className="text-indigo-600 dark:text-indigo-400">{formatCurrency(summary.totalRevenue)}</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-zinc-500">{t("closing.cashRevenue")} (Fisik Laci Kasir):</span>
                    <span className="font-bold text-zinc-800 dark:text-zinc-200">{formatCurrency(summary.cashRevenue)}</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-zinc-500">{t("closing.qrisRevenue")} (Gabungan Loket + Online):</span>
                    <span className="font-bold text-zinc-800 dark:text-zinc-200">{formatCurrency(summary.qrisRevenue)}</span>
                  </div>
                  <div className="flex justify-between border-t border-zinc-100 dark:border-zinc-800 pt-2.5 text-xs">
                    <span className="text-zinc-500">{t("closing.refunds")}:</span>
                    <span className="font-bold text-rose-500">{formatCurrency(summary.totalRefunds)}</span>
                  </div>
                  <div className="flex justify-between border-t border-zinc-100 dark:border-zinc-800 pt-2.5 text-xs">
                    <span className="text-zinc-500 font-semibold">{t("closing.transactions")}:</span>
                    <span className="font-bold text-zinc-900 dark:text-zinc-50">{formatNumber(summary.totalTransactions)} {t("closing.invoices")} ({formatNumber(summary.totalTicketsSold)} tiket)</span>
                  </div>
                </div>

                {summary.isAlreadyClosed ? (
                  <div className="p-4 bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-100 dark:border-emerald-950/30 rounded-2xl flex gap-3 text-emerald-800 dark:text-emerald-300">
                    <Sparkles className="w-5 h-5 shrink-0 mt-0.5" />
                    <div className="space-y-0.5">
                      <h4 className="text-xs font-bold uppercase tracking-wider">{t("closing.closed")}</h4>
                      <p className="text-[11px] text-emerald-700/80 dark:text-emerald-400/80 leading-relaxed">
                        {t("closing.closedText")}
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="p-4 bg-rose-50 dark:bg-rose-955/20 border border-rose-100 dark:border-rose-950/30 rounded-2xl flex gap-3 text-rose-800 dark:text-rose-400">
                      <ShieldAlert className="w-5 h-5 shrink-0 mt-0.5 text-rose-600" />
                      <div className="space-y-0.5">
                        <h4 className="text-xs font-bold uppercase tracking-wider">{t("closing.warning")}</h4>
                        <p className="text-[11px] text-rose-700/80 dark:text-rose-450/80 leading-relaxed">
                          {t("closing.warningText")}
                        </p>
                      </div>
                    </div>

                    <button
                      onClick={handlePerformClosing}
                      disabled={isClosing}
                      className="w-full py-3.5 bg-indigo-600 hover:bg-indigo-700 disabled:bg-zinc-300 text-white font-bold rounded-2xl transition-all cursor-pointer shadow-sm text-sm"
                    >
                      {isClosing ? <Spinner className="w-5 h-5 mx-auto" /> : t("closing.closeDay")}
                    </button>
                  </div>
                )}
              </div>
            ) : null}
          </div>
        </div>

        {/* Right Side: Closings History */}
        <div className="space-y-6">
          <div className="p-6 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl space-y-6">
            <h2 className="text-lg font-bold text-zinc-900 dark:text-zinc-50 flex items-center gap-2">
              <UserCheck className="w-5 h-5 text-indigo-600" /> {t("closing.history")}
            </h2>

            {historyLoading ? (
              <div className="flex justify-center py-6"><Spinner className="w-6 h-6" /></div>
            ) : (
              <div className="space-y-3 max-h-96 overflow-y-auto scrollbar-thin pr-1">
                {history?.map((h) => (
                  <div
                    key={h.id}
                    className="p-3.5 bg-zinc-50 dark:bg-zinc-950 border border-zinc-150 dark:border-zinc-850 rounded-2xl space-y-2 text-xs"
                  >
                    <div className="flex justify-between font-bold text-zinc-900 dark:text-zinc-50">
                      <span>{formatDate(h.businessDate, { dateStyle: "medium" })}</span>
                      <span className="text-indigo-600">{formatCurrency(h.totalRevenue)}</span>
                    </div>
                    <div className="text-[10px] text-zinc-400 space-y-1">
                      <div>{t("closing.auditedBy")}: {h.closedBy?.name || "System"}</div>
                      <div>{t("closing.closedAt")}: {formatDate(h.closedAt, { dateStyle: "short", timeStyle: "short" })}</div>
                    </div>
                  </div>
                ))}
                {(!history || history.length === 0) && (
                  <p className="text-xs text-zinc-400 italic text-center py-4">{t("closing.empty")}</p>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
