import React from "react";
import { Clock, RefreshCw, Sparkles, QrCode } from "lucide-react";
import { Spinner } from "@/components/ui/spinner";

interface QrisPaymentPanelProps {
  remainingSeconds: number;
  formatCountdown: (secs: number) => string;
  totalAmount: number;
  formatCurrency: (val: number) => string;
  handleManualCheckStatus: () => void;
  isCheckingStatus: boolean;
  handleSimulatePayment: () => void;
  isSimulating: boolean;
  isCreatingQris: boolean;
  qrisData: {
    qrUrl?: string;
    qrString?: string;
    expiredAt?: string;
  } | null;
}

export const QrisPaymentPanel: React.FC<QrisPaymentPanelProps> = ({
  remainingSeconds,
  formatCountdown,
  totalAmount,
  formatCurrency,
  handleManualCheckStatus,
  isCheckingStatus,
  handleSimulatePayment,
  isSimulating,
  isCreatingQris,
  qrisData,
}) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-12 gap-6 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl p-6 sm:p-8 shadow-sm items-center">
      {/* Left instructions */}
      <div className="md:col-span-7 space-y-5">
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-1 rounded-lg bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 text-xs font-bold border border-amber-200 dark:border-amber-800 flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 animate-spin" />
              <span>Sisa Waktu: {formatCountdown(remainingSeconds)}</span>
            </span>
          </div>
          <h2 className="text-lg font-bold text-zinc-900 dark:text-zinc-50">
            Scan QRIS untuk Menyelesaikan Pembayaran
          </h2>
          <p className="text-xs text-zinc-500 leading-relaxed">
            Buka aplikasi mobile banking (BCA, Mandiri, BRI, BNI) lalu scan QR code QRIS di samping.
          </p>
        </div>

        <div className="p-4 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-2xl space-y-1">
          <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block">
            Total Tagihan
          </span>
          <span className="text-2xl font-black text-indigo-600 dark:text-indigo-400">
            {formatCurrency(totalAmount)}
          </span>
        </div>

        <div className="flex flex-wrap gap-2.5">
          <button
            type="button"
            onClick={handleManualCheckStatus}
            disabled={isCheckingStatus}
            className="px-4 py-2.5 rounded-xl bg-zinc-900 dark:bg-zinc-50 text-white dark:text-zinc-900 text-xs font-bold transition-all hover:bg-zinc-800 dark:hover:bg-zinc-200 flex items-center gap-2 cursor-pointer shadow-sm"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isCheckingStatus ? "animate-spin" : ""}`} />
            <span>Cek Status Pembayaran</span>
          </button>

          <button
            type="button"
            onClick={handleSimulatePayment}
            disabled={isSimulating}
            className="px-3.5 py-2.5 rounded-xl border border-emerald-300 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 text-xs font-bold transition-all hover:bg-emerald-100 dark:hover:bg-emerald-900/60 flex items-center gap-1.5 cursor-pointer shadow-sm"
            title="Simulasi QRIS Berhasil (Sandbox Testing)"
          >
            <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
            <span>Simulasi Bayar (Testing)</span>
          </button>
        </div>
      </div>

      {/* Right QRIS Display */}
      <div className="md:col-span-5 flex flex-col items-center justify-center p-6 border-2 border-dashed border-indigo-200 dark:border-indigo-900/60 rounded-3xl bg-indigo-50/30 dark:bg-indigo-950/10 space-y-3 text-center">
        {isCreatingQris ? (
          <div className="py-12 flex flex-col items-center gap-2">
            <Spinner className="w-8 h-8 text-indigo-600" />
            <span className="text-xs text-zinc-400">Menghasilkan QRIS...</span>
          </div>
        ) : qrisData?.qrUrl ? (
          <div className="p-3 bg-white rounded-2xl shadow-md border border-zinc-200">
            <img
              src={qrisData.qrUrl}
              alt="Midtrans QRIS Code"
              className="w-48 h-48 object-contain rounded-xl"
            />
          </div>
        ) : (
          <div className="p-4 bg-white rounded-2xl shadow-md border border-zinc-200 flex items-center justify-center">
            <QrCode className="w-40 h-40 text-zinc-850" />
          </div>
        )}

        <div className="space-y-0.5">
          <span className="text-xs font-bold text-zinc-800 dark:text-zinc-200 block">
            QRIS Standar Pembayaran Nasional
          </span>
          <span className="text-[10px] text-zinc-400 block">
            Planet Cinema Payment Gateway
          </span>
        </div>
      </div>
    </div>
  );
};
