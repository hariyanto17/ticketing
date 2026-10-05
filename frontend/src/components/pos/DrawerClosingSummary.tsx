"use client";

import React, { useState } from "react";
import { useTranslation } from "@/lib/i18n";
import { CashDrawer } from "@/lib/api/opsApi";
import { useToast } from "@/components/ui/toast";
import { Spinner } from "@/components/ui/spinner";
import {
  CheckCircle2,
  TrendingUp,
  TrendingDown,
  Banknote,
  QrCode,
  Layers,
  Receipt,
  Printer,
  FileText,
  Clock,
  User,
} from "lucide-react";
import { createPrinterAgentClient, getPrinterAgentDeviceId } from "@/services/printerAgentClient";

interface DrawerClosingSummaryProps {
  summary: CashDrawer;
  onFinish: () => void;
}

export function DrawerClosingSummary({ summary, onFinish }: DrawerClosingSummaryProps) {
  const { formatCurrency } = useTranslation();
  const { success: toastSuccess, error: toastError } = useToast();
  const [isPrinting, setIsPrinting] = useState(false);
  const [printSuccess, setPrintSuccess] = useState(false);

  const openingBalance = Number(summary.openingBalance || 0);
  const expectedBalance = Number(summary.expectedBalance || 0);
  const actualBalance = Number(summary.actualBalance || 0);
  const difference = Number(summary.difference || 0);

  const totalCashSales = Number(
    summary.totalCashSales ?? (expectedBalance - openingBalance >= 0 ? expectedBalance - openingBalance : 0)
  );
  const totalQrisSales = Number(summary.totalQrisSales ?? 0);
  const totalOtherSales = Number(summary.totalOtherSales ?? 0);
  const totalSales = Number(summary.totalSales ?? (totalCashSales + totalQrisSales + totalOtherSales));
  const totalTransactions = summary.totalTransactions;

  // Determine difference status & visual styling
  let diffStatus: "MINUS" | "SURPLUS" | "BALANCED" = "BALANCED";
  if (difference < 0) {
    diffStatus = "MINUS";
  } else if (difference > 0) {
    diffStatus = "SURPLUS";
  }

  const handlePrintReceipt = async () => {
    setIsPrinting(true);
    setPrintSuccess(false);

    try {
      const deviceId = getPrinterAgentDeviceId();
      if (!deviceId) {
        toastError("Perangkat printer agent belum terhubung. Silakan konfigurasi di Pengaturan Printer.");
        setIsPrinting(false);
        return;
      }

      const client = createPrinterAgentClient();

      await client.printShiftSummary({
        jobId: `shift-${summary.id}-${Date.now()}`,
        drawerId: summary.id,
        cashierName: summary.openedBy?.name || "Kasir",
        closedByName: summary.closedBy?.name || summary.openedBy?.name || "Kasir",
        openedAt: summary.openedAt,
        closedAt: summary.closedAt || new Date().toISOString(),
        openingBalance,
        expectedBalance,
        actualBalance,
        difference,
        notes: summary.notes || null,
        totalCashSales,
        totalQrisSales,
        totalOtherSales,
        totalSales,
        totalTransactions,
      });

      setPrintSuccess(true);
      toastSuccess("Struk rekonsiliasi berhasil dikirim ke printer agent!");
    } catch (err: any) {
      console.error("Print shift summary error:", err);
      toastError(err?.message || "Gagal mengirim struk ke printer agent. Pastikan printer agent aktif.");
    } finally {
      setIsPrinting(false);
    }
  };

  return (
    <div className="space-y-5 py-2">
      {/* Session Metadata Info */}
      <div className="p-3 bg-zinc-50 dark:bg-zinc-800/60 rounded-xl border border-zinc-200 dark:border-zinc-700/70 flex items-center justify-between flex-wrap gap-2 text-xs">
        <div className="flex items-center gap-1.5 text-zinc-600 dark:text-zinc-300">
          <User className="w-3.5 h-3.5 text-zinc-400" />
          <span>Kasir: <strong className="font-semibold text-zinc-900 dark:text-zinc-100">{summary.openedBy?.name || "Kasir"}</strong></span>
        </div>
        <div className="flex items-center gap-1.5 text-zinc-500 dark:text-zinc-400">
          <Clock className="w-3.5 h-3.5 text-zinc-400" />
          <span>Dibuka: {new Date(summary.openedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
        </div>
      </div>

      {/* Difference Status Banner */}
      {diffStatus === "MINUS" && (
        <div className="p-4 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 flex items-start gap-3">
          <div className="p-2 rounded-xl bg-rose-100 dark:bg-rose-900/60 text-rose-600 dark:text-rose-400 mt-0.5 shrink-0">
            <TrendingDown className="w-5 h-5" />
          </div>
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 rounded-md bg-rose-600 text-white text-[11px] font-bold tracking-wide uppercase">
                Defisit / Kurang
              </span>
              <span className="text-sm font-bold text-rose-800 dark:text-rose-300">
                Selisih: {formatCurrency(difference)}
              </span>
            </div>
            <p className="text-xs text-rose-700 dark:text-rose-400 leading-relaxed">
              Fisik uang tunai di laci kas lebih sedikit{" "}
              <strong className="font-bold">{formatCurrency(Math.abs(difference))}</strong> dari ekspektasi sistem.
            </p>
          </div>
        </div>
      )}

      {diffStatus === "SURPLUS" && (
        <div className="p-4 rounded-2xl bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-900 flex items-start gap-3">
          <div className="p-2 rounded-xl bg-blue-100 dark:bg-blue-900/60 text-blue-600 dark:text-blue-400 mt-0.5 shrink-0">
            <TrendingUp className="w-5 h-5" />
          </div>
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 rounded-md bg-blue-600 text-white text-[11px] font-bold tracking-wide uppercase">
                Surplus / Lebih
              </span>
              <span className="text-sm font-bold text-blue-800 dark:text-blue-300">
                Selisih: +{formatCurrency(difference)}
              </span>
            </div>
            <p className="text-xs text-blue-700 dark:text-blue-400 leading-relaxed">
              Fisik uang tunai di laci kas berlebih{" "}
              <strong className="font-bold">+{formatCurrency(difference)}</strong> dari ekspektasi sistem.
            </p>
          </div>
        </div>
      )}

      {diffStatus === "BALANCED" && (
        <div className="p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900 flex items-start gap-3">
          <div className="p-2 rounded-xl bg-emerald-100 dark:bg-emerald-900/60 text-emerald-600 dark:text-emerald-400 mt-0.5 shrink-0">
            <CheckCircle2 className="w-5 h-5" />
          </div>
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 rounded-md bg-emerald-600 text-white text-[11px] font-bold tracking-wide uppercase">
                Pas / Sesuai
              </span>
              <span className="text-sm font-bold text-emerald-800 dark:text-emerald-300">
                Selisih: Rp 0 (Klop)
              </span>
            </div>
            <p className="text-xs text-emerald-700 dark:text-emerald-400 leading-relaxed">
              Fisik uang tunai di laci kas cocok 100% dengan total perhitungan transaksi sistem.
            </p>
          </div>
        </div>
      )}

      {/* Breakdown Penjualan Sistem Berdasarkan Metode Pembayaran */}
      <div className="space-y-3">
        <h4 className="text-xs font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 flex items-center justify-between">
          <span>Rincian Penjualan Sistem (Shift Ini)</span>
          {typeof totalTransactions === "number" && (
            <span className="font-normal lowercase text-[11px] bg-zinc-100 dark:bg-zinc-800 px-2 py-0.5 rounded-md">
              {totalTransactions} transaksi
            </span>
          )}
        </h4>

        <div className="grid grid-cols-2 gap-2.5">
          {/* Cash Sales Card */}
          <div className="p-3.5 rounded-2xl bg-emerald-50/70 dark:bg-emerald-950/20 border border-emerald-200/80 dark:border-emerald-900/40 space-y-1">
            <div className="flex items-center justify-between text-xs text-emerald-800 dark:text-emerald-400 font-semibold">
              <span className="flex items-center gap-1.5">
                <Banknote className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                Penjualan Tunai (Cash)
              </span>
            </div>
            <div className="text-base font-extrabold text-emerald-900 dark:text-emerald-200">
              {formatCurrency(totalCashSales)}
            </div>
            <p className="text-[11px] text-emerald-700/80 dark:text-emerald-400/70">
              Masuk ke laci kas fisik
            </p>
          </div>

          {/* QRIS Sales Card */}
          <div className="p-3.5 rounded-2xl bg-purple-50/70 dark:bg-purple-950/20 border border-purple-200/80 dark:border-purple-900/40 space-y-1">
            <div className="flex items-center justify-between text-xs text-purple-800 dark:text-purple-400 font-semibold">
              <span className="flex items-center gap-1.5">
                <QrCode className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                Penjualan QRIS
              </span>
            </div>
            <div className="text-base font-extrabold text-purple-900 dark:text-purple-200">
              {formatCurrency(totalQrisSales)}
            </div>
            <p className="text-[11px] text-purple-700/80 dark:text-purple-400/70">
              Non-tunai (masuk bank/rekening)
            </p>
          </div>
        </div>

        {totalOtherSales > 0 && (
          <div className="p-3 rounded-xl bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-200 dark:border-zinc-700 flex justify-between items-center text-xs">
            <span className="text-zinc-600 dark:text-zinc-400 flex items-center gap-1.5">
              <Receipt className="w-4 h-4 text-zinc-500" />
              Metode Pembayaran Lainnya:
            </span>
            <span className="font-bold text-zinc-900 dark:text-zinc-100">{formatCurrency(totalOtherSales)}</span>
          </div>
        )}

        <div className="p-3 rounded-xl bg-zinc-100 dark:bg-zinc-800/90 border border-zinc-200 dark:border-zinc-700/80 flex justify-between items-center text-xs font-medium">
          <span className="text-zinc-700 dark:text-zinc-300 flex items-center gap-1.5 font-semibold">
            <Layers className="w-4 h-4 text-zinc-500" />
            Total Semua Omzet Sesi:
          </span>
          <span className="font-extrabold text-zinc-900 dark:text-zinc-100 text-sm">{formatCurrency(totalSales)}</span>
        </div>
      </div>

      {/* Rekonsiliasi Kas Laci (Drawer Math) */}
      <div className="p-4 rounded-2xl bg-zinc-50 dark:bg-zinc-900/60 border border-zinc-200 dark:border-zinc-800 space-y-2.5 text-xs">
        <h4 className="text-xs font-bold uppercase tracking-wider text-zinc-600 dark:text-zinc-300 pb-1 border-b border-zinc-200 dark:border-zinc-800">
          Kalkulasi Rekonsiliasi Laci Kas
        </h4>

        <div className="flex justify-between items-center text-zinc-600 dark:text-zinc-400">
          <span>Modal Awal Kas Tunai (Opening):</span>
          <span className="font-semibold text-zinc-900 dark:text-zinc-200">{formatCurrency(openingBalance)}</span>
        </div>

        <div className="flex justify-between items-center text-zinc-600 dark:text-zinc-400">
          <span>(+) Total Penjualan Tunai Tiket:</span>
          <span className="font-semibold text-emerald-600 dark:text-emerald-400">+{formatCurrency(totalCashSales)}</span>
        </div>

        <div className="flex justify-between items-center text-zinc-800 dark:text-zinc-200 font-semibold pt-1 border-t border-dashed border-zinc-200 dark:border-zinc-700">
          <span>(=) Ekspektasi Uang Tunai di Laci:</span>
          <span className="font-bold text-zinc-900 dark:text-zinc-100">{formatCurrency(expectedBalance)}</span>
        </div>

        <div className="flex justify-between items-center text-zinc-800 dark:text-zinc-200 font-semibold">
          <span>(✓) Fisik Kas Aktual Diinput Kasir:</span>
          <span className="font-bold text-zinc-900 dark:text-zinc-100">{formatCurrency(actualBalance)}</span>
        </div>

        <div
          className={`flex justify-between items-center pt-2 border-t border-zinc-200 dark:border-zinc-700 text-sm font-extrabold ${
            diffStatus === "MINUS"
              ? "text-rose-600 dark:text-rose-400"
              : diffStatus === "SURPLUS"
              ? "text-blue-600 dark:text-blue-400"
              : "text-emerald-600 dark:text-emerald-400"
          }`}
        >
          <span>Selisih Rekonsiliasi:</span>
          <span>
            {diffStatus === "SURPLUS" ? `+${formatCurrency(difference)}` : formatCurrency(difference)}
          </span>
        </div>
      </div>

      {/* Catatan Kasir / Alasan Selisih */}
      {summary.notes && summary.notes.trim() && (
        <div className="p-3.5 rounded-2xl bg-amber-50/70 dark:bg-amber-950/20 border border-amber-200/80 dark:border-amber-900/40 space-y-1 text-xs">
          <div className="flex items-center gap-1.5 font-bold text-amber-800 dark:text-amber-300">
            <FileText className="w-3.5 h-3.5" />
            <span>Catatan Kasir / Alasan Selisih:</span>
          </div>
          <p className="text-zinc-700 dark:text-zinc-300 text-xs italic pl-5">
            &ldquo;{summary.notes.trim()}&rdquo;
          </p>
        </div>
      )}

      {/* Action Buttons: Print via Printer Agent & Finish */}
      <div className="pt-2 flex flex-col gap-2">
        <button
          type="button"
          onClick={handlePrintReceipt}
          disabled={isPrinting}
          className="w-full py-3 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:bg-zinc-400 text-white text-xs font-bold transition-all cursor-pointer shadow-sm flex items-center justify-center gap-2"
        >
          {isPrinting ? (
            <>
              <Spinner className="w-4 h-4" />
              <span>Mengirim Struk ke Printer Agent...</span>
            </>
          ) : printSuccess ? (
            <>
              <CheckCircle2 className="w-4 h-4 text-emerald-300" />
              <span>Cetak Ulang Struk Rekonsiliasi</span>
            </>
          ) : (
            <>
              <Printer className="w-4 h-4" />
              <span>Cetak Struk Rekonsiliasi (Printer Agent)</span>
            </>
          )}
        </button>

        <button
          type="button"
          onClick={onFinish}
          className="w-full py-2.5 px-4 rounded-xl border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300 text-xs font-semibold transition-colors cursor-pointer"
        >
          Selesai & Tutup Jendela
        </button>
      </div>
    </div>
  );
}
