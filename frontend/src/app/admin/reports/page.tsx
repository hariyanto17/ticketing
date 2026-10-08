"use client";

import React, { useMemo, useState } from "react";
import { useGetOrdersQuery, Order } from "@/services/orderApi";
import { useGetUsersQuery } from "@/services/userApi";
import { Input, Select } from "@/components/ui/form-controls";
import { Pagination } from "@/components/ui/data-table";
import { DateTimePicker } from "@/components/ui/DateTimePicker";
import { Spinner } from "@/components/ui/spinner";
import { useTranslation } from "@/lib/i18n";
import { useAppSelector } from "@/store/hooks";
import { Download } from "lucide-react";
import { API_BASE_URL } from "@/lib/api/api";

export default function ReportsPage() {
  const { formatCurrency } = useTranslation();
  const user = useAppSelector((state) => state.auth.user);
  const userRoleStr = (typeof user?.role === "string" ? user.role : (user?.role as any)?.name || "").toUpperCase();
  const isCashier = Boolean(
    userRoleStr.includes("CASHIER") ||
      userRoleStr.includes("KASIR") ||
      user?.username?.toLowerCase().includes("kasir") ||
      user?.username?.toLowerCase().includes("cashier")
  );

  const [searchQuery, setSearchQuery] = useState("");
  const [cashierFilter, setCashierFilter] = useState("");
  const [channelFilter, setChannelFilter] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [isExporting, setIsExporting] = useState(false);
  const [exportError, setExportError] = useState("");

  const { data: ordersResponse, isLoading } = useGetOrdersQuery({
    page,
    limit: pageSize,
    search: searchQuery || undefined,
    cashierId: isCashier ? user?.id : cashierFilter || undefined,
    channel: isCashier ? "POS" : channelFilter || undefined,
    startDate: startDate || undefined,
    endDate: endDate || undefined,
  });

  const { data: usersResponse } = useGetUsersQuery();

  const users = usersResponse?.data ?? [];
  const cashiers = users.filter((userItem) => {
    const roleName = userItem.role?.name?.trim().toUpperCase() ?? "";
    return roleName === "CASHIER" || roleName === "KASIR" || roleName.includes("CASHIER") || roleName.includes("KASIR");
  });
  const cashierOptions = [
    { value: "", label: "Semua Kasir" },
    ...cashiers.map((userItem) => ({ value: userItem.id, label: userItem.name })),
  ];

  const channelOptions = [
    { value: "", label: "Semua Sumber" },
    { value: "POS", label: "POS / Loket" },
    { value: "ONLINE", label: "ONLINE / Mobile" },
  ];
  const pageSizeOptions = [10, 25, 50, 100, 200].map((size) => ({
    value: String(size),
    label: String(size),
  }));

  const exportExcel = async () => {
    setIsExporting(true);
    setExportError("");
    try {
      const params = new URLSearchParams();
      const effectiveCashierId = isCashier ? user?.id : cashierFilter;
      const effectiveChannel = isCashier ? "POS" : channelFilter;
      if (searchQuery) params.set("search", searchQuery);
      if (effectiveCashierId) params.set("cashierId", effectiveCashierId);
      if (effectiveChannel) params.set("channel", effectiveChannel);
      if (startDate) params.set("startDate", startDate);
      if (endDate) params.set("endDate", endDate);

      const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;
      const response = await fetch(`${API_BASE_URL}/reports/transaction-excel/export?${params.toString()}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        credentials: "include",
      });
      if (!response.ok) {
        const payload = await response.json().catch(() => null);
        throw new Error(payload?.message || "Gagal mengekspor laporan transaksi.");
      }
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `Transaction_Report_${startDate || new Date().toISOString().slice(0, 10)}.xlsx`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
    } catch (error) {
      setExportError(error instanceof Error ? error.message : "Gagal mengekspor laporan transaksi.");
    } finally {
      setIsExporting(false);
    }
  };

  const rows = useMemo(() => {
    return (ordersResponse?.data ?? []).map((order: Order) => {
      const activeTickets = (order.tickets ?? []).filter((ticket) => ticket.status !== "CANCELLED");
      const qty = activeTickets.length;
      const unitPrice = Number(order.schedule?.ticketPrice ?? activeTickets[0]?.price ?? 0);
      const subtotal = Number(order.subtotal ?? qty * unitPrice);
      const discount = Number(order.discountAmount ?? 0);
      const net = Number(order.totalAmount ?? Math.max(subtotal - discount, 0));
      const supplierDistributor = order.schedule?.movie?.distributor?.name || "-";
      const isCard = ["DEBIT_CARD", "CREDIT_CARD"].includes(String(order.paymentMethod).toUpperCase());
      const hasPromo = Boolean(order.promotionId || order.promotion || order.promoSnapshot);
      const hasFreePass = (order.tickets ?? []).some((ticket) => Boolean((ticket as any).isFree));

      return {
        id: order.id,
        createdBy: order.cashier?.name || order.customerName || "-",
        accountName: order.cashier?.username || order.customerName || "-",
        transactionDate: new Date(order.createdAt).toLocaleDateString("id-ID", { day: "2-digit", month: "2-digit", year: "numeric" }),
        theater: order.schedule?.studio?.code || "-",
        filmName: order.schedule?.movie?.title || "-",
        invoiceCode: order.orderNumber || "-",
        qty,
        price: unitPrice,
        subTotal: subtotal,
        disc: discount,
        subTotalAfterDisc: net,
        isCard,
        cardNumber: "",
        isPromo: hasPromo,
        freePass: hasFreePass ? "Ya" : "Tidak",
        supplierDistributor,
      };
    });
  }, [ordersResponse]);

  if (isLoading) {
    return (
      <div className="flex justify-center py-24">
        <Spinner className="w-12 h-12" />
      </div>
    );
  }

  return (
    <div className="space-y-8 font-sans">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">Transaction Report</h1>
        <p className="text-zinc-500 dark:text-zinc-400 mt-1">Transaction-level sales overview by cashier, movie, and supplier.</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 p-6 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl">
        {!isCashier ? (
          <>
            <Select
              label="Kasir"
              options={cashierOptions}
              value={cashierFilter}
              onChange={(e) => {
                setCashierFilter(e.target.value);
                setPage(1);
              }}
            />
            <Select
              label="Sumber Transaksi"
              options={channelOptions}
              value={channelFilter}
              onChange={(e) => {
                setChannelFilter(e.target.value);
                setPage(1);
              }}
            />
          </>
        ) : (
          <div className="flex flex-col justify-center bg-indigo-50/50 dark:bg-indigo-950/20 border border-indigo-100 dark:border-indigo-900/30 rounded-2xl px-4 py-2">
            <span className="text-[11px] font-semibold text-indigo-500 uppercase tracking-wider">Kasir Aktif</span>
            <span className="text-sm font-bold text-indigo-950 dark:text-indigo-200">{user?.name || "Kasir"}</span>
          </div>
        )}
        <DateTimePicker mode="date" label="Tanggal Mulai" value={startDate} onChange={(val) => { setStartDate(val || ""); setPage(1); }} />
        <DateTimePicker mode="date" label="Tanggal Akhir" value={endDate} onChange={(val) => { setEndDate(val || ""); setPage(1); }} />
        <Input
          label="Cari"
          placeholder="Invoice, film, kasir..."
          value={searchQuery}
          onChange={(e) => {
            setSearchQuery(e.target.value);
            setPage(1);
          }}
        />
        <Select
          label="Jumlah data per halaman"
          options={pageSizeOptions}
          value={String(pageSize)}
          onChange={(e) => {
            setPageSize(Number(e.target.value));
            setPage(1);
          }}
        />
      </div>

      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl overflow-hidden shadow-sm">
        <div className="flex items-center justify-end gap-3 border-b border-zinc-200 px-5 py-3 dark:border-zinc-800">
          {exportError && <span role="alert" className="text-sm text-rose-600">{exportError}</span>}
          <button
            type="button"
            onClick={exportExcel}
            disabled={isExporting}
            className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <Download className="h-4 w-4" />
            {isExporting ? "Mengekspor..." : "Export Excel"}
          </button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-sm min-w-[1800px]">
            <thead>
              <tr className="bg-zinc-50 dark:bg-zinc-950 border-b border-zinc-200 dark:border-zinc-800 text-zinc-500 uppercase tracking-wider text-[10px] font-bold">
                <th className="px-3 py-4">#</th>
                <th className="px-3 py-4">Created By</th>
                <th className="px-3 py-4">Account Name</th>
                <th className="px-3 py-4">Transaction Date</th>
                <th className="px-3 py-4">Theater</th>
                <th className="px-3 py-4">Film Name</th>
                <th className="px-3 py-4">Invoice Code</th>
                <th className="px-3 py-4">Qty</th>
                <th className="px-3 py-4">Price</th>
                <th className="px-3 py-4">Sub Total</th>
                <th className="px-3 py-4">Disc</th>
                <th className="px-3 py-4">Sub Total - Disc</th>
                <th className="px-3 py-4">Is Card</th>
                <th className="px-3 py-4">Card Number</th>
                <th className="px-3 py-4">Is Promo</th>
                <th className="px-3 py-4">Free Pass</th>
                <th className="px-3 py-4">Supplier / Distributor</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-150 dark:divide-zinc-850">
              {rows.map((row, index) => (
                <tr key={row.id} className="hover:bg-zinc-50 dark:hover:bg-zinc-950/50">
                  <td className="px-3 py-4 font-medium text-zinc-500">{(page - 1) * pageSize + index + 1}</td>
                  <td className="px-3 py-4 font-medium text-zinc-900 dark:text-zinc-50">{row.createdBy}</td>
                  <td className="px-3 py-4 text-zinc-700 dark:text-zinc-300">{row.accountName}</td>
                  <td className="px-3 py-4 text-zinc-700 dark:text-zinc-300">{row.transactionDate}</td>
                  <td className="px-3 py-4 text-zinc-700 dark:text-zinc-300">{row.theater}</td>
                  <td className="px-3 py-4 font-medium text-zinc-900 dark:text-zinc-50">{row.filmName}</td>
                  <td className="px-3 py-4 font-medium text-zinc-900 dark:text-zinc-50">{row.invoiceCode}</td>
                  <td className="px-3 py-4 text-right text-zinc-700 dark:text-zinc-300">{row.qty}</td>
                  <td className="px-3 py-4 text-right text-zinc-700 dark:text-zinc-300">{formatCurrency(row.price)}</td>
                  <td className="px-3 py-4 text-right text-zinc-700 dark:text-zinc-300">{formatCurrency(row.subTotal)}</td>
                  <td className="px-3 py-4 text-right text-zinc-700 dark:text-zinc-300">{formatCurrency(row.disc)}</td>
                  <td className="px-3 py-4 text-right font-semibold text-zinc-900 dark:text-zinc-50">{formatCurrency(row.subTotalAfterDisc)}</td>
                  <td className="px-3 py-4 text-center text-zinc-700 dark:text-zinc-300">{row.isCard ? "true" : "false"}</td>
                  <td className="px-3 py-4 text-zinc-700 dark:text-zinc-300">{row.cardNumber}</td>
                  <td className="px-3 py-4 text-center text-zinc-700 dark:text-zinc-300">{row.isPromo ? "Ya" : "Tidak"}</td>
                  <td className="px-3 py-4 text-center text-zinc-700 dark:text-zinc-300">{row.freePass}</td>
                  <td className="px-3 py-4 text-zinc-700 dark:text-zinc-300">{row.supplierDistributor}</td>
                </tr>
              ))}
              {rows.length === 0 && (
                <tr>
                  <td colSpan={17} className="px-3 py-10 text-center text-zinc-400 italic">No transaction data found.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <div className="px-6">
          <Pagination
            currentPage={ordersResponse?.meta?.page ?? page}
            totalPages={ordersResponse?.meta?.totalPages ?? 1}
            onPageChange={setPage}
          />
        </div>
      </div>
    </div>
  );
}
