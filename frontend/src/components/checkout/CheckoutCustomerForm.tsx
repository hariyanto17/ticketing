"use client";

import React from "react";
import { User, Phone, Mail, Armchair, X, Sparkles, CheckCircle2, ShieldCheck } from "lucide-react";
import { Spinner } from "@/components/ui/spinner";
import { ShowtimeSeat } from "@/services/studioApi";
import { useTranslation } from "@/lib/i18n";

interface CheckoutCustomerFormProps {
  selectedSeats: ShowtimeSeat[];
  onRemoveSeat: (seat: ShowtimeSeat) => void;
  onClearAllSeats: () => void;
  customerName: string;
  setCustomerName: (val: string) => void;
  customerPhone: string;
  setCustomerPhone: (val: string) => void;
  customerEmail: string;
  setCustomerEmail: (val: string) => void;
  ticketPrice: number;
  onlineFeePerTicket: number;
  isSubmitting: boolean;
  onSubmit: (e: React.FormEvent) => void;
}

export function CheckoutCustomerForm({
  selectedSeats,
  onRemoveSeat,
  onClearAllSeats,
  customerName,
  setCustomerName,
  customerPhone,
  setCustomerPhone,
  customerEmail,
  setCustomerEmail,
  ticketPrice,
  onlineFeePerTicket,
  isSubmitting,
  onSubmit,
}: CheckoutCustomerFormProps) {
  const { t, formatCurrency } = useTranslation();

  const seatsCount = selectedSeats.length;
  const ticketsSubtotal = seatsCount * ticketPrice;
  const totalServiceFee = seatsCount * onlineFeePerTicket;
  const grandTotal = ticketsSubtotal + totalServiceFee;

  return (
    <div className="lg:col-span-4 space-y-6">
      <form
        onSubmit={onSubmit}
        className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl p-6 space-y-6 shadow-sm"
      >
        {/* Header */}
        <div className="space-y-1">
          <h2 className="text-base font-bold text-zinc-900 dark:text-zinc-50 flex items-center gap-2">
            <User className="w-5 h-5 text-indigo-600" /> {t("booking.guestInformation")}
          </h2>
          <p className="text-xs text-zinc-400">Lengkapi informasi untuk pengiriman e-ticket.</p>
        </div>

        {/* Selected Seats Chips */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wider text-zinc-400">
            <span>Kursi Dipilih ({selectedSeats.length})</span>
            {selectedSeats.length > 0 && (
              <button
                type="button"
                onClick={onClearAllSeats}
                className="text-[10px] text-rose-600 dark:text-rose-400 hover:underline cursor-pointer lowercase"
              >
                hapus semua
              </button>
            )}
          </div>

          {selectedSeats.length === 0 ? (
            <div className="p-4 rounded-2xl border border-dashed border-zinc-200 dark:border-zinc-800 text-center text-xs text-zinc-400">
              Silakan klik kursi pada denah untuk memilih tempat duduk.
            </div>
          ) : (
            <div className="flex flex-wrap gap-2">
              {selectedSeats.map((seat) => (
                <div
                  key={seat.id}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800 text-indigo-700 dark:text-indigo-300 text-xs font-bold"
                >
                  <Armchair className="w-3.5 h-3.5 text-indigo-500" />
                  <span>{seat.seat.seatLabel}</span>
                  <button
                    type="button"
                    onClick={() => onRemoveSeat(seat)}
                    className="hover:text-rose-600 transition-colors ml-0.5 cursor-pointer"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Customer Details Inputs */}
        <div className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-zinc-600 dark:text-zinc-300 flex items-center gap-1.5">
              <User className="w-3.5 h-3.5 text-zinc-400" />
              <span>Nama Lengkap</span>
              <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              required
              value={customerName}
              onChange={(e) => setCustomerName(e.target.value)}
              placeholder="Contoh: Budi Santoso"
              className="w-full px-3.5 py-2.5 rounded-2xl bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 text-xs sm:text-sm font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all text-zinc-900 dark:text-zinc-100"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-zinc-600 dark:text-zinc-300 flex items-center gap-1.5">
              <Phone className="w-3.5 h-3.5 text-zinc-400" />
              <span>No. WhatsApp / HP</span>
              <span className="text-rose-500">*</span>
            </label>
            <input
              type="tel"
              required
              value={customerPhone}
              onChange={(e) => setCustomerPhone(e.target.value)}
              placeholder="Contoh: 081234567890"
              className="w-full px-3.5 py-2.5 rounded-2xl bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 text-xs sm:text-sm font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all text-zinc-900 dark:text-zinc-100"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-zinc-600 dark:text-zinc-300 flex items-center gap-1.5">
              <Mail className="w-3.5 h-3.5 text-zinc-400" />
              <span>Alamat Email</span>
              <span className="text-zinc-400 text-[10px] font-normal">(Opsional)</span>
            </label>
            <input
              type="email"
              value={customerEmail}
              onChange={(e) => setCustomerEmail(e.target.value)}
              placeholder="budi@example.com"
              className="w-full px-3.5 py-2.5 rounded-2xl bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 text-xs sm:text-sm font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all text-zinc-900 dark:text-zinc-100"
            />
          </div>
        </div>

        {/* Pricing Breakdown */}
        <div className="pt-4 border-t border-zinc-150 dark:border-zinc-800/80 space-y-2.5">
          <div className="flex justify-between text-xs text-zinc-500 dark:text-zinc-400">
            <span>Subtotal Tiket ({seatsCount} Kursi)</span>
            <span className="font-semibold text-zinc-800 dark:text-zinc-200">
              {formatCurrency(ticketsSubtotal)}
            </span>
          </div>
          <div className="flex justify-between text-xs text-zinc-500 dark:text-zinc-400">
            <span className="flex items-center gap-1">
              <span>Biaya Layanan Online</span>
              <Sparkles className="w-3 h-3 text-amber-500" />
            </span>
            <span className="font-semibold text-zinc-800 dark:text-zinc-200">
              {formatCurrency(totalServiceFee)}
            </span>
          </div>

          <div className="pt-3 border-t border-dashed border-zinc-200 dark:border-zinc-800 flex justify-between items-baseline">
            <div>
              <span className="text-xs font-bold text-zinc-900 dark:text-zinc-100 block">Total Pembayaran</span>
              <span className="text-[10px] text-zinc-400">Termasuk pajak & biaya admin</span>
            </div>
            <span className="text-lg sm:text-xl font-black text-indigo-600 dark:text-indigo-400">
              {formatCurrency(grandTotal)}
            </span>
          </div>
        </div>

        {/* Submit Button */}
        <button
          type="submit"
          disabled={isSubmitting || selectedSeats.length === 0}
          className="w-full py-3.5 px-4 rounded-2xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 disabled:cursor-not-allowed text-white font-bold text-sm tracking-wide transition-all shadow-lg shadow-indigo-600/30 flex items-center justify-center gap-2 cursor-pointer"
        >
          {isSubmitting ? (
            <>
              <Spinner className="w-4 h-4 text-white" />
              <span>Memproses Pembayaran...</span>
            </>
          ) : (
            <>
              <CheckCircle2 className="w-4 h-4" />
              <span>Lanjut ke Pembayaran</span>
            </>
          )}
        </button>

        {/* Security badges */}
        <div className="flex items-center justify-center gap-1.5 text-[11px] text-zinc-400 dark:text-zinc-500">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
          <span>Pembayaran aman terenkripsi via Midtrans Gateway</span>
        </div>
      </form>
    </div>
  );
}
