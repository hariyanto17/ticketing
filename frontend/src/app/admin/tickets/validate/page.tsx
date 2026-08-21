"use client";

import React, { useState } from "react";
import { useValidateTicketMutation, Ticket } from "@/services/orderApi";
import { useToast } from "@/components/ui/toast";
import { Button, Input } from "@/components/ui/form-controls";
import { CheckCircle2, AlertTriangle, XCircle, Search, Ticket as TicketIcon } from "lucide-react";
import { useTranslation } from "@/lib/i18n";

export default function TicketValidation() {
  const { t } = useTranslation();
  const { success: toastSuccess, error: toastError } = useToast();
  const [ticketNumberInput, setTicketNumberInput] = useState("");
  const [validationResult, setValidationResult] = useState<{
    status: "VALID" | "USED" | "CANCELLED" | "NOT_FOUND";
    ticket: Ticket | null;
  } | null>(null);

  const [validateTicket, { isLoading }] = useValidateTicketMutation();

  const handleValidate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!ticketNumberInput.trim()) return;

    try {
      const response = await validateTicket(ticketNumberInput.trim()).unwrap();
      setValidationResult(response.data);
      if (response.data.status === "VALID") {
        toastSuccess(t("tickets.scanSuccess"));
      } else if (response.data.status === "USED") {
        toastError(t("tickets.usedWarning"));
      } else {
        toastError(`${t("tickets.validationFailed")}: ${response.data.status}`);
      }
    } catch (err: any) {
      toastError(err?.data?.message || t("tickets.validationError"));
    }
  };

  return (
    <div className="max-w-md mx-auto space-y-8 font-sans py-8">
      <div className="text-center space-y-1">
        <div className="w-12 h-12 bg-indigo-50 dark:bg-indigo-950/30 text-indigo-600 dark:text-indigo-400 rounded-full flex items-center justify-center mx-auto border border-indigo-100 dark:border-indigo-950/40">
          <TicketIcon className="w-6 h-6" />
        </div>
        <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">{t("tickets.title")}</h1>
        <p className="text-zinc-500 dark:text-zinc-400 text-sm">
          {t("tickets.subtitle")}
        </p>
      </div>

      {/* Scanner Form */}
      <form onSubmit={handleValidate} className="space-y-4">
        <div className="flex gap-2">
          <div className="relative flex-1">
            <input
              type="text"
              value={ticketNumberInput}
              onChange={(e) => setTicketNumberInput(e.target.value)}
              placeholder="e.g. PCM-20260806-00001-001"
              className="w-full pl-3 pr-3 py-2 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl text-sm font-semibold text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
            />
          </div>
          <Button type="submit" isLoading={isLoading} className="flex items-center gap-1.5 px-6">
            <Search className="w-4 h-4" /> {t("tickets.validate")}
          </Button>
        </div>
      </form>

      {/* Validation Result Display */}
      {validationResult && (
        <div className="p-6 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl space-y-6">
          {validationResult.status === "VALID" && (
            <div className="text-center space-y-3">
              <div className="text-emerald-500 flex justify-center"><CheckCircle2 className="w-16 h-16" /></div>
              <div>
                <span className="px-3 py-1 bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400 rounded-full text-xs font-bold uppercase tracking-wider">
                  {t("tickets.valid")}
                </span>
              </div>
            </div>
          )}

          {validationResult.status === "USED" && (
            <div className="text-center space-y-3">
              <div className="text-amber-500 flex justify-center"><AlertTriangle className="w-16 h-16" /></div>
              <div>
                <span className="px-3 py-1 bg-amber-50 text-amber-600 dark:bg-amber-950/40 dark:text-amber-400 rounded-full text-xs font-bold uppercase tracking-wider">
                  {t("tickets.used")}
                </span>
              </div>
            </div>
          )}

          {validationResult.status === "CANCELLED" && (
            <div className="text-center space-y-3">
              <div className="text-rose-500 flex justify-center"><XCircle className="w-16 h-16" /></div>
              <div>
                <span className="px-3 py-1 bg-rose-50 text-rose-600 dark:bg-rose-950/40 dark:text-rose-400 rounded-full text-xs font-bold uppercase tracking-wider">
                  {t("tickets.cancelled")}
                </span>
              </div>
            </div>
          )}

          {validationResult.status === "NOT_FOUND" && (
            <div className="text-center space-y-3">
              <div className="text-zinc-400 flex justify-center"><Search className="w-16 h-16" /></div>
              <div>
                <span className="px-3 py-1 bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300 rounded-full text-xs font-bold uppercase tracking-wider">
                  {t("tickets.notFound")}
                </span>
              </div>
            </div>
          )}

          {/* Ticket Information */}
          {validationResult.ticket && (
            <div className="border-t border-zinc-100 dark:border-zinc-800 pt-4 space-y-2.5 text-sm text-zinc-600 dark:text-zinc-300">
              <div className="flex justify-between">
                <span className="font-semibold text-zinc-400">{t("tickets.movie")}</span>
                <span className="font-bold text-zinc-900 dark:text-zinc-50 uppercase text-right">
                  {validationResult.ticket.showtimeSeat?.showtime?.movie?.title}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="font-semibold text-zinc-400">{t("tickets.studioSeat")}</span>
                <span className="font-bold text-zinc-900 dark:text-zinc-50">
                  {validationResult.ticket.showtimeSeat?.showtime?.studio?.name} - {validationResult.ticket.showtimeSeat?.seat?.seatLabel}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="font-semibold text-zinc-400">{t("tickets.showTime")}</span>
                <span className="font-bold text-zinc-900 dark:text-zinc-50">
                  {validationResult.ticket.showtimeSeat?.showtime && new Date(validationResult.ticket.showtimeSeat.showtime.startTime).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                </span>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
