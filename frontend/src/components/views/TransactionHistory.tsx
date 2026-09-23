"use client";

import React, { useState } from "react";
import { useGetOrdersQuery, Order } from "@/services/orderApi";
import { useGetUsersQuery } from "@/services/userApi";
import { DataTable } from "@/components/ui/data-table";
import { Input, Select } from "@/components/ui/form-controls";
import { DateTimePicker } from "@/components/ui/DateTimePicker";
import { useTranslation } from "@/lib/i18n";
import { useAppSelector } from "@/store/hooks";

export default function TransactionHistory() {
  const { t, formatDate, formatCurrency } = useTranslation();
  const user = useAppSelector((state) => state.auth.user);
  const isCashier = Boolean(
    user?.role?.toUpperCase().includes("CASHIER") ||
    user?.username?.toLowerCase().includes("kasir") ||
    user?.username?.toLowerCase().includes("cashier")
  );

  const [searchQuery, setSearchQuery] = useState("");
  const [cashierFilter, setCashierFilter] = useState("");
  const [channelFilter, setChannelFilter] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  const { data: ordersResponse, isLoading } = useGetOrdersQuery({
    search: searchQuery || undefined,
    cashierId: isCashier ? user?.id : (cashierFilter || undefined),
    channel: isCashier ? "POS" : (channelFilter || undefined),
    startDate: startDate || undefined,
    endDate: endDate || undefined,
  });

  const { data: usersResponse } = useGetUsersQuery();

  const cashierOptions = [
    { value: "", label: t("transactions.allCashiers") },
    ...(usersResponse?.data?.map((u) => ({ value: u.id, label: u.name })) || []),
  ];

  const channelOptions = [
    { value: "", label: "Semua Sumber (POS & Online)" },
    { value: "POS", label: "POS / Loket Kasir" },
    { value: "ONLINE", label: "Mobile / Online Booking" },
  ];

  const tableColumns = [
    { key: "orderNumber", header: t("transactions.order") },
    ...(!isCashier
      ? [
          {
            key: "channel",
            header: "Sumber",
            render: (o: Order) => {
              const isOnline = o.channel === "ONLINE" || Boolean(o.bookingNumber && !o.cashierId);
              return (
                <span
                  className={`px-2 py-0.5 rounded-full text-[10px] font-bold tracking-wider ${
                    isOnline
                      ? "bg-sky-50 text-sky-600 dark:bg-sky-950/40 dark:text-sky-400"
                      : "bg-indigo-50 text-indigo-600 dark:bg-indigo-950/40 dark:text-indigo-400"
                  }`}
                >
                  {isOnline ? "📱 ONLINE" : "🖥️ POS"}
                </span>
              );
            },
          },
        ]
      : []),
    {
      key: "movie",
      header: t("transactions.movie"),
      render: (o: Order) => o.schedule?.movie?.title || "-",
    },
    {
      key: "time",
      header: t("transactions.showtime"),
      render: (o: Order) => {
        if (!o.schedule) return "-";
        const time = new Date(o.schedule.startTime).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", hour12: false });
        const date = formatDate(o.schedule.businessDate);
        return `${date} @ ${time}`;
      },
    },
    {
      key: "seats",
      header: t("transactions.seats"),
      render: (o: Order) => (
        <div className="flex flex-wrap gap-1 max-w-[120px]">
          {o.tickets.map((t) => (
            <span key={t.id} className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${t.status === "CANCELLED" ? "bg-rose-100 text-rose-600 line-through" : "bg-zinc-100 dark:bg-zinc-800"}`}>
              {t.showtimeSeat?.seat?.seatLabel || "-"}
            </span>
          ))}
        </div>
      ),
    },
    { key: "totalAmount", header: t("transactions.total"), render: (o: Order) => formatCurrency(o.totalAmount) },
    { key: "paymentMethod", header: t("transactions.method"), render: (o: Order) => o.paymentMethod },
    {
      key: "paymentStatus",
      header: t("transactions.status"),
      render: (o: Order) => (
        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
          o.orderStatus === "CANCELLED"
            ? "bg-rose-50 text-rose-600 dark:bg-rose-950/40"
            : o.orderStatus === "REFUNDED"
            ? "bg-amber-50 text-amber-600 dark:bg-amber-950/40"
            : "bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400"
        }`}>
          {o.orderStatus}
        </span>
      ),
    },
    ...(!isCashier
      ? [
          {
            key: "cashier",
            header: t("transactions.cashier"),
            render: (o: Order) => o.cashier?.name || (o.customerName ? `Pelanggan: ${o.customerName}` : "Online Guest"),
          },
        ]
      : []),
  ];

  return (
    <div className="space-y-8 font-sans">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
          {isCashier ? "Transaksi Kasir Saya" : t("transactions.title")}
        </h1>
        <p className="text-zinc-500 dark:text-zinc-400 mt-1">
          {isCashier
            ? "Daftar seluruh transaksi penjualan loket yang Anda proses secara langsung."
            : t("transactions.subtitle")}
        </p>
      </div>

      {/* Filter Toolbar */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 p-6 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl">
        {!isCashier ? (
          <>
            <Select
              label={t("transactions.cashier")}
              options={cashierOptions}
              value={cashierFilter}
              onChange={(e) => setCashierFilter(e.target.value)}
            />
            <Select
              label="Sumber Transaksi"
              options={channelOptions}
              value={channelFilter}
              onChange={(e) => setChannelFilter(e.target.value)}
            />
          </>
        ) : (
          <div className="flex flex-col justify-center bg-indigo-50/50 dark:bg-indigo-950/20 border border-indigo-100 dark:border-indigo-900/30 rounded-2xl px-4 py-2">
            <span className="text-[11px] font-semibold text-indigo-500 uppercase tracking-wider">Kasir Aktif</span>
            <span className="text-sm font-bold text-indigo-950 dark:text-indigo-200">{user?.name || "Kasir"}</span>
          </div>
        )}
        <DateTimePicker
          mode="date"
          label={t("transactions.startDate")}
          value={startDate}
          onChange={(val) => setStartDate(val || "")}
        />
        <DateTimePicker
          mode="date"
          label={t("transactions.endDate")}
          value={endDate}
          onChange={(val) => setEndDate(val || "")}
        />
        <Input
          label={t("transactions.searchOrder")}
          placeholder={t("transactions.searchPlaceholder")}
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </div>

      {/* Table */}
      <div className="p-6 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl shadow-sm">
        <DataTable columns={tableColumns} data={ordersResponse?.data || []} isLoading={isLoading} />
      </div>
    </div>
  );
}
