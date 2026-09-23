"use client";

import React, { useState } from "react";
import {
  useGetPromotionsQuery,
  useCreatePromotionMutation,
  useUpdatePromotionMutation,
  useDeletePromotionMutation,
  Promotion,
} from "@/services/promotionApi";
import { useGetMoviesQuery } from "@/services/movieApi";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useToast } from "@/components/ui/toast";
import { DataTable } from "@/components/ui/data-table";
import { Modal } from "@/components/ui/modal";
import { DeleteDialog } from "@/components/ui/dialogs";
import { Input, Select, Button } from "@/components/ui/form-controls";
import {
  Tag,
  Plus,
  Edit,
  Trash,
  Ticket,
  Percent,
  Gift,
  Film,
  Calendar,
  CheckCircle2,
  XCircle,
  Clock,
  AlertCircle,
} from "lucide-react";
import { useTranslation } from "@/lib/i18n";

const promoFormSchema = z.object({
  name: z.string().min(1, "Nama promo wajib diisi"),
  code: z.string().trim().toUpperCase().optional().nullable(),
  promoType: z.enum(["BUY_X_GET_Y", "PERCENTAGE"]),
  discountPercent: z.preprocess(
    (val) => (val === "" || val === null || val === undefined ? null : Number(val)),
    z.number().min(1).max(100).nullable().optional()
  ),
  maxDiscount: z.preprocess(
    (val) => (val === "" || val === null || val === undefined ? null : Number(val)),
    z.number().nonnegative().nullable().optional()
  ),
  buyQty: z.preprocess(
    (val) => (val === "" || val === null || val === undefined ? 1 : Number(val)),
    z.number().int().positive().nullable().optional()
  ),
  getQty: z.preprocess(
    (val) => (val === "" || val === null || val === undefined ? 1 : Number(val)),
    z.number().int().positive().nullable().optional()
  ),
  quota: z.preprocess(
    (val) => (val === "" || val === null || val === undefined ? 100 : Number(val)),
    z.number().int().positive("Kuota tiket harus lebih dari 0")
  ),
  minTickets: z.preprocess(
    (val) => (val === "" || val === null || val === undefined ? 1 : Number(val)),
    z.number().int().positive().optional()
  ),
  maxUsagePerOrder: z.preprocess(
    (val) => (val === "" || val === null || val === undefined ? null : Number(val)),
    z.number().int().positive().nullable().optional()
  ),
  startDate: z.string().min(1, "Tanggal mulai berlaku wajib diisi"),
  endDate: z.string().min(1, "Tanggal expired wajib diisi"),
  isActive: z.boolean().default(true),
  movieIds: z.array(z.string()).default([]),
});

type PromoFormValues = z.infer<typeof promoFormSchema>;

export default function PromotionsAdminPage() {
  const { t } = useTranslation();
  const { success: toastSuccess, error: toastError } = useToast();

  const [search, setSearch] = useState("");
  const [filterType, setFilterType] = useState("");
  const [page, setPage] = useState(1);

  // Queries
  const { data: promotionsResponse, isLoading } = useGetPromotionsQuery({
    page,
    search: search || undefined,
    promoType: filterType || undefined,
  });

  const { data: moviesResponse } = useGetMoviesQuery({ page: 1 });

  // Mutations
  const [createPromotion, { isLoading: isCreating }] = useCreatePromotionMutation();
  const [updatePromotion, { isLoading: isUpdating }] = useUpdatePromotionMutation();
  const [deletePromotion, { isLoading: isDeleting }] = useDeletePromotionMutation();

  // Modals state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingPromo, setEditingPromo] = useState<Promotion | null>(null);
  const [deletingPromo, setDeletingPromo] = useState<Promotion | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    control,
    formState: { errors },
  } = useForm<PromoFormValues>({
    resolver: zodResolver(promoFormSchema),
    defaultValues: {
      name: "",
      code: "",
      promoType: "BUY_X_GET_Y",
      buyQty: 1,
      getQty: 1,
      discountPercent: 20,
      maxDiscount: null,
      quota: 100,
      minTickets: 1,
      maxUsagePerOrder: null,
      startDate: new Date().toISOString().slice(0, 16),
      endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 16),
      isActive: true,
      movieIds: [],
    },
  });

  const selectedPromoType = watch("promoType");
  const selectedMovieIds = watch("movieIds") || [];

  const handleOpenCreate = () => {
    setEditingPromo(null);
    const start = new Date();
    const end = new Date();
    end.setDate(end.getDate() + 30);

    reset({
      name: "",
      code: "",
      promoType: "BUY_X_GET_Y",
      buyQty: 1,
      getQty: 1,
      discountPercent: 20,
      maxDiscount: null,
      quota: 100,
      minTickets: 1,
      maxUsagePerOrder: null,
      startDate: start.toISOString().slice(0, 16),
      endDate: end.toISOString().slice(0, 16),
      isActive: true,
      movieIds: [],
    });
    setIsModalOpen(true);
  };

  const handleOpenEdit = (promo: Promotion) => {
    setEditingPromo(promo);
    const start = new Date(promo.startDate).toISOString().slice(0, 16);
    const end = new Date(promo.endDate).toISOString().slice(0, 16);

    reset({
      name: promo.name,
      code: promo.code || "",
      promoType: promo.promoType,
      buyQty: promo.buyQty ?? 1,
      getQty: promo.getQty ?? 1,
      discountPercent: promo.discountPercent ?? null,
      maxDiscount: promo.maxDiscount ?? null,
      quota: promo.quota,
      minTickets: promo.minTickets ?? 1,
      maxUsagePerOrder: promo.maxUsagePerOrder ?? null,
      startDate: start,
      endDate: end,
      isActive: promo.isActive,
      movieIds: promo.movies ? promo.movies.map((m) => m.movieId) : [],
    });
    setIsModalOpen(true);
  };

  const onSubmit = async (values: PromoFormValues) => {
    try {
      const payload = {
        ...values,
        code: values.code?.trim() || null,
        startDate: new Date(values.startDate).toISOString(),
        endDate: new Date(values.endDate).toISOString(),
      };

      if (editingPromo) {
        await updatePromotion({ id: editingPromo.id, data: payload }).unwrap();
        toastSuccess(t("promotions.updated") || "Promo berhasil diperbarui");
      } else {
        await createPromotion(payload).unwrap();
        toastSuccess(t("promotions.created") || "Promo berhasil dibuat");
      }
      setIsModalOpen(false);
    } catch (err: any) {
      toastError(err?.data?.message || t("promotions.saveFailed") || "Gagal menyimpan promo");
    }
  };

  const handleDeleteConfirm = async () => {
    if (!deletingPromo) return;
    try {
      await deletePromotion(deletingPromo.id).unwrap();
      toastSuccess(t("promotions.deleted") || "Promo berhasil dihapus");
      setDeletingPromo(null);
    } catch (err: any) {
      toastError(err?.data?.message || t("promotions.deleteFailed") || "Gagal menghapus promo");
    }
  };

  const toggleMovieSelection = (movieId: string) => {
    const current = selectedMovieIds;
    if (current.includes(movieId)) {
      setValue("movieIds", current.filter((id) => id !== movieId));
    } else {
      setValue("movieIds", [...current, movieId]);
    }
  };

  // Table Columns
  const columns = [
    {
      key: "name",
      header: t("promotions.name") || "Promo",
      render: (promo: Promotion) => (
        <div className="flex items-center gap-3">
          <div
            className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
              promo.promoType === "BUY_X_GET_Y"
                ? "bg-amber-100 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 border border-amber-200 dark:border-amber-800"
                : "bg-indigo-100 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800"
            }`}
          >
            {promo.promoType === "BUY_X_GET_Y" ? <Gift className="w-5 h-5" /> : <Percent className="w-5 h-5" />}
          </div>
          <div>
            <div className="font-bold text-zinc-900 dark:text-zinc-50">{promo.name}</div>
            <div className="text-xs text-zinc-500 dark:text-zinc-400 flex items-center gap-2 mt-0.5">
              {promo.code ? (
                <span className="font-mono px-1.5 py-0.5 bg-zinc-100 dark:bg-zinc-800 rounded text-[11px] font-semibold text-zinc-700 dark:text-zinc-300">
                  {promo.code}
                </span>
              ) : (
                <span className="text-zinc-400 italic">Auto-apply</span>
              )}
              <span>•</span>
              <span className="font-medium text-zinc-600 dark:text-zinc-300">
                {promo.promoType === "BUY_X_GET_Y"
                  ? `Buy ${promo.buyQty} Get ${promo.getQty}`
                  : `Diskon ${promo.discountPercent}%${promo.maxDiscount ? ` (Maks Rp ${promo.maxDiscount.toLocaleString()})` : ""}`}
              </span>
            </div>
          </div>
        </div>
      ),
    },
    {
      key: "movies",
      header: t("promotions.applicableMovies") || "Film Berlaku",
      render: (promo: Promotion) => {
        const movies = promo.movies || [];
        if (movies.length === 0) {
          return (
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800">
              <CheckCircle2 className="w-3.5 h-3.5" /> Semua Film
            </span>
          );
        }
        return (
          <div className="flex flex-wrap gap-1 max-w-xs">
            {movies.map((pm) => (
              <span
                key={pm.movieId}
                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-semibold bg-zinc-100 dark:bg-zinc-800 text-zinc-800 dark:text-zinc-200 border border-zinc-200 dark:border-zinc-700"
              >
                <Film className="w-3 h-3 text-indigo-500" />
                <span className="truncate max-w-[140px]">{pm.movie?.title || "Film"}</span>
              </span>
            ))}
          </div>
        );
      },
    },
    {
      key: "quota",
      header: t("promotions.quota") || "Kuota Tiket",
      render: (promo: Promotion) => {
        const remaining = Math.max(0, promo.quota - promo.usedQuota);
        const percentage = Math.min(100, Math.round((promo.usedQuota / promo.quota) * 100));

        return (
          <div className="space-y-1.5 w-36">
            <div className="flex justify-between text-xs font-semibold">
              <span className="text-zinc-500 dark:text-zinc-400">
                {promo.usedQuota} / {promo.quota}
              </span>
              <span className={remaining === 0 ? "text-rose-500 font-bold" : "text-emerald-600 dark:text-emerald-400"}>
                {remaining === 0 ? "Habis" : `Sisa ${remaining}`}
              </span>
            </div>
            <div className="w-full h-1.5 bg-zinc-100 dark:bg-zinc-800 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all ${
                  remaining === 0
                    ? "bg-rose-500"
                    : percentage > 80
                    ? "bg-amber-500"
                    : "bg-indigo-600 dark:bg-indigo-500"
                }`}
                style={{ width: `${percentage}%` }}
              />
            </div>
          </div>
        );
      },
    },
    {
      key: "validity",
      header: "Masa Berlaku",
      render: (promo: Promotion) => {
        const start = new Date(promo.startDate);
        const end = new Date(promo.endDate);
        const now = new Date();
        const isExpired = now > end;

        return (
          <div className="text-xs space-y-0.5">
            <div className="text-zinc-700 dark:text-zinc-300 font-medium">
              {start.toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" })}
            </div>
            <div className={`flex items-center gap-1 font-semibold ${isExpired ? "text-rose-500" : "text-zinc-500 dark:text-zinc-400"}`}>
              <Clock className="w-3 h-3" />
              <span>s/d {end.toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" })}</span>
            </div>
          </div>
        );
      },
    },
    {
      key: "status",
      header: t("promotions.status") || "Status",
      render: (promo: Promotion) => {
        const now = new Date();
        const isExpired = now > new Date(promo.endDate);
        const isExhausted = promo.usedQuota >= promo.quota;

        if (!promo.isActive) {
          return (
            <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400">
              Nonaktif
            </span>
          );
        }
        if (isExpired) {
          return (
            <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-rose-100 text-rose-700 dark:bg-rose-950/40 dark:text-rose-400 border border-rose-200 dark:border-rose-900">
              Expired
            </span>
          );
        }
        if (isExhausted) {
          return (
            <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400 border border-amber-200 dark:border-amber-900">
              Kuota Habis
            </span>
          );
        }
        return (
          <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800">
            Aktif
          </span>
        );
      },
    },
    {
      key: "actions",
      header: "Aksi",
      render: (promo: Promotion) => (
        <div className="flex items-center gap-1.5 justify-end">
          <button
            type="button"
            onClick={() => handleOpenEdit(promo)}
            className="p-1.5 rounded-lg border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-600 dark:text-zinc-300 transition-colors"
            title="Edit Promo"
          >
            <Edit className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => setDeletingPromo(promo)}
            className="p-1.5 rounded-lg border border-rose-200 dark:border-rose-900/40 hover:bg-rose-50 dark:hover:bg-rose-950/20 text-rose-600 dark:text-rose-400 transition-colors"
            title="Hapus Promo"
          >
            <Trash className="w-4 h-4" />
          </button>
        </div>
      ),
    },
  ];

  const promotionsList = promotionsResponse?.data || [];
  const totalPages = promotionsResponse?.meta?.totalPages || 1;

  return (
    <div className="p-6 md:p-8 space-y-8 max-w-7xl mx-auto">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50 flex items-center gap-2.5">
            <Tag className="w-7 h-7 text-indigo-600 dark:text-indigo-400" />
            {t("promotions.title") || "Manajemen Promosi & Diskon"}
          </h1>
          <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">
            {t("promotions.subtitle") ||
              "Kelola promo Buy 1 Get 1 (BOGO), potongan persen, kuota tiket, dan masa berlaku film."}
          </p>
        </div>
        <Button onClick={handleOpenCreate} className="flex items-center gap-2 shrink-0">
          <Plus className="w-4 h-4" />
          <span>{t("promotions.add") || "Tambah Promo"}</span>
        </Button>
      </div>

      {/* Filter Controls */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <select
            value={filterType}
            onChange={(e) => {
              setFilterType(e.target.value);
              setPage(1);
            }}
            className="px-3.5 py-2 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl text-sm font-medium text-zinc-800 dark:text-zinc-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
          >
            <option value="">{t("promotions.allTypes") || "Semua Tipe"}</option>
            <option value="BUY_X_GET_Y">{t("promotions.typeBogo") || "Buy 1 Get 1 (BOGO)"}</option>
            <option value="PERCENTAGE">{t("promotions.typePercentage") || "Potongan Persen (%)"}</option>
          </select>
        </div>
      </div>

      {/* Promotions Table */}
      <DataTable
        columns={columns}
        data={promotionsList}
        isLoading={isLoading}
        searchPlaceholder={t("promotions.searchPlaceholder") || "Cari promo berdasarkan nama atau kode..."}
        onSearch={(query) => {
          setSearch(query);
          setPage(1);
        }}
        pagination={{
          currentPage: page,
          totalPages,
          onPageChange: setPage,
        }}
      />

      {/* CREATE / EDIT MODAL */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingPromo ? t("promotions.editTitle") || "Edit Promo" : t("promotions.addTitle") || "Tambah Promo Baru"}
        size="lg"
      >
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Promo Name */}
            <Input
              label={t("promotions.name") || "Nama Promo"}
              placeholder="cth: Promo Buy 1 Get 1 Opening"
              {...register("name")}
              error={errors.name?.message}
            />

            {/* Promo Code */}
            <Input
              label={t("promotions.code") || "Kode Promo (Opsional)"}
              placeholder="cth: BOGO100"
              {...register("code")}
              error={errors.code?.message}
            />
          </div>

          {/* Promo Type Selector */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
              {t("promotions.type") || "Tipe Promo"}
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setValue("promoType", "BUY_X_GET_Y")}
                className={`p-4 rounded-2xl border text-left transition-all cursor-pointer flex items-start gap-3 ${
                  selectedPromoType === "BUY_X_GET_Y"
                    ? "border-amber-500 bg-amber-50/40 dark:bg-amber-950/30 ring-2 ring-amber-500/20"
                    : "border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 hover:border-zinc-300 dark:hover:border-zinc-700"
                }`}
              >
                <Gift className="w-5 h-5 text-amber-500 mt-0.5 shrink-0" />
                <div>
                  <div className="font-bold text-sm text-zinc-900 dark:text-zinc-50">Buy 1 Get 1 (BOGO)</div>
                  <div className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">Beli X tiket gratis Y tiket</div>
                </div>
              </button>

              <button
                type="button"
                onClick={() => setValue("promoType", "PERCENTAGE")}
                className={`p-4 rounded-2xl border text-left transition-all cursor-pointer flex items-start gap-3 ${
                  selectedPromoType === "PERCENTAGE"
                    ? "border-indigo-500 bg-indigo-50/40 dark:bg-indigo-950/30 ring-2 ring-indigo-500/20"
                    : "border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 hover:border-zinc-300 dark:hover:border-zinc-700"
                }`}
              >
                <Percent className="w-5 h-5 text-indigo-500 mt-0.5 shrink-0" />
                <div>
                  <div className="font-bold text-sm text-zinc-900 dark:text-zinc-50">Diskon Persen (%)</div>
                  <div className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">Potongan persen dari harga tiket</div>
                </div>
              </button>
            </div>
          </div>

          {/* Conditional Fields based on Type */}
          {selectedPromoType === "BUY_X_GET_Y" ? (
            <div className="grid grid-cols-2 gap-4 p-4 bg-amber-50/30 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/40 rounded-2xl">
              <Input
                type="number"
                min="1"
                label={t("promotions.buyQty") || "Beli Berapa Tiket (Buy Qty)"}
                {...register("buyQty")}
                error={errors.buyQty?.message}
              />
              <Input
                type="number"
                min="1"
                label={t("promotions.getQty") || "Gratis Berapa Tiket (Get Qty)"}
                {...register("getQty")}
                error={errors.getQty?.message}
              />
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-indigo-50/30 dark:bg-indigo-950/20 border border-indigo-200 dark:border-indigo-900/40 rounded-2xl">
              <Input
                type="number"
                min="1"
                max="100"
                label={t("promotions.discountPercent") || "Diskon (%)"}
                placeholder="20"
                {...register("discountPercent")}
                error={errors.discountPercent?.message}
              />
              <Input
                type="number"
                min="0"
                label={t("promotions.maxDiscount") || "Maksimal Potongan Diskon (Rp) (Opsional)"}
                placeholder="cth: 50000"
                {...register("maxDiscount")}
                error={errors.maxDiscount?.message}
              />
            </div>
          )}

          {/* Quota and Minimum Tickets */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              type="number"
              min="1"
              label={t("promotions.quota") || "Total Kuota Tiket Promo"}
              placeholder="100"
              {...register("quota")}
              error={errors.quota?.message}
            />
            <Input
              type="number"
              min="1"
              label={t("promotions.minTickets") || "Minimal Pembelian Tiket"}
              placeholder="1"
              {...register("minTickets")}
              error={errors.minTickets?.message}
            />
          </div>

          {/* Start & End Dates */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              type="datetime-local"
              label={t("promotions.startDate") || "Tanggal Mulai Berlaku"}
              {...register("startDate")}
              error={errors.startDate?.message}
            />
            <Input
              type="datetime-local"
              label={t("promotions.endDate") || "Tanggal Expired / Berakhir"}
              {...register("endDate")}
              error={errors.endDate?.message}
            />
          </div>

          {/* Movie Assignment */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300 flex items-center gap-2">
                <Film className="w-4 h-4 text-indigo-500" />
                {t("promotions.applicableMovies") || "Pilih Film yang Berlaku"}
              </label>
              {selectedMovieIds.length > 0 && (
                <button
                  type="button"
                  onClick={() => setValue("movieIds", [])}
                  className="text-xs text-indigo-600 dark:text-indigo-400 hover:underline cursor-pointer"
                >
                  Pilih Semua Film ({selectedMovieIds.length} dipilih)
                </button>
              )}
            </div>

            <div className="p-3 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-2xl max-h-48 overflow-y-auto space-y-1.5">
              {moviesResponse?.data?.map((movie) => {
                const isSelected = selectedMovieIds.includes(movie.id);
                return (
                  <label
                    key={movie.id}
                    onClick={() => toggleMovieSelection(movie.id)}
                    className={`flex items-center justify-between p-2.5 rounded-xl border text-xs font-semibold cursor-pointer transition-all ${
                      isSelected
                        ? "border-indigo-500 bg-indigo-50/50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300"
                        : "border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-zinc-700 dark:text-zinc-300 hover:border-zinc-300"
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => {}} // Handled by container
                        className="rounded border-zinc-300 text-indigo-600 focus:ring-indigo-500"
                      />
                      <span>{movie.title}</span>
                    </div>
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800 text-zinc-500">
                      {movie.censorshipRating}
                    </span>
                  </label>
                );
              })}
              {(!moviesResponse?.data || moviesResponse.data.length === 0) && (
                <p className="text-xs text-zinc-400 italic p-2">Tidak ada data film.</p>
              )}
            </div>
            <p className="text-xs text-zinc-400">
              * Jika tidak ada film yang dipilih, promo akan berlaku untuk <strong>semua film</strong>.
            </p>
          </div>

          {/* Active Status Switch */}
          <div className="flex items-center gap-3 pt-2">
            <Controller
              control={control}
              name="isActive"
              render={({ field }) => (
                <label className="flex items-center gap-2.5 cursor-pointer text-sm font-medium text-zinc-800 dark:text-zinc-200">
                  <input
                    type="checkbox"
                    checked={field.value}
                    onChange={(e) => field.onChange(e.target.checked)}
                    className="w-4 h-4 rounded border-zinc-300 text-indigo-600 focus:ring-indigo-500"
                  />
                  <span>Aktifkan promo ini sekarang</span>
                </label>
              )}
            />
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-zinc-100 dark:border-zinc-800">
            <Button
              type="button"
              variant="secondary"
              onClick={() => setIsModalOpen(false)}
            >
              {t("common.cancel") || "Batal"}
            </Button>
            <Button
              type="submit"
              isLoading={isCreating || isUpdating}
            >
              {t("common.save") || "Simpan Promo"}
            </Button>
          </div>
        </form>
      </Modal>

      {/* DELETE DIALOG */}
      <DeleteDialog
        isOpen={Boolean(deletingPromo)}
        onClose={() => setDeletingPromo(null)}
        onConfirm={handleDeleteConfirm}
        title={t("promotions.deleteTitle") || "Hapus Promo"}
        message={`${t("promotions.deleteConfirm") || "Apakah Anda yakin ingin menghapus promo"} "${deletingPromo?.name}"?`}
        isLoading={isDeleting}
      />
    </div>
  );
}
