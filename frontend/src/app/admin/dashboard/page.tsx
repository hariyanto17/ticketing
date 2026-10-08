"use client";

import React from "react";
import Link from "next/link";
import { useGetSettingsQuery, useGetReportsQuery, useGetDrawersHistoryQuery } from "@/services/opsApi";
import { DollarSign, Ticket, Calendar, ShieldCheck, Armchair, HelpCircle, TrendingUp } from "lucide-react";
import { Spinner } from "@/components/ui/spinner";
import { useTranslation } from "@/lib/i18n";


export default function DashboardHome() {
  const { t, formatDate, formatNumber, formatCurrency } = useTranslation();
  const { data: settings, isLoading: settingsLoading } = useGetSettingsQuery();
  const { data: reports, isLoading: reportsLoading } = useGetReportsQuery();
  const { data: drawers, isLoading: drawersLoading } = useGetDrawersHistoryQuery();

  const businessDate = settings?.businessDate || new Date().toISOString().split("T")[0];

  // 1. Open Cash Drawers
  const openDrawersCount = drawers?.filter((d) => d.status === "OPEN").length || 0;

  // 2. Today's Revenue
  const todayRevenue = reports?.dailySales?.find((s) => s.date === businessDate)?.revenue || 0;

  // 3. Today's Tickets Sold
  const todayTickets = reports?.dailySales?.find((s) => s.date === businessDate)?.ticketCount || 0;

  // 4. Refund Count (sum of refunds or count of cancelled tickets)
  const refundCount = reports?.dailySales?.reduce((sum, s) => sum + (s.refund > 0 ? 1 : 0), 0) || 0;

  const stats = [
    {
      title: t("dashboard.currentBusinessDate"),
      value: settingsLoading ? <Spinner className="w-5 h-5" /> : formatDate(businessDate),
      desc: `${t("dashboard.operationsCalendar")}: ${settings?.timezone || "UTC"}`,
      icon: <Calendar className="w-6 h-6 text-purple-500" />,
    },
    {
      title: t("dashboard.openCashDrawers"),
      value: drawersLoading ? <Spinner className="w-5 h-5" /> : `${openDrawersCount} ${t("dashboard.active")}`,
      desc: t("dashboard.cashierSessions"),
      icon: <ShieldCheck className="w-6 h-6 text-amber-500" />,
    },
    {
      title: t("dashboard.todaysRevenue"),
      value: reportsLoading ? <Spinner className="w-5 h-5" /> : formatCurrency(todayRevenue),
      desc: `${t("dashboard.totalCompletedSales")} ${businessDate}`,
      icon: <DollarSign className="w-6 h-6 text-emerald-500" />,
    },
    {
      title: t("dashboard.todaysTickets"),
      value: reportsLoading ? <Spinner className="w-5 h-5" /> : `${formatNumber(todayTickets)} ${t("dashboard.issued")}`,
      desc: t("dashboard.ticketActiveUsed"),
      icon: <Ticket className="w-6 h-6 text-indigo-500" />,
    },
    {
      title: t("dashboard.refundIncidents"),
      value: reportsLoading ? <Spinner className="w-5 h-5" /> : `${formatNumber(refundCount)} ${t("dashboard.refunds")}`,
      desc: t("dashboard.refundDescription"),
      icon: <Armchair className="w-6 h-6 text-rose-500" />,
    },
  ];

  return (
    <div className="space-y-8 font-sans">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
          {t("dashboard.title")}
        </h1>
        <p className="text-zinc-500 dark:text-zinc-400 mt-1">
          {t("dashboard.subtitle")}
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {stats.map((stat, i) => (
          <div
            key={i}
            className="p-6 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl shadow-sm hover:shadow-md transition-shadow flex items-start justify-between"
          >
            <div className="space-y-2">
              <span className="text-sm text-zinc-500 dark:text-zinc-400 font-medium">
                {stat.title}
              </span>
              <div className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">
                {stat.value}
              </div>
              <p className="text-xs text-zinc-400 leading-relaxed">{stat.desc}</p>
            </div>
            <div className="p-3 bg-zinc-50 dark:bg-zinc-800/50 rounded-2xl">
              {stat.icon}
            </div>
          </div>
        ))}
      </div>

      {/* Info Card & Movie Analytics Callout */}
      <div className="grid gap-6 md:grid-cols-2">
        <div className="p-7 bg-gradient-to-br from-indigo-600 to-indigo-800 text-white rounded-3xl shadow-md flex flex-col justify-between space-y-4">
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-indigo-200 text-xs font-bold uppercase tracking-wider">
              <TrendingUp className="w-4 h-4" />
              <span>{t("nav.movieAnalytics")}</span>
            </div>
            <h3 className="text-xl font-extrabold tracking-tight">
              {t("analytics.title")}
            </h3>
            <p className="text-xs text-indigo-100/90 leading-relaxed">
              {t("analytics.subtitle")}
            </p>
          </div>
          <div>
            <Link
              href="/admin/analytics"
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-white text-indigo-950 hover:bg-indigo-50 font-bold text-xs rounded-2xl shadow-xs transition-colors"
            >
              <span>Lihat Analitik 7 Hari</span>
              <TrendingUp className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>

        <div className="p-7 bg-indigo-50 dark:bg-indigo-950/20 border border-indigo-100 dark:border-indigo-950/30 rounded-3xl flex items-start gap-4">
          <HelpCircle className="w-6 h-6 text-indigo-600 dark:text-indigo-400 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <h3 className="font-semibold text-indigo-950 dark:text-indigo-300">
              {t("dashboard.operationsCenterLive")}
            </h3>
            <p className="text-xs text-indigo-700/80 dark:text-indigo-400/80 leading-relaxed">
              {t("dashboard.operationsCenterText")}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

