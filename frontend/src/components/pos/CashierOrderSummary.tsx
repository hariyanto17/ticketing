"use client";

import React from "react";
import { Ticket, Tag, Gift, Check, Banknote, QrCode, CreditCard } from "lucide-react";
import { Button, Select } from "@/components/ui/form-controls";
import { CurrencyInput } from "@/components/ui/CurrencyInput";
import { Movie } from "@/services/movieApi";
import { Schedule, ShowtimeSeat } from "@/services/studioApi";
import { Promotion } from "@/services/promotionApi";
import { PaymentMethod } from "@/lib/api/orderApi";
import { useTranslation } from "@/lib/i18n";

interface CashierOrderSummaryProps {
  drawerLoading: boolean;
  activeDrawer: any;
  drawerOpeningBalance: number;
  setDrawerOpeningBalance: (val: number) => void;
  isOpeningDrawer: boolean;
  onOpenDrawerSubmit: (e: React.FormEvent) => void;
  onOpenCloseModal: () => void;
  selectedMovie: Movie | null;
  selectedSchedule: Schedule | null;
  selectedSeats: ShowtimeSeat[];
  isSeatActionPending: boolean;
  onClearSelection: () => void;
  activePromos: Promotion[];
  selectedPromo: Promotion | null;
  setSelectedPromo: (promo: Promotion | null) => void;
  ticketPrice: number;
  quantity: number;
  promoDiscount: number;
  freeTicketsCount: number;
  totalAmount: number;
  paymentMethod: PaymentMethod;
  setPaymentMethod: (method: PaymentMethod) => void;
  amountReceived: number | "";
  setAmountReceived: (val: number | "") => void;
  change: number;
  isCheckingOut: boolean;
  onCheckoutSubmit: () => void;
}

export function CashierOrderSummary({
  drawerLoading,
  activeDrawer,
  drawerOpeningBalance,
  setDrawerOpeningBalance,
  isOpeningDrawer,
  onOpenDrawerSubmit,
  onOpenCloseModal,
  selectedMovie,
  selectedSchedule,
  selectedSeats,
  isSeatActionPending,
  onClearSelection,
  activePromos,
  selectedPromo,
  setSelectedPromo,
  ticketPrice,
  quantity,
  promoDiscount,
  freeTicketsCount,
  totalAmount,
  paymentMethod,
  setPaymentMethod,
  amountReceived,
  setAmountReceived,
  change,
  isCheckingOut,
  onCheckoutSubmit,
}: CashierOrderSummaryProps) {
  const { t, formatCurrency } = useTranslation();

  return (
    <div className="xl:col-span-4 xl:sticky xl:top-6 p-6 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl space-y-6 shadow-sm">
      {/* Cash Drawer summary widget */}
      <div className="border-b border-zinc-100 dark:border-zinc-800 pb-5 space-y-3">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 className="text-sm font-bold text-zinc-900 dark:text-zinc-50">Cash Drawer</h2>
            <p className="text-xs text-zinc-400 mt-1">
              {drawerLoading
                ? "Checking drawer status..."
                : activeDrawer
                ? `Opened with ${formatCurrency(activeDrawer.openingBalance)}`
                : "Open a drawer before processing checkout."}
            </p>
          </div>
          <span
            className={`text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full ${
              activeDrawer
                ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400"
                : "bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400"
            }`}
          >
            {activeDrawer ? "Open" : "Closed"}
          </span>
        </div>

        {activeDrawer ? (
          <button
            type="button"
            onClick={onOpenCloseModal}
            className="w-full px-3 py-2 border border-rose-200 dark:border-rose-900/50 text-rose-600 dark:text-rose-400 rounded-xl text-xs font-bold hover:bg-rose-50 dark:hover:bg-rose-950/20"
          >
            Close Cash Drawer
          </button>
        ) : (
          <form onSubmit={onOpenDrawerSubmit} className="space-y-2">
            <label className="text-xs font-semibold text-zinc-500">Opening Balance (IDR)</label>
            <div className="flex gap-2">
              <input
                type="number"
                min="0"
                value={drawerOpeningBalance}
                onChange={(e) => setDrawerOpeningBalance(Number(e.target.value))}
                className="min-w-0 flex-1 px-3 py-2 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl text-sm font-semibold"
              />
              <button
                type="submit"
                disabled={isOpeningDrawer || drawerLoading}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:bg-zinc-300 text-white rounded-xl text-xs font-bold"
              >
                {isOpeningDrawer ? "Opening..." : "Open Drawer"}
              </button>
            </div>
          </form>
        )}
      </div>

      <h2 className="text-xl font-bold text-zinc-900 dark:text-zinc-50 border-b border-zinc-100 dark:border-zinc-800 pb-4 flex items-center gap-2">
        <Ticket className="w-5.5 h-5.5 text-indigo-600" /> {t("cashier.summary")}
      </h2>

      {/* Selected Movie details */}
      {selectedMovie ? (
        <div className="space-y-1">
          <h3 className="font-bold text-zinc-900 dark:text-zinc-50 text-sm leading-tight">{selectedMovie.title}</h3>
          {selectedSchedule && (
            <p className="text-xs text-zinc-400 flex items-center gap-1">
              <span>
                {selectedSchedule.studio.name} ({selectedSchedule.studio.code})
              </span>
              <span>•</span>
              <span>
                {new Date(selectedSchedule.startTime).toLocaleTimeString([], {
                  hour: "2-digit",
                  minute: "2-digit",
                  hour12: false,
                })}
              </span>
            </p>
          )}
        </div>
      ) : (
        <p className="text-sm text-zinc-400">{t("cashier.selectPrompt")}</p>
      )}

      {/* Seats List */}
      <div className="space-y-2">
        <div className="flex justify-between text-xs font-semibold text-zinc-400">
          <span>
            {t("cashier.seatsSelected")} ({quantity})
          </span>
          {quantity > 0 && (
            <button
              onClick={onClearSelection}
              disabled={isSeatActionPending}
              className="text-rose-500 hover:underline cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {t("cashier.clear")}
            </button>
          )}
        </div>
        {quantity > 0 ? (
          <div className="flex flex-wrap gap-1.5">
            {selectedSeats.map((s) => (
              <span
                key={s.id}
                className="px-2.5 py-1 bg-zinc-50 dark:bg-zinc-950 border border-zinc-150 dark:border-zinc-850 rounded-xl text-xs font-bold text-zinc-800 dark:text-zinc-200"
              >
                {s.seat.seatLabel}
              </span>
            ))}
          </div>
        ) : (
          <p className="text-xs text-zinc-400 italic">{t("cashier.noSeats")}</p>
        )}
      </div>

      {/* Promotion Selector */}
      {selectedMovie && (
        <div className="space-y-2 pt-1">
          <div className="flex items-center justify-between text-xs font-semibold text-zinc-400">
            <span className="flex items-center gap-1.5">
              <Tag className="w-3.5 h-3.5 text-indigo-500" />
              {t("cashier.promo")}
            </span>
            {selectedPromo && (
              <button
                type="button"
                onClick={() => setSelectedPromo(null)}
                className="text-rose-500 hover:underline cursor-pointer"
              >
                {t("cashier.clearPromo")}
              </button>
            )}
          </div>

          <Select
            value={selectedPromo?.id || ""}
            onChange={(e: React.ChangeEvent<HTMLSelectElement>) => {
              const promo = activePromos.find((p: Promotion) => p.id === e.target.value);
              setSelectedPromo(promo || null);
            }}
            options={[
              { value: "", label: t("cashier.noPromoSelected") },
              ...activePromos.map((p: Promotion) => {
                const remainingQuota = Math.max(0, p.quota - p.usedQuota);
                const typeLabel =
                  p.promoType === "BUY_X_GET_Y" ? `BOGO ${p.buyQty}+${p.getQty}` : `${p.discountPercent}%`;
                return {
                  value: p.id,
                  label: `${p.name} [${p.code}] - ${typeLabel} (${t("promotions.quota")}: ${remainingQuota})`,
                };
              }),
            ]}
          />

          {selectedPromo && quantity > 0 && quantity < selectedPromo.minTickets && (
            <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-600 dark:text-amber-400">
              {t("cashier.promoMinTickets", { count: selectedPromo.minTickets })}
            </div>
          )}

          {selectedPromo && promoDiscount > 0 && (
            <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-xs text-emerald-600 dark:text-emerald-400 flex items-center justify-between">
              <span className="flex items-center gap-1.5 font-medium">
                <Gift className="w-3.5 h-3.5" />
                {selectedPromo.promoType === "BUY_X_GET_Y"
                  ? `${t("cashier.freeTickets")}: ${freeTicketsCount}`
                  : `${t("promotions.discountPercent")}: ${selectedPromo.discountPercent}%`}
              </span>
              <span className="font-bold">-Rp {promoDiscount.toLocaleString()}</span>
            </div>
          )}
        </div>
      )}

      {/* Pricing Math */}
      <div className="border-t border-b border-zinc-100 dark:border-zinc-800 py-4 space-y-2">
        <div className="flex justify-between text-sm text-zinc-500">
          <span>{t("cashier.ticketPrice")}</span>
          <span>Rp {ticketPrice.toLocaleString()}</span>
        </div>
        <div className="flex justify-between text-sm text-zinc-500">
          <span>{t("cashier.quantity")}</span>
          <span>x{quantity}</span>
        </div>
        {promoDiscount > 0 && (
          <div className="flex justify-between text-sm text-emerald-600 dark:text-emerald-400 font-medium">
            <span>
              {t("cashier.promoDiscount")} ({selectedPromo?.name})
            </span>
            <span>-Rp {promoDiscount.toLocaleString()}</span>
          </div>
        )}
        <div className="flex justify-between text-base font-bold text-zinc-900 dark:text-zinc-50 pt-1">
          <span>{t("cashier.total")}</span>
          <span>Rp {totalAmount.toLocaleString()}</span>
        </div>
      </div>

      {/* Payment Configuration */}
      {quantity > 0 && (
        <div className="space-y-4">
          <div className="space-y-2">
            <label className="text-xs font-bold text-zinc-400 uppercase tracking-wider">
              {t("cashier.paymentMethod")}
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setPaymentMethod("CASH")}
                className={`py-2.5 px-2 text-xs font-bold rounded-xl border cursor-pointer transition-all flex items-center justify-center gap-1.5 ${
                  paymentMethod === "CASH"
                    ? "border-indigo-600 bg-indigo-50/30 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 shadow-xs"
                    : "border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-zinc-600 dark:text-zinc-400 hover:border-zinc-300"
                }`}
              >
                <Banknote className="w-3.5 h-3.5 shrink-0" />
                <span>CASH / TUNAI</span>
              </button>
              <button
                type="button"
                onClick={() => setPaymentMethod("QRIS")}
                className={`py-2.5 px-2 text-xs font-bold rounded-xl border cursor-pointer transition-all flex items-center justify-center gap-1.5 ${
                  paymentMethod === "QRIS"
                    ? "border-indigo-600 bg-indigo-50/30 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 shadow-xs"
                    : "border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-zinc-600 dark:text-zinc-400 hover:border-zinc-300"
                }`}
              >
                <QrCode className="w-3.5 h-3.5 shrink-0" />
                <span>QRIS CODE</span>
              </button>
              <button
                type="button"
                onClick={() => setPaymentMethod("DEBIT_CARD")}
                className={`py-2.5 px-2 text-xs font-bold rounded-xl border cursor-pointer transition-all flex items-center justify-center gap-1.5 ${
                  paymentMethod === "DEBIT_CARD"
                    ? "border-indigo-600 bg-indigo-50/30 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 shadow-xs"
                    : "border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-zinc-600 dark:text-zinc-400 hover:border-zinc-300"
                }`}
              >
                <CreditCard className="w-3.5 h-3.5 shrink-0" />
                <span>KARTU DEBIT</span>
              </button>
              <button
                type="button"
                onClick={() => setPaymentMethod("CREDIT_CARD")}
                className={`py-2.5 px-2 text-xs font-bold rounded-xl border cursor-pointer transition-all flex items-center justify-center gap-1.5 ${
                  paymentMethod === "CREDIT_CARD"
                    ? "border-indigo-600 bg-indigo-50/30 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 shadow-xs"
                    : "border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-zinc-600 dark:text-zinc-400 hover:border-zinc-300"
                }`}
              >
                <CreditCard className="w-3.5 h-3.5 shrink-0" />
                <span>KARTU KREDIT</span>
              </button>
            </div>
          </div>

          {/* CASH Payment UI */}
          {paymentMethod === "CASH" && (
            <div className="space-y-3.5">
              <CurrencyInput
                label={t("cashier.amountReceived")}
                value={amountReceived}
                onChange={(val) => setAmountReceived(val === 0 ? "" : val)}
                placeholder={t("cashier.cashPlaceholder")}
              />
              <div className="flex justify-between text-sm font-semibold p-3 bg-zinc-50 dark:bg-zinc-950 border border-zinc-150 dark:border-zinc-850 rounded-2xl">
                <span className="text-zinc-500">{t("cashier.change")}</span>
                <span className={change > 0 ? "text-indigo-600 dark:text-indigo-400 font-bold" : "text-zinc-400"}>
                  Rp {change.toLocaleString()}
                </span>
              </div>
            </div>
          )}

          {/* QRIS Simulated Display */}
          {paymentMethod === "QRIS" && (
            <div className="p-4 bg-zinc-50 dark:bg-zinc-950 border border-zinc-150 dark:border-zinc-850 rounded-2xl flex flex-col items-center gap-2">
              <div className="w-32 h-32 bg-white p-2 rounded-xl border border-zinc-200 flex items-center justify-center">
                <div className="grid grid-cols-4 gap-2 w-full h-full opacity-65">
                  {Array.from({ length: 16 }).map((_, i) => (
                    <div key={i} className={`rounded-xs ${i % 3 === 0 || i % 7 === 1 ? "bg-black" : "bg-white"}`} />
                  ))}
                </div>
              </div>
              <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider text-center">
                {t("cashier.scan")} {formatCurrency(totalAmount)}
              </span>
            </div>
          )}

          {/* DEBIT CARD Simulated Display */}
          {paymentMethod === "DEBIT_CARD" && (
            <div className="p-4 bg-zinc-50 dark:bg-zinc-950 border border-zinc-150 dark:border-zinc-850 rounded-2xl flex flex-col items-center gap-2.5 text-center">
              <div className="w-10 h-10 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center border border-blue-500/20">
                <CreditCard className="w-5 h-5" />
              </div>
              <div className="space-y-0.5">
                <p className="text-xs font-bold text-zinc-800 dark:text-zinc-200">
                  {t("cashier.debitCard") || "Kartu Debit"}
                </p>
                <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
                  {t("cashier.debitPrompt") || "Silakan proses pembayaran kartu debit pada mesin EDC kasir."}
                </p>
              </div>
              <div className="w-full pt-2 border-t border-zinc-200 dark:border-zinc-800 flex items-center justify-between text-xs">
                <span className="text-zinc-500">{t("cashier.edcCharge") || "Tagihan EDC"}:</span>
                <span className="font-mono font-black text-indigo-600 dark:text-indigo-400">
                  {formatCurrency(totalAmount)}
                </span>
              </div>
            </div>
          )}

          {/* CREDIT CARD Simulated Display */}
          {paymentMethod === "CREDIT_CARD" && (
            <div className="p-4 bg-zinc-50 dark:bg-zinc-950 border border-zinc-150 dark:border-zinc-850 rounded-2xl flex flex-col items-center gap-2.5 text-center">
              <div className="w-10 h-10 rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400 flex items-center justify-center border border-purple-500/20">
                <CreditCard className="w-5 h-5" />
              </div>
              <div className="space-y-0.5">
                <p className="text-xs font-bold text-zinc-800 dark:text-zinc-200">
                  {t("cashier.creditCard") || "Kartu Kredit"}
                </p>
                <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
                  {t("cashier.creditPrompt") || "Silakan proses pembayaran kartu kredit pada mesin EDC kasir."}
                </p>
              </div>
              <div className="w-full pt-2 border-t border-zinc-200 dark:border-zinc-800 flex items-center justify-between text-xs">
                <span className="text-zinc-500">{t("cashier.edcCharge") || "Tagihan EDC"}:</span>
                <span className="font-mono font-black text-indigo-600 dark:text-indigo-400">
                  {formatCurrency(totalAmount)}
                </span>
              </div>
            </div>
          )}

          {/* Checkout CTA */}
          <Button
            onClick={onCheckoutSubmit}
            isLoading={isCheckingOut || isSeatActionPending}
            className="w-full py-2.5 font-bold tracking-wide rounded-2xl flex items-center justify-center gap-2"
          >
            <Check className="w-4 h-4" /> {t("cashier.process")}
          </Button>
        </div>
      )}
    </div>
  );
}
