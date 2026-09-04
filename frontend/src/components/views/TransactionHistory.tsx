"use client";

import React, { useState } from "react";
import { useGetOrdersQuery, Order, Ticket } from "@/services/orderApi";
import { useGetUsersQuery } from "@/services/userApi";
import { useToast } from "@/components/ui/toast";
import { DataTable } from "@/components/ui/data-table";
import { Input, Select, Button } from "@/components/ui/form-controls";
import { DateTimePicker } from "@/components/ui/DateTimePicker";
import { Receipt, Search, Calendar, User as UserIcon, Printer, Trash2, RotateCcw, AlertTriangle } from "lucide-react";
import { Modal } from "@/components/ui/modal";
import { Spinner } from "@/components/ui/spinner";
import Link from "next/link";
import {
  useVoidOrderMutation,
  useRefundTicketMutation,
  useReprintTicketMutation
} from "@/services/opsApi";
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

  const { data: ordersResponse, isLoading, refetch } = useGetOrdersQuery({
    search: searchQuery || undefined,
    cashierId: isCashier ? user?.id : (cashierFilter || undefined),
    channel: isCashier ? "POS" : (channelFilter || undefined),
    startDate: startDate || undefined,
    endDate: endDate || undefined,
  });

  const { data: usersResponse } = useGetUsersQuery();
  const { success: toastSuccess, error: toastError } = useToast();

  // Mutation Hooks
  const [voidOrder, { isLoading: isVoiding }] = useVoidOrderMutation();
  const [refundTicket, { isLoading: isRefunding }] = useRefundTicketMutation();
  const [reprintTicket] = useReprintTicketMutation();

  // Modals Local State
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [activeTicketForRefund, setActiveTicketForRefund] = useState<Ticket | null>(null);
  const [activeTicketForReprint, setActiveTicketForReprint] = useState<Ticket | null>(null);
  const [refundReason, setRefundReason] = useState("Customer Request");
  const [reprintReason, setReprintReason] = useState("Thermal Print Defect");

  const cashierOptions = [
    { value: "", label: t("transactions.allCashiers") },
    ...(usersResponse?.data?.map((u) => ({ value: u.id, label: u.name })) || []),
  ];

  const channelOptions = [
    { value: "", label: "Semua Sumber (POS & Online)" },
    { value: "POS", label: "POS / Loket Kasir" },
    { value: "ONLINE", label: "Mobile / Online Booking" },
  ];

  const handleVoidOrder = async (orderId: string) => {
    if (!window.confirm("Are you sure you want to VOID this entire transaction? All seats will be released immediately.")) {
      return;
    }
    try {
      await voidOrder(orderId).unwrap();
      toastSuccess(t("transactions.voidSuccess"));
      setSelectedOrder(null);
      refetch();
    } catch (err: any) {
      toastError(err?.data?.message || t("transactions.failed"));
    }
  };

  const handleRefundSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeTicketForRefund) return;
    try {
      await refundTicket({ ticketId: activeTicketForRefund.id, reason: refundReason }).unwrap();
      toastSuccess(t("transactions.refundSuccess"));
      setActiveTicketForRefund(null);
      setSelectedOrder(null);
      refetch();
    } catch (err: any) {
      toastError(err?.data?.message || t("transactions.failed"));
    }
  };

  const handleReprintSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeTicketForReprint) return;
    try {
      await reprintTicket({ ticketId: activeTicketForReprint.id, reason: reprintReason }).unwrap();
      toastSuccess(t("transactions.reprintSuccess"));
      
      // Open the printable view
      if (selectedOrder) {
        const printUrl = isCashier
          ? `/cashier/tickets/${selectedOrder.id}/print`
          : `/admin/tickets/${selectedOrder.id}/print`;
        window.open(printUrl, "_blank");
      }
      setActiveTicketForReprint(null);
    } catch (err: any) {
      toastError(err?.data?.message || t("transactions.failed"));
    }
  };

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
        const time = new Date(o.schedule.startTime).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
        const date = formatDate(o.schedule.businessDate, { month: "short", day: "numeric" });
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
    {
      key: "actions",
      header: t("transactions.actions"),
      render: (o: Order) => {
        const printUrl = isCashier
          ? `/cashier/tickets/${o.id}/print`
          : `/admin/tickets/${o.id}/print`;
        return (
          <div className="flex items-center gap-2">
            <button
              onClick={() => setSelectedOrder(o)}
              className="px-3 py-1 bg-zinc-50 hover:bg-zinc-150 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl text-[11px] font-bold cursor-pointer"
            >
              {t("transactions.manage")}
            </button>
            <Link
              href={printUrl}
              target="_blank"
              className="p-1.5 text-zinc-500 hover:text-indigo-600 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg flex items-center justify-center cursor-pointer"
            >
              <Printer className="w-4 h-4" />
            </Link>
          </div>
        );
      },
    },
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

      {/* Manage Transaction Detail Modal */}
      <Modal isOpen={!!selectedOrder} onClose={() => setSelectedOrder(null)} title={t("transactions.details")}>
        {selectedOrder && (
          <div className="space-y-6 py-4">
            <div className="flex justify-between items-start border-b border-zinc-100 dark:border-zinc-800 pb-4">
              <div>
                <h3 className="font-bold text-zinc-900 dark:text-zinc-50">{selectedOrder.orderNumber}</h3>
                <p className="text-xs text-zinc-400 mt-0.5">{t("transactions.total")}: {formatCurrency(selectedOrder.totalAmount)}</p>
              </div>
              {selectedOrder.orderStatus === "PAID" && (
                <button
                  onClick={() => handleVoidOrder(selectedOrder.id)}
                  disabled={isVoiding}
                  className="px-3.5 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold cursor-pointer flex items-center gap-1.5 shadow-sm"
                >
                  <Trash2 className="w-3.5 h-3.5" /> {t("transactions.void")}
                </button>
              )}
            </div>

            {/* Tickets List */}
            <div className="space-y-3">
              <h4 className="text-xs font-bold text-zinc-400 uppercase tracking-wider">{t("transactions.issued")}</h4>
              <div className="space-y-2">
                {selectedOrder.tickets.map((ticket) => (
                  <div
                    key={ticket.id}
                    className="p-3 bg-zinc-50 dark:bg-zinc-950 border border-zinc-150 dark:border-zinc-850 rounded-2xl flex items-center justify-between gap-4"
                  >
                    <div>
                      <span className="text-xs font-bold text-zinc-800 dark:text-zinc-200">
                        {t("transactions.seats")} {ticket.showtimeSeat?.seat?.seatLabel || "-"}
                      </span>
                      <p className="text-[10px] text-zinc-400">{ticket.ticketNumber}</p>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        ticket.status === "ACTIVE"
                          ? "bg-emerald-50 text-emerald-600"
                          : ticket.status === "USED"
                          ? "bg-blue-50 text-blue-600"
                          : "bg-rose-50 text-rose-500"
                      }`}>
                        {ticket.status}
                      </span>
                      
                      {ticket.status === "ACTIVE" && (
                        <button
                          onClick={() => setActiveTicketForRefund(ticket)}
                          className="px-2.5 py-1 bg-amber-50 hover:bg-amber-100 text-amber-700 rounded-lg text-[10px] font-bold cursor-pointer"
                        >
                          {t("transactions.refund")}
                        </button>
                      )}

                      <button
                        onClick={() => setActiveTicketForReprint(ticket)}
                        className="p-1 text-zinc-400 hover:text-indigo-600 hover:bg-zinc-100 dark:hover:bg-zinc-900 rounded-lg cursor-pointer"
                        title={t("transactions.reprint")}
                      >
                        <Printer className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </Modal>

      {/* Ticket Refund Modal */}
      <Modal isOpen={!!activeTicketForRefund} onClose={() => setActiveTicketForRefund(null)} title={t("transactions.refundTitle")}>
        <form onSubmit={handleRefundSubmit} className="space-y-6 py-4">
          <div className="p-4 bg-amber-50 dark:bg-amber-950/20 border border-amber-100 dark:border-amber-950/30 rounded-2xl flex gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
            <div className="space-y-0.5">
              <h4 className="text-xs font-bold text-amber-900 dark:text-amber-300">{t("transactions.seatRelease")}</h4>
              <p className="text-[11px] text-amber-700/80 dark:text-amber-400/80 leading-relaxed">
                {t("transactions.refundNotice")}
              </p>
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-zinc-500 uppercase tracking-wider">{t("transactions.refundReason")}</label>
            <select
              value={refundReason}
              onChange={(e) => setRefundReason(e.target.value)}
              className="w-full px-4 py-2.5 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-amber-500/20"
            >
              <option value="Customer Request">Customer Request</option>
              <option value="Payment Error">Payment Error</option>
              <option value="Schedule Cancelled">Schedule Cancelled</option>
              <option value="Technical Issue">Technical Issue</option>
              <option value="Other">Other</option>
            </select>
          </div>

          <div className="flex gap-3 justify-end">
            <button
              type="button"
              onClick={() => setActiveTicketForRefund(null)}
              className="px-4 py-2 border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-900 text-zinc-700 dark:text-zinc-300 rounded-xl text-xs font-semibold cursor-pointer"
            >
              {t("transactions.cancel")}
            </button>
            <button
              type="submit"
              disabled={isRefunding}
              className="px-4 py-2 bg-amber-600 hover:bg-amber-700 disabled:bg-zinc-305 text-white font-bold rounded-xl text-xs cursor-pointer flex items-center gap-1.5"
            >
              {isRefunding ? <Spinner className="w-4 h-4" /> : t("transactions.confirmRefund")}
            </button>
          </div>
        </form>
      </Modal>

      {/* Ticket Reprint Modal */}
      <Modal isOpen={!!activeTicketForReprint} onClose={() => setActiveTicketForReprint(null)} title={t("transactions.reprintTitle")}>
        <form onSubmit={handleReprintSubmit} className="space-y-6 py-4">
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-zinc-500 uppercase tracking-wider">{t("transactions.reprintReason")}</label>
            <input
              type="text"
              value={reprintReason}
              onChange={(e) => setReprintReason(e.target.value)}
              placeholder="e.g. Paper jammed, ink faded"
              className="w-full px-4 py-2.5 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 text-sm"
              required
            />
          </div>

          <div className="flex gap-3 justify-end">
            <button
              type="button"
              onClick={() => setActiveTicketForReprint(null)}
              className="px-4 py-2 border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-900 text-zinc-700 dark:text-zinc-300 rounded-xl text-xs font-semibold cursor-pointer"
            >
              {t("transactions.cancel")}
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl text-xs cursor-pointer flex items-center gap-1.5"
            >
              {t("transactions.logReprint")}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
