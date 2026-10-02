"use client";

import React from "react";
import { Modal } from "@/components/ui/modal";
import { Input, Select, Button } from "@/components/ui/form-controls";
import { Controller, UseFormReturn } from "react-hook-form";
import { Film, AlertCircle, Percent, Gift } from "lucide-react";
import { Movie } from "@/services/movieApi";
import { Promotion } from "@/services/promotionApi";
import { useTranslation } from "@/lib/i18n";

interface PromotionFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  editingPromo: Promotion | null;
  form: UseFormReturn<any>;
  onSubmit: (data: any) => void;
  isSaving: boolean;
  movies: Movie[] | undefined;
}

export function PromotionFormModal({
  isOpen,
  onClose,
  editingPromo,
  form,
  onSubmit,
  isSaving,
  movies,
}: PromotionFormModalProps) {
  const { t } = useTranslation();
  const {
    register,
    handleSubmit,
    watch,
    setValue,
    control,
    formState: { errors },
  } = form;

  const selectedPromoType = watch("promoType");
  const selectedMovieIds = watch("movieIds") || [];

  const toggleMovieSelection = (movieId: string) => {
    if (selectedMovieIds.includes(movieId)) {
      setValue(
        "movieIds",
        selectedMovieIds.filter((id: string) => id !== movieId)
      );
    } else {
      setValue("movieIds", [...selectedMovieIds, movieId]);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={editingPromo ? t("promotions.edit") || "Edit Promosi" : t("promotions.add") || "Tambah Promosi"}
    >
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
        {/* Promo Name & Code */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Input
            label={t("promotions.name") || "Nama Promo *"}
            placeholder="e.g. Diskon HUT Planet Cinema"
            error={errors.name?.message as string | undefined}
            {...register("name")}
          />
          <Input
            label="Kode Promo (Opsional)"
            placeholder="e.g. PLANETBOGO (Kosong = Auto-apply)"
            error={errors.code?.message as string | undefined}
            {...register("code")}
          />
        </div>

        {/* Promo Type Selector */}
        <div className="space-y-2">
          <label className="text-xs font-bold text-zinc-500 uppercase tracking-wider block">
            Tipe Diskon Promosi *
          </label>
          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => setValue("promoType", "BUY_X_GET_Y")}
              className={`p-3.5 rounded-2xl border text-left flex items-start gap-3 transition-all cursor-pointer ${
                selectedPromoType === "BUY_X_GET_Y"
                  ? "border-amber-500 bg-amber-50/50 dark:bg-amber-950/30 text-amber-900 dark:text-amber-200 shadow-sm"
                  : "border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-zinc-600 dark:text-zinc-400 hover:border-zinc-300"
              }`}
            >
              <Gift className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
              <div>
                <span className="font-bold text-xs block">Buy 1 Get 1 (BOGO)</span>
                <span className="text-[11px] text-zinc-500 dark:text-zinc-400">Beli X Tiket Gratis Y Tiket</span>
              </div>
            </button>

            <button
              type="button"
              onClick={() => setValue("promoType", "PERCENTAGE")}
              className={`p-3.5 rounded-2xl border text-left flex items-start gap-3 transition-all cursor-pointer ${
                selectedPromoType === "PERCENTAGE"
                  ? "border-indigo-500 bg-indigo-50/50 dark:bg-indigo-950/30 text-indigo-900 dark:text-indigo-200 shadow-sm"
                  : "border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-zinc-600 dark:text-zinc-400 hover:border-zinc-300"
              }`}
            >
              <Percent className="w-5 h-5 text-indigo-500 shrink-0 mt-0.5" />
              <div>
                <span className="font-bold text-xs block">Potongan Persen (%)</span>
                <span className="text-[11px] text-zinc-500 dark:text-zinc-400">Diskon harga tiket dalam %</span>
              </div>
            </button>
          </div>
        </div>

        {/* Dynamic Fields based on Type */}
        {selectedPromoType === "BUY_X_GET_Y" ? (
          <div className="grid grid-cols-2 gap-4 p-4 rounded-2xl bg-amber-50/40 dark:bg-amber-950/20 border border-amber-200/60 dark:border-amber-900/40">
            <Input
              type="number"
              label="Beli Berapa Tiket (Buy Qty) *"
              placeholder="1"
              error={errors.buyQty?.message as string | undefined}
              {...register("buyQty")}
            />
            <Input
              type="number"
              label="Gratis Berapa Tiket (Get Qty) *"
              placeholder="1"
              error={errors.getQty?.message as string | undefined}
              {...register("getQty")}
            />
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 rounded-2xl bg-indigo-50/40 dark:bg-indigo-950/20 border border-indigo-200/60 dark:border-indigo-900/40">
            <Input
              type="number"
              label="Persentase Diskon (%) *"
              placeholder="20"
              error={errors.discountPercent?.message as string | undefined}
              {...register("discountPercent")}
            />
            <Input
              type="number"
              label="Maksimal Potongan (IDR - Opsional)"
              placeholder="e.g. 50000"
              error={errors.maxDiscount?.message as string | undefined}
              {...register("maxDiscount")}
            />
          </div>
        )}

        {/* Quota & Rules */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Input
            type="number"
            label="Total Kuota Tiket Promo *"
            placeholder="100"
            error={errors.quota?.message as string | undefined}
            {...register("quota")}
          />
          <Input
            type="number"
            label="Min. Beli Tiket"
            placeholder="1"
            error={errors.minTickets?.message as string | undefined}
            {...register("minTickets")}
          />
          <Input
            type="number"
            label="Maks. Pakai per Transaksi"
            placeholder="e.g. 2 (Opsional)"
            error={errors.maxUsagePerOrder?.message as string | undefined}
            {...register("maxUsagePerOrder")}
          />
        </div>

        {/* Date Ranges */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Input
            type="datetime-local"
            label="Mulai Berlaku *"
            error={errors.startDate?.message as string | undefined}
            {...register("startDate")}
          />
          <Input
            type="datetime-local"
            label="Expired / Berakhir *"
            error={errors.endDate?.message as string | undefined}
            {...register("endDate")}
          />
        </div>

        {/* Movie Restrictions */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label className="text-xs font-bold text-zinc-500 uppercase tracking-wider">
              Batasan Film (Opsional)
            </label>
            <span className="text-[11px] text-zinc-400">
              {selectedMovieIds.length === 0 ? "Berlaku untuk SEMUA film" : `${selectedMovieIds.length} film terpilih`}
            </span>
          </div>

          <div className="max-h-40 overflow-y-auto p-3 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-950/50 space-y-2">
            {movies?.map((movie) => {
              const isChecked = selectedMovieIds.includes(movie.id);
              return (
                <label
                  key={movie.id}
                  className="flex items-center gap-2.5 text-xs text-zinc-700 dark:text-zinc-300 hover:text-zinc-900 dark:hover:text-zinc-100 cursor-pointer select-none"
                >
                  <input
                    type="checkbox"
                    checked={isChecked}
                    onChange={() => toggleMovieSelection(movie.id)}
                    className="rounded text-indigo-600 focus:ring-indigo-500"
                  />
                  <Film className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
                  <span className="font-medium">{movie.title}</span>
                </label>
              );
            })}
          </div>
        </div>

        {/* Active Toggle */}
        <div className="flex items-center gap-2 pt-1">
          <input
            type="checkbox"
            id="isActivePromo"
            {...register("isActive")}
            className="rounded text-indigo-600 focus:ring-indigo-500"
          />
          <label htmlFor="isActivePromo" className="text-xs font-bold text-zinc-700 dark:text-zinc-300 cursor-pointer">
            Promo Aktif & Dapat Digunakan
          </label>
        </div>

        {/* Buttons */}
        <div className="flex justify-end gap-3 pt-4 border-t border-zinc-150 dark:border-zinc-800">
          <Button variant="secondary" type="button" onClick={onClose}>
            {t("common.cancel")}
          </Button>
          <Button type="submit" isLoading={isSaving}>
            {t("common.save")}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
