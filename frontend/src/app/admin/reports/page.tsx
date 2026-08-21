"use client";

import React, { useState } from "react";
import { useGetReportsQuery } from "@/services/opsApi";
import { Spinner } from "@/components/ui/spinner";
import { BarChart, DollarSign, Calendar, User, Film, Clock } from "lucide-react";
import { useTranslation } from "@/lib/i18n";

export default function ReportsDashboard() {
  const { data: reports, isLoading } = useGetReportsQuery();
  const [activeTab, setActiveTab] = useState<"daily" | "cashier" | "movie" | "schedule">("daily");
  const { t, formatCurrency, formatNumber, formatDate } = useTranslation();

  if (isLoading) {
    return (
      <div className="flex justify-center py-24">
        <Spinner className="w-12 h-12" />
      </div>
    );
  }

  const tabs = [
    { id: "daily", label: t("reports.daily"), icon: <Calendar className="w-4 h-4" /> },
    { id: "cashier", label: t("reports.cashier"), icon: <User className="w-4 h-4" /> },
    { id: "movie", label: t("reports.movie"), icon: <Film className="w-4 h-4" /> },
    { id: "schedule", label: t("reports.schedule"), icon: <Clock className="w-4 h-4" /> },
  ];

  return (
    <div className="space-y-8 font-sans">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50 flex items-center gap-2">
          {t("reports.title")}
        </h1>
        <p className="text-zinc-500 dark:text-zinc-400 mt-1">
          {t("reports.subtitle")}
        </p>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-zinc-200 dark:border-zinc-800 gap-4">
        {tabs.map((t) => (
          <button
            key={t.id}
            onClick={() => setActiveTab(t.id as any)}
            className={`flex items-center gap-2 pb-3 text-sm font-semibold border-b-2 transition-all cursor-pointer ${
              activeTab === t.id
                ? "border-indigo-600 text-indigo-600 dark:text-indigo-400"
                : "border-transparent text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300"
            }`}
          >
            {t.icon}
            {t.label}
          </button>
        ))}
      </div>

      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl overflow-hidden shadow-sm">
        {activeTab === "daily" && (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="bg-zinc-50 dark:bg-zinc-950 border-b border-zinc-200 dark:border-zinc-850 text-zinc-400 uppercase tracking-wider text-[10px] font-bold">
                  <th className="px-6 py-4">{t("reports.date")}</th><th className="px-6 py-4">{t("reports.ticketCount")}</th><th className="px-6 py-4">{t("reports.cashSales")}</th><th className="px-6 py-4">{t("reports.qrisSales")}</th><th className="px-6 py-4">{t("reports.refunds")}</th><th className="px-6 py-4 text-right">{t("reports.netRevenue")}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-150 dark:divide-zinc-850">
                {reports?.dailySales?.map((r, i) => (
                  <tr key={i} className="hover:bg-zinc-50 dark:hover:bg-zinc-950/50">
                    <td className="px-6 py-4 font-bold text-zinc-900 dark:text-zinc-50">{r.date}</td>
                    <td className="px-6 py-4">{formatNumber(r.ticketCount)} {t("reports.tickets")}</td><td className="px-6 py-4 text-zinc-600 dark:text-zinc-400">{formatCurrency(r.cash)}</td><td className="px-6 py-4 text-zinc-600 dark:text-zinc-400">{formatCurrency(r.qris)}</td><td className="px-6 py-4 text-rose-500">{formatCurrency(r.refund)}</td><td className="px-6 py-4 font-bold text-emerald-600 text-right">{formatCurrency(r.revenue)}</td>
                  </tr>
                ))}
                {(!reports?.dailySales || reports.dailySales.length === 0) && (
                  <tr>
                    <td colSpan={6} className="text-center py-8 text-zinc-400 italic">{t("reports.noSales")}</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}

        {activeTab === "cashier" && (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="bg-zinc-50 dark:bg-zinc-950 border-b border-zinc-200 dark:border-zinc-850 text-zinc-400 uppercase tracking-wider text-[10px] font-bold">
                  <th className="px-6 py-4">Cashier Name</th>
                  <th className="px-6 py-4">Tickets Issued</th>
                  <th className="px-6 py-4 text-right">Generated Revenue</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-150 dark:divide-zinc-850">
                {reports?.cashierReport?.map((r, i) => (
                  <tr key={i} className="hover:bg-zinc-50 dark:hover:bg-zinc-950/50">
                    <td className="px-6 py-4 font-bold text-zinc-900 dark:text-zinc-50">{r.cashierName}</td>
                    <td className="px-6 py-4">{r.ticketsSold} tickets</td>
                    <td className="px-6 py-4 font-bold text-indigo-600 text-right">Rp {r.revenue.toLocaleString()}</td>
                  </tr>
                ))}
                {(!reports?.cashierReport || reports.cashierReport.length === 0) && (
                  <tr>
                    <td colSpan={3} className="text-center py-8 text-zinc-400 italic">No cashier sessions logged.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}

        {activeTab === "movie" && (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="bg-zinc-50 dark:bg-zinc-950 border-b border-zinc-200 dark:border-zinc-850 text-zinc-400 uppercase tracking-wider text-[10px] font-bold">
                  <th className="px-6 py-4">Movie Title</th>
                  <th className="px-6 py-4 text-right">Tickets Sold</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-150 dark:divide-zinc-850">
                {reports?.movieReport?.map((r, i) => (
                  <tr key={i} className="hover:bg-zinc-50 dark:hover:bg-zinc-950/50">
                    <td className="px-6 py-4 font-bold text-zinc-900 dark:text-zinc-50">{r.movieTitle}</td>
                    <td className="px-6 py-4 font-bold text-zinc-800 dark:text-zinc-250 text-right">{r.ticketsSold} tickets</td>
                  </tr>
                ))}
                {(!reports?.movieReport || reports.movieReport.length === 0) && (
                  <tr>
                    <td colSpan={2} className="text-center py-8 text-zinc-400 italic">No movie tickets sold.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}

        {activeTab === "schedule" && (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="bg-zinc-50 dark:bg-zinc-950 border-b border-zinc-200 dark:border-zinc-850 text-zinc-400 uppercase tracking-wider text-[10px] font-bold">
                  <th className="px-6 py-4">Schedule</th>
                  <th className="px-6 py-4">Movie</th>
                  <th className="px-6 py-4">Studio</th>
                  <th className="px-6 py-4 text-right">Seats Occupied</th>
                  <th className="px-6 py-4 text-right">Revenue</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-150 dark:divide-zinc-850">
                {reports?.scheduleReport?.map((r, i) => (
                  <tr key={i} className="hover:bg-zinc-50 dark:hover:bg-zinc-950/50">
                    <td className="px-6 py-4 font-semibold text-zinc-500">
                      {r.startTime ? new Date(r.startTime).toLocaleString([], { dateStyle: "short", timeStyle: "short" }) : "-"}
                    </td>
                    <td className="px-6 py-4 font-bold text-zinc-900 dark:text-zinc-50">{r.movieTitle}</td>
                    <td className="px-6 py-4">{r.studioCode}</td>
                    <td className="px-6 py-4 text-right">{r.seatsSold} seats</td>
                    <td className="px-6 py-4 font-bold text-emerald-600 text-right">Rp {r.revenue.toLocaleString()}</td>
                  </tr>
                ))}
                {(!reports?.scheduleReport || reports.scheduleReport.length === 0) && (
                  <tr>
                    <td colSpan={5} className="text-center py-8 text-zinc-400 italic">No schedule logs found.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
