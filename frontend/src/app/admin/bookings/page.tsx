"use client";

import React, { useState } from "react";
import {
  useGetAdminBookingsQuery,
  useConfirmBookingPaymentMutation,
  useCancelBookingMutation
} from "@/services/bookingApi";
import { useReprintTicketMutation } from "@/services/opsApi";
import { useToast } from "@/components/ui/toast";
import { DataTable } from "@/components/ui/data-table";
import { Spinner } from "@/components/ui/spinner";
import { Modal } from "@/components/ui/modal";
import { Check, X, Printer, Search, Info, AlertTriangle } from "lucide-react";
import Link from "next/link";
import { useTranslation } from "@/lib/i18n";

export default function AdminBookingsPage() {
  const { t, formatDate, formatCurrency } = useTranslation();
  const { data: bookings = [], isLoading, refetch } = useGetAdminBookingsQuery();
  const [confirmPayment, { isLoading: isConfirming }] = useConfirmBookingPaymentMutation();
  const [cancelBooking, { isLoading: isCancelling }] = useCancelBookingMutation();
  const [reprintTicket] = useReprintTicketMutation();
  const { success: toastSuccess, error: toastError } = useToast();

  const [selectedBooking, setSelectedBooking] = useState<any>(null);
  const [activeTicketForReprint, setActiveTicketForReprint] = useState<any>(null);
  const [reprintReason, setReprintReason] = useState("Thermal Print Defect");

  const handleConfirmPayment = async (id: string) => {
    if (!window.confirm("Confirm payment received? This will issue digital tickets and release showtime seats hold to SOLD.")) {
      return;
    }
    try {
      await confirmPayment(id).unwrap();
      toastSuccess(t("bookingsAdmin.confirmed"));
      setSelectedBooking(null);
      refetch();
    } catch (err: any) {
      toastError(err?.data?.message || t("bookingsAdmin.failed"));
    }
  };

  const handleCancelBooking = async (id: string) => {
    if (!window.confirm("Are you sure you want to CANCEL this booking? Held seats will return to AVAILABLE state immediately.")) {
      return;
    }
    try {
      await cancelBooking(id).unwrap();
      toastSuccess(t("bookingsAdmin.cancelled"));
      setSelectedBooking(null);
      refetch();
    } catch (err: any) {
      toastError(err?.data?.message || t("bookingsAdmin.failed"));
    }
  };

  const handleReprintSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeTicketForReprint) return;
    try {
      await reprintTicket({ ticketId: activeTicketForReprint.id, reason: reprintReason }).unwrap();
      toastSuccess(t("bookingsAdmin.reprinted"));
      
      if (selectedBooking) {
        window.open(`/admin/tickets/${selectedBooking.id}/print`, "_blank");
      }
      setActiveTicketForReprint(null);
    } catch (err: any) {
      toastError(err?.data?.message || t("bookingsAdmin.failed"));
    }
  };

  const columns = [
    { key: "bookingNumber", header: t("bookingsAdmin.booking") },
    { key: "customerName", header: t("bookingsAdmin.customer") },
    { key: "customerPhone", header: t("bookingsAdmin.phone") },
    {
      key: "movie",
      header: t("bookingsAdmin.movie"),
      render: (o: any) => o.schedule?.movie?.title || "-",
    },
    {
      key: "seats",
      header: t("bookingsAdmin.seats"),
      render: (o: any) => (
        <div className="flex flex-wrap gap-1 max-w-[120px]">
          {o.tickets.map((t: any) => (
            <span key={t.id} className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${t.status === "CANCELLED" ? "bg-rose-100 text-rose-600 line-through" : "bg-zinc-100 dark:bg-zinc-800"}`}>
              {t.showtimeSeat?.seat?.seatLabel || "-"}
            </span>
          ))}
        </div>
      ),
    },
    { key: "totalAmount", header: t("bookingsAdmin.total"), render: (o: any) => formatCurrency(o.totalAmount) },
    {
      key: "orderStatus",
      header: t("bookingsAdmin.status"),
      render: (o: any) => (
        <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
          o.orderStatus === "PENDING"
            ? "bg-amber-50 text-amber-600"
            : o.orderStatus === "CANCELLED"
            ? "bg-rose-50 text-rose-600"
            : "bg-emerald-50 text-emerald-600"
        }`}>
          {o.orderStatus}
        </span>
      ),
    },
    {
      key: "actions",
      header: t("bookingsAdmin.actions"),
      render: (o: any) => (
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => setSelectedBooking(o)}
            className="px-2.5 py-1 bg-zinc-50 border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-150 rounded-lg text-[10px] font-bold cursor-pointer"
          >
            {t("bookingsAdmin.manage")}
          </button>
          {o.orderStatus === "PAID" && (
            <Link
              href={`/admin/tickets/${o.id}/print`}
              target="_blank"
              className="p-1.5 text-zinc-500 hover:text-indigo-600 hover:bg-zinc-100 rounded-lg flex items-center justify-center cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5" />
            </Link>
          )}
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-8 font-sans">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
          {t("bookingsAdmin.title")}
        </h1>
        <p className="text-zinc-500 dark:text-zinc-400 mt-1">
          {t("bookingsAdmin.subtitle")}
        </p>
      </div>

      <div className="p-6 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl shadow-sm">
        <DataTable columns={columns} data={bookings} isLoading={isLoading} />
      </div>

      {/* Booking Management Details Modal */}
      <Modal isOpen={!!selectedBooking} onClose={() => setSelectedBooking(null)} title={t("bookingsAdmin.details")}>
        {selectedBooking && (
          <div className="space-y-6 py-4">
            <div className="flex justify-between items-start border-b border-zinc-100 dark:border-zinc-800 pb-4">
              <div>
                <h3 className="font-bold text-zinc-900 dark:text-zinc-50">{selectedBooking.bookingNumber}</h3>
                <p className="text-xs text-zinc-400 mt-0.5">{formatDate(selectedBooking.createdAt, { dateStyle: "medium", timeStyle: "short" })}</p>
              </div>

              {selectedBooking.orderStatus === "PENDING" && (
                <div className="flex gap-2">
                  <button
                    onClick={() => handleCancelBooking(selectedBooking.id)}
                    disabled={isCancelling}
                    className="px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-650 rounded-xl text-xs font-bold cursor-pointer flex items-center gap-1 shadow-sm"
                  >
                    <X className="w-3.5 h-3.5" /> {t("bookingsAdmin.cancelReservation")}
                  </button>
                  <button
                    onClick={() => handleConfirmPayment(selectedBooking.id)}
                    disabled={isConfirming}
                    className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold cursor-pointer flex items-center gap-1 shadow-sm"
                  >
                    <Check className="w-3.5 h-3.5" /> {t("bookingsAdmin.confirmPayment")}
                  </button>
                </div>
              )}
            </div>

            {/* Guest details block */}
            <div className="p-4 bg-zinc-50 dark:bg-zinc-950 border border-zinc-150 dark:border-zinc-850 rounded-2xl space-y-2">
              <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block">{t("bookingsAdmin.snapshot")}</span>
              <div className="grid grid-cols-2 gap-4 text-xs">
                <div>
                  <span className="text-zinc-500 block">{t("bookingsAdmin.name")}:</span>
                  <span className="font-bold text-zinc-850 dark:text-zinc-200">{selectedBooking.customerName}</span>
                </div>
                <div>
                  <span className="text-zinc-500 block">{t("bookingsAdmin.phone")}:</span>
                  <span className="font-bold text-zinc-850 dark:text-zinc-200">{selectedBooking.customerPhone}</span>
                </div>
                {selectedBooking.customerEmail && (
                  <div className="col-span-2">
                    <span className="text-zinc-500 block">{t("bookingsAdmin.email")}:</span>
                    <span className="font-bold text-zinc-850 dark:text-zinc-200">{selectedBooking.customerEmail}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Movie details */}
            <div className="space-y-3">
              <h4 className="text-xs font-bold text-zinc-400 uppercase tracking-wider">{t("bookingsAdmin.showtimeTickets")}</h4>
              <div className="p-4 bg-zinc-50 dark:bg-zinc-950 border border-zinc-150 dark:border-zinc-850 rounded-2xl space-y-2 text-xs">
                <div className="flex justify-between">
                  <span className="text-zinc-500">{t("bookingsAdmin.movieTitle")}</span>
                  <span className="font-bold text-zinc-950 dark:text-zinc-100">{selectedBooking.schedule?.movie?.title}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-zinc-500">{t("bookingsAdmin.studio")}</span>
                  <span className="font-bold text-zinc-950 dark:text-zinc-100">{selectedBooking.schedule?.studio?.studioCode}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-zinc-500">{t("bookingsAdmin.amountDue")}</span>
                  <span className="font-black text-indigo-650 dark:text-indigo-400">{formatCurrency(selectedBooking.totalAmount)}</span>
                </div>
              </div>
            </div>

            {/* Individual Tickets */}
            <div className="space-y-3">
              <h4 className="text-xs font-bold text-zinc-400 uppercase tracking-wider">{t("bookingsAdmin.ticketsDetail")}</h4>
              <div className="space-y-2">
                {selectedBooking.tickets.map((ticket: any) => (
                  <div
                    key={ticket.id}
                    className="p-3 bg-zinc-50 dark:bg-zinc-950 border border-zinc-150 dark:border-zinc-850 rounded-2xl flex items-center justify-between gap-4"
                  >
                    <div>
                      <span className="text-xs font-bold text-zinc-800 dark:text-zinc-200">
                        {t("bookingsAdmin.seats")} {ticket.showtimeSeat?.seat?.seatLabel || "-"}
                      </span>
                      <p className="text-[10px] text-zinc-400">{ticket.ticketNumber}</p>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        ticket.status === "ACTIVE"
                          ? "bg-emerald-50 text-emerald-600"
                          : "bg-rose-50 text-rose-500"
                      }`}>
                        {ticket.status}
                      </span>
                      {selectedBooking.orderStatus === "PAID" && (
                        <button
                          onClick={() => setActiveTicketForReprint(ticket)}
                          className="p-1 text-zinc-450 hover:text-indigo-600 rounded-lg cursor-pointer"
                          title={t("transactions.reprint")}
                        >
                          <Printer className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </Modal>

      {/* Ticket Reprint Modal */}
      <Modal isOpen={!!activeTicketForReprint} onClose={() => setActiveTicketForReprint(null)} title={t("bookingsAdmin.reprintTitle")}>
        <form onSubmit={handleReprintSubmit} className="space-y-6 py-4">
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-zinc-500 uppercase tracking-wider">{t("bookingsAdmin.reprintReason")}</label>
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
              {t("bookingsAdmin.cancel")}
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl text-xs cursor-pointer flex items-center gap-1.5"
            >
              {t("bookingsAdmin.logReprint")}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
