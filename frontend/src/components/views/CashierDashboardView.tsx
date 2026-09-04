"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
  useGetSettingsQuery,
  useGetReportsQuery,
  useGetActiveDrawerQuery,
  useOpenDrawerMutation,
  useCloseDrawerMutation,
} from "@/services/opsApi";
import { useAppSelector } from "@/store/hooks";
import {
  Ticket,
  Receipt,
  Printer,
  ShieldCheck,
  Calendar,
  DollarSign,
  ArrowRight,
  Sparkles,
  Lock,
  Unlock,
  AlertCircle,
  HelpCircle,
} from "lucide-react";
import { Spinner } from "@/components/ui/spinner";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/form-controls";
import { useToast } from "@/components/ui/toast";
import { useTranslation } from "@/lib/i18n";

export default function CashierDashboardView() {
  const { t, formatDate, formatNumber, formatCurrency } = useTranslation();
  const user = useAppSelector((state) => state.auth.user);
  const { success: toastSuccess, error: toastError } = useToast();

  const { data: settings, isLoading: settingsLoading } = useGetSettingsQuery();
  const { data: reports, isLoading: reportsLoading } = useGetReportsQuery();
  const {
    data: activeDrawer,
    isLoading: drawerLoading,
    refetch: refetchDrawer,
  } = useGetActiveDrawerQuery();

  const [openDrawer, { isLoading: isOpeningDrawer }] = useOpenDrawerMutation();
  const [closeDrawer, { isLoading: isClosingDrawer }] = useCloseDrawerMutation();

  const [isOpenDrawerModalOpen, setIsOpenDrawerModalOpen] = useState(false);
  const [isCloseDrawerModalOpen, setIsCloseDrawerModalOpen] = useState(false);
  const [drawerOpeningBalance, setDrawerOpeningBalance] = useState<number>(0);
  const [drawerActualBalance, setDrawerActualBalance] = useState<number>(0);
  const [drawerSummary, setDrawerSummary] = useState<any | null>(null);

  const businessDate = settings?.businessDate || new Date().toISOString().split("T")[0];
  const todayRevenue = reports?.dailySales?.find((s) => s.date === businessDate)?.revenue || 0;
  const todayTickets = reports?.dailySales?.find((s) => s.date === businessDate)?.ticketCount || 0;

  const handleOpenDrawer = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await openDrawer({ openingBalance: Number(drawerOpeningBalance) }).unwrap();
      toastSuccess(t("cashier.drawerOpened"));
      setIsOpenDrawerModalOpen(false);
      refetchDrawer();
    } catch (err: any) {
      toastError(err?.data?.message || t("cashier.drawerOpenFailed"));
    }
  };

  const handleCloseDrawer = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await closeDrawer({ actualBalance: Number(drawerActualBalance) }).unwrap();
      setDrawerSummary(res);
      toastSuccess(t("cashier.drawerClosed"));
      refetchDrawer();
    } catch (err: any) {
      toastError(err?.data?.message || t("cashier.drawerCloseFailed"));
    }
  };

  const quickActions = [
    {
      title: "Point of Sale (POS)",
      description: "Penjualan tiket loket, pemilihan kursi langsung, dan pembayaran tunai / QRIS.",
      href: "/cashier/pos",
      icon: <Ticket className="w-8 h-8 text-indigo-500" />,
      badge: "Operasional Utama",
      badgeColor: "bg-indigo-50 text-indigo-600 dark:bg-indigo-950/50 dark:text-indigo-400",
      accentBorder: "hover:border-indigo-500/50",
    },
    {
      title: "Riwayat Transaksi",
      description: "Daftar struk transaksi penjualan, cetak ulang tiket, dan manajemen refund/void.",
      href: "/cashier/transactions",
      icon: <Receipt className="w-8 h-8 text-emerald-500" />,
      badge: "Laporan Kasir",
      badgeColor: "bg-emerald-50 text-emerald-600 dark:bg-emerald-950/50 dark:text-emerald-400",
      accentBorder: "hover:border-emerald-500/50",
    },
    {
      title: "Validasi Tiket Masuk",
      description: "Pemeriksaan dan scanning tiket penonton sebelum memasuki studio bioskop.",
      href: "/cashier/tickets/validate",
      icon: <ShieldCheck className="w-8 h-8 text-amber-500" />,
      badge: "Gate Scanner",
      badgeColor: "bg-amber-50 text-amber-600 dark:bg-amber-950/50 dark:text-amber-400",
      accentBorder: "hover:border-amber-500/50",
    },
    {
      title: "Penutupan Harian (Closing)",
      description: "Rekap penjualan shift harian, verifikasi penerimaan kas, dan serah terima.",
      href: "/cashier/closing",
      icon: <Calendar className="w-8 h-8 text-purple-500" />,
      badge: "End of Shift",
      badgeColor: "bg-purple-50 text-purple-600 dark:bg-purple-950/50 dark:text-purple-400",
      accentBorder: "hover:border-purple-500/50",
    },
  ];

  return (
    <div className="space-y-8 font-sans">
      {/* Welcome Banner */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-indigo-600 via-indigo-700 to-purple-800 text-white p-8 shadow-xl">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center md:justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/15 backdrop-blur-md text-xs font-semibold tracking-wide uppercase text-indigo-100">
              <Sparkles className="w-3.5 h-3.5" />
              Kasir Ticket Workspace
            </div>
            <h1 className="text-3xl sm:text-4xl font-black tracking-tight">
              Halo, {user?.name || "Kasir"}! 👋
            </h1>
            <p className="text-indigo-100/90 text-sm sm:text-base max-w-xl">
              Selamat bertugas di Planet Cinema. Pastikan laci kas (cash drawer) telah dibuka sebelum melayani transaksi tiket loket.
            </p>
          </div>

          {/* Shift / Cash Drawer Status Card */}
          <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl p-5 min-w-[260px] flex flex-col gap-3">
            <div className="flex items-center justify-between text-xs font-medium text-indigo-100">
              <span>Status Laci Kas</span>
              {drawerLoading ? (
                <Spinner className="w-4 h-4 text-white" />
              ) : activeDrawer ? (
                <span className="flex items-center gap-1.5 text-emerald-300 font-bold">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  TERBUKA (AKTIF)
                </span>
              ) : (
                <span className="flex items-center gap-1.5 text-amber-300 font-bold">
                  <span className="w-2 h-2 rounded-full bg-amber-400" />
                  TERTUTUP
                </span>
              )}
            </div>

            {activeDrawer ? (
              <div className="space-y-1">
                <div className="text-xs text-indigo-200">Modal Awal Kas:</div>
                <div className="text-xl font-black tracking-tight">
                  {formatCurrency(Number(activeDrawer.openingBalance))}
                </div>
                <button
                  onClick={() => setIsCloseDrawerModalOpen(true)}
                  className="w-full mt-2 py-2 px-3 rounded-xl bg-rose-500/80 hover:bg-rose-500 text-white font-semibold text-xs transition flex items-center justify-center gap-2 cursor-pointer shadow-sm"
                >
                  <Lock className="w-3.5 h-3.5" />
                  Tutup Laci Kas (End Shift)
                </button>
              </div>
            ) : (
              <div className="space-y-1">
                <div className="text-xs text-indigo-200">Sesi shift belum aktif</div>
                <button
                  onClick={() => setIsOpenDrawerModalOpen(true)}
                  className="w-full mt-2 py-2 px-3 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white font-semibold text-xs transition flex items-center justify-center gap-2 cursor-pointer shadow-sm"
                >
                  <Unlock className="w-3.5 h-3.5" />
                  Buka Laci Kas Baru
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Ambient background blur elements */}
        <div className="absolute -right-16 -top-16 w-64 h-64 bg-white/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -left-16 -bottom-16 w-64 h-64 bg-purple-500/20 rounded-full blur-3xl pointer-events-none" />
      </div>

      {/* Stats Overview Cards */}
      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        <div className="p-6 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl shadow-sm hover:shadow-md transition flex items-start justify-between">
          <div className="space-y-2">
            <span className="text-sm text-zinc-500 dark:text-zinc-400 font-medium">
              Tanggal Operasional
            </span>
            <div className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">
              {settingsLoading ? <Spinner className="w-5 h-5" /> : formatDate(businessDate, { dateStyle: "medium" })}
            </div>
            <p className="text-xs text-zinc-400">Zona Waktu: {settings?.timezone || "UTC"}</p>
          </div>
          <div className="p-3 bg-purple-50 dark:bg-purple-950/40 text-purple-600 dark:text-purple-400 rounded-2xl">
            <Calendar className="w-6 h-6" />
          </div>
        </div>

        <div className="p-6 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl shadow-sm hover:shadow-md transition flex items-start justify-between">
          <div className="space-y-2">
            <span className="text-sm text-zinc-500 dark:text-zinc-400 font-medium">
              Tiket Terjual Hari Ini
            </span>
            <div className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">
              {reportsLoading ? <Spinner className="w-5 h-5" /> : `${formatNumber(todayTickets)} Tiket`}
            </div>
            <p className="text-xs text-zinc-400">Total cetak aktif & digunakan</p>
          </div>
          <div className="p-3 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 rounded-2xl">
            <Ticket className="w-6 h-6" />
          </div>
        </div>

        <div className="p-6 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl shadow-sm hover:shadow-md transition flex items-start justify-between">
          <div className="space-y-2">
            <span className="text-sm text-zinc-500 dark:text-zinc-400 font-medium">
              Total Pendapatan Tiket
            </span>
            <div className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">
              {reportsLoading ? <Spinner className="w-5 h-5" /> : formatCurrency(todayRevenue)}
            </div>
            <p className="text-xs text-zinc-400">Transaksi lunas {businessDate}</p>
          </div>
          <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 rounded-2xl">
            <DollarSign className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* Quick Action Navigation Cards */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold text-zinc-900 dark:text-zinc-50">
            Menu Operasional Kasir
          </h2>
          <span className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">
            Quick Actions
          </span>
        </div>

        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {quickActions.map((action, i) => (
            <Link
              key={i}
              href={action.href}
              className={`group p-6 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl shadow-sm hover:shadow-lg transition-all duration-200 flex flex-col justify-between gap-6 ${action.accentBorder}`}
            >
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="p-3 bg-zinc-50 dark:bg-zinc-800/60 rounded-2xl group-hover:scale-105 transition-transform">
                    {action.icon}
                  </div>
                  <span className={`text-[11px] font-bold px-2.5 py-1 rounded-full ${action.badgeColor}`}>
                    {action.badge}
                  </span>
                </div>
                <div>
                  <h3 className="text-lg font-bold text-zinc-900 dark:text-zinc-50 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                    {action.title}
                  </h3>
                  <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1 leading-relaxed">
                    {action.description}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 text-xs font-bold text-indigo-600 dark:text-indigo-400 group-hover:translate-x-1 transition-transform">
                <span>Buka Modul</span>
                <ArrowRight className="w-4 h-4" />
              </div>
            </Link>
          ))}
        </div>
      </div>

      {/* Helper notice */}
      <div className="p-6 bg-indigo-50/60 dark:bg-indigo-950/20 border border-indigo-100 dark:border-indigo-900/30 rounded-3xl flex items-start gap-4 text-sm text-indigo-900 dark:text-indigo-300">
        <HelpCircle className="w-5 h-5 text-indigo-600 dark:text-indigo-400 shrink-0 mt-0.5" />
        <div className="space-y-1">
          <p className="font-semibold">Tips Pelayanan Kasir</p>
          <p className="text-xs text-indigo-700/80 dark:text-indigo-400/80 leading-relaxed">
            Untuk melayani pengunjung yang datang ke loket tiket, klik menu <strong>Point of Sale (POS)</strong>. Pelanggan dapat memilih pembayaran tunai maupun scan QRIS dinamis secara real-time.
          </p>
        </div>
      </div>

      {/* Open Drawer Modal */}
      <Modal
        isOpen={isOpenDrawerModalOpen}
        onClose={() => setIsOpenDrawerModalOpen(false)}
        title="Buka Sesi Laci Kas (Cash Drawer)"
      >
        <form onSubmit={handleOpenDrawer} className="space-y-4">
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            Masukkan jumlah modal uang tunai awal yang ada di laci kasir saat memulai shift.
          </p>
          <div>
            <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-1">
              Modal Awal Kas (IDR)
            </label>
            <input
              type="number"
              min="0"
              step="1000"
              required
              value={drawerOpeningBalance}
              onChange={(e) => setDrawerOpeningBalance(Number(e.target.value))}
              placeholder="Contoh: 500000"
              className="w-full px-4 py-2.5 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
          <div className="flex justify-end gap-2 pt-3 border-t border-zinc-100 dark:border-zinc-800">
            <Button
              type="button"
              variant="secondary"
              onClick={() => setIsOpenDrawerModalOpen(false)}
            >
              Batal
            </Button>
            <Button type="submit" isLoading={isOpeningDrawer}>
              Konfirmasi Buka Laci
            </Button>
          </div>
        </form>
      </Modal>

      {/* Close Drawer Modal */}
      <Modal
        isOpen={isCloseDrawerModalOpen}
        onClose={() => {
          setIsCloseDrawerModalOpen(false);
          setDrawerSummary(null);
        }}
        title="Tutup Sesi Laci Kas (End Shift)"
      >
        {!drawerSummary ? (
          <form onSubmit={handleCloseDrawer} className="space-y-4">
            <p className="text-sm text-zinc-500 dark:text-zinc-400">
              Hitung fisik uang tunai di laci kas dan masukkan jumlah aktual untuk rekonsiliasi.
            </p>
            <div>
              <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                Fisik Kas Aktual (IDR)
              </label>
              <input
                type="number"
                min="0"
                step="1000"
                required
                value={drawerActualBalance}
                onChange={(e) => setDrawerActualBalance(Number(e.target.value))}
                placeholder="Contoh: 1500000"
                className="w-full px-4 py-2.5 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <div className="flex justify-end gap-2 pt-3 border-t border-zinc-100 dark:border-zinc-800">
              <Button
                type="button"
                variant="secondary"
                onClick={() => setIsCloseDrawerModalOpen(false)}
              >
                Batal
              </Button>
              <Button type="submit" variant="danger" isLoading={isClosingDrawer}>
                Konfirmasi Tutup Laci
              </Button>
            </div>
          </form>
        ) : (
          <div className="space-y-4">
            <div className="p-4 bg-zinc-50 dark:bg-zinc-800 rounded-2xl space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-zinc-500">Modal Awal:</span>
                <span className="font-bold">{formatCurrency(Number(drawerSummary.openingBalance))}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-500">Ekspektasi Kas:</span>
                <span className="font-bold">{formatCurrency(Number(drawerSummary.expectedBalance || 0))}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-500">Fisik Kas Aktual:</span>
                <span className="font-bold">{formatCurrency(Number(drawerSummary.actualBalance || 0))}</span>
              </div>
              <div className="flex justify-between border-t border-zinc-200 dark:border-zinc-700 pt-2">
                <span className="text-zinc-500">Selisih Kas:</span>
                <span className={`font-bold ${(Number(drawerSummary.difference || 0)) < 0 ? "text-rose-500" : "text-emerald-500"}`}>
                  {formatCurrency(Number(drawerSummary.difference || 0))}
                </span>
              </div>
            </div>
            <Button
              className="w-full"
              onClick={() => {
                setIsCloseDrawerModalOpen(false);
                setDrawerSummary(null);
              }}
            >
              Selesai
            </Button>
          </div>
        )}
      </Modal>
    </div>
  );
}
