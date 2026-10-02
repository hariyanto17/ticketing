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
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useToast } from "@/components/ui/toast";
import { DataTable } from "@/components/ui/data-table";
import { DeleteDialog } from "@/components/ui/dialogs";
import { Button } from "@/components/ui/form-controls";
import { Tag, Plus, Edit, Trash, Percent, Gift, Film, CheckCircle2, Clock } from "lucide-react";
import { useTranslation } from "@/lib/i18n";

// Modular Subcomponents
import { PromotionFormModal } from "@/components/admin/promotions/PromotionFormModal";
import { PromotionsFilterBar } from "@/components/admin/promotions/PromotionsFilterBar";

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

  const [search] = useState("");
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

  const form = useForm<PromoFormValues>({
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

  const handleOpenCreate = () => {
    setEditingPromo(null);
    const start = new Date();
    const end = new Date();
    end.setDate(end.getDate() + 30);

    form.reset({
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
    form.reset({
      name: promo.name,
      code: promo.code || "",
      promoType: promo.promoType,
      buyQty: promo.buyQty || 1,
      getQty: promo.getQty || 1,
      discountPercent: promo.discountPercent || 0,
      maxDiscount: promo.maxDiscount || null,
      quota: promo.quota,
      minTickets: promo.minTickets || 1,
      maxUsagePerOrder: promo.maxUsagePerOrder || null,
      startDate: new Date(promo.startDate).toISOString().slice(0, 16),
      endDate: new Date(promo.endDate).toISOString().slice(0, 16),
      isActive: promo.isActive,
      movieIds: promo.movies?.map((m) => m.movieId) || [],
    });
    setIsModalOpen(true);
  };

  const onSubmit = async (values: PromoFormValues) => {
    try {
      const payload: any = {
        name: values.name.trim(),
        code: values.code ? values.code.trim().toUpperCase() : null,
        promoType: values.promoType,
        quota: Number(values.quota),
        minTickets: Number(values.minTickets) || 1,
        maxUsagePerOrder: values.maxUsagePerOrder ? Number(values.maxUsagePerOrder) : null,
        startDate: new Date(values.startDate).toISOString(),
        endDate: new Date(values.endDate).toISOString(),
        isActive: values.isActive,
        movieIds: values.movieIds || [],
      };

      if (values.promoType === "BUY_X_GET_Y") {
        payload.buyQty = Number(values.buyQty) || 1;
        payload.getQty = Number(values.getQty) || 1;
        payload.discountPercent = null;
        payload.maxDiscount = null;
      } else {
        payload.discountPercent = Number(values.discountPercent) || 0;
        payload.maxDiscount = values.maxDiscount ? Number(values.maxDiscount) : null;
        payload.buyQty = null;
        payload.getQty = null;
      }

      if (editingPromo) {
        await updatePromotion({ id: editingPromo.id, data: payload }).unwrap();
        toastSuccess(t("promotions.updated") || "Promo berhasil diperbarui");
      } else {
        await createPromotion(payload).unwrap();
        toastSuccess(t("promotions.created") || "Promo berhasil ditambahkan");
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
            <div
              className={`flex items-center gap-1 font-semibold ${
                isExpired ? "text-rose-500" : "text-zinc-500 dark:text-zinc-400"
              }`}
            >
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
    <div className="p-6 md:p-8 space-y-8 max-w-7xl mx-auto font-sans">
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
      <PromotionsFilterBar filterType={filterType} setFilterType={setFilterType} setPage={setPage} />

      {/* Promotions Table */}
      <DataTable
        columns={columns}
        data={promotionsList}
        isLoading={isLoading}
        pagination={
          totalPages > 1
            ? {
                currentPage: page,
                totalPages,
                onPageChange: setPage,
              }
            : undefined
        }
      />

      {/* Promotion Form Modal */}
      <PromotionFormModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        editingPromo={editingPromo}
        form={form}
        onSubmit={onSubmit}
        isSaving={editingPromo ? isUpdating : isCreating}
        movies={moviesResponse?.data}
      />

      {/* Delete Confirmation Dialog */}
      <DeleteDialog
        isOpen={Boolean(deletingPromo)}
        onClose={() => setDeletingPromo(null)}
        onConfirm={handleDeleteConfirm}
        title={t("promotions.deleteTitle") || "Hapus Promosi"}
        message={
          deletingPromo
            ? `Apakah Anda yakin ingin menghapus promo "${deletingPromo.name}"? Tindakan ini tidak dapat dibatalkan.`
            : ""
        }
        isLoading={isDeleting}
      />
    </div>
  );
}
