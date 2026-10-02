"use client";

import React from "react";
import { Modal } from "@/components/ui/modal";
import { Input, Select, Button } from "@/components/ui/form-controls";
import { UseFormReturn } from "react-hook-form";
import { Genre, ProductionHouse, Distributor } from "@/services/movieApi";
import { useTranslation } from "@/lib/i18n";

interface MovieFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedItem: any;
  form: UseFormReturn<any>;
  onSave: (data: any) => void;
  isSaving: boolean;
  genres: Genre[] | undefined;
  phs: ProductionHouse[] | undefined;
  distributors: Distributor[] | undefined;
}

export function MovieFormModal({
  isOpen,
  onClose,
  selectedItem,
  form,
  onSave,
  isSaving,
  genres,
  phs,
  distributors,
}: MovieFormModalProps) {
  const { t } = useTranslation();
  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = form;

  const phOptions = [
    { value: "", label: t("movies.productionHouse") },
    ...(phs?.map((p) => ({ value: p.id, label: p.name })) || []),
  ];

  const distOptions = [
    { value: "", label: t("movies.distributor") },
    ...(distributors?.map((d) => ({ value: d.id, label: d.name })) || []),
  ];

  const censorshipOptions = [
    { value: "SU", label: "SU (Semua Umur)" },
    { value: "R13+", label: "R13+" },
    { value: "D17+", label: "D17+" },
    { value: "D21+", label: "D21+" },
  ];

  const statusOptions = [
    { value: "DRAFT", label: "Draft" },
    { value: "COMING_SOON", label: "Coming Soon" },
    { value: "NOW_SHOWING", label: "Now Showing" },
    { value: "ENDED", label: "Ended" },
  ];

  const selectedGenreIds = watch("genreIds") || [];

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={selectedItem ? `${t("common.edit")} ${t("movies.titleLabel")}` : `${t("movies.add")} ${t("movies.titleLabel")}`}
    >
      <form onSubmit={handleSubmit(onSave)} className="space-y-4">
        <Input
          label={t("movies.titleLabel")}
          placeholder="e.g. Inception"
          error={errors.title?.message as string | undefined}
          {...register("title")}
        />

        <div className="space-y-1">
          <label className="text-xs font-semibold text-zinc-500">{t("movies.synopsis")}</label>
          <textarea
            className="w-full px-3 py-2 border rounded-xl bg-zinc-50 dark:bg-zinc-800 text-sm focus:outline-none"
            rows={3}
            {...register("synopsis")}
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <Input
            label={t("movies.durationMin")}
            type="number"
            placeholder="120"
            error={errors.durationMinutes?.message as string | undefined}
            {...register("durationMinutes")}
          />
          <Select
            label={t("movies.rating")}
            options={censorshipOptions}
            error={errors.censorshipRating?.message as string | undefined}
            {...register("censorshipRating")}
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <Select
            label={t("movies.productionHouse")}
            options={phOptions}
            error={errors.productionHouseId?.message as string | undefined}
            {...register("productionHouseId")}
          />
          <Select
            label={t("movies.distributor")}
            options={distOptions}
            error={errors.distributorId?.message as string | undefined}
            {...register("distributorId")}
          />
        </div>

        <div className="space-y-1">
          <label className="text-xs font-semibold text-zinc-500">{t("movies.genres")}</label>
          <div className="flex flex-wrap gap-2 p-2 border rounded-xl bg-zinc-50 dark:bg-zinc-800">
            {genres?.map((g) => {
              const isSelected = selectedGenreIds.includes(g.id);
              return (
                <button
                  type="button"
                  key={g.id}
                  onClick={() => {
                    if (isSelected) {
                      setValue(
                        "genreIds",
                        selectedGenreIds.filter((id: string) => id !== g.id)
                      );
                    } else {
                      setValue("genreIds", [...selectedGenreIds, g.id]);
                    }
                  }}
                  className={`px-2.5 py-1 rounded-lg text-xs font-medium border transition-colors ${
                    isSelected
                      ? "bg-indigo-600 text-white border-indigo-600"
                      : "bg-white dark:bg-zinc-900 text-zinc-600 dark:text-zinc-300 border-zinc-200 dark:border-zinc-700"
                  }`}
                >
                  {g.name}
                </button>
              );
            })}
          </div>
          {errors.genreIds && (
            <p className="text-xs text-rose-500">{errors.genreIds.message as string}</p>
          )}
        </div>

        <div className="grid grid-cols-2 gap-4">
          <Input label={t("movies.posterUrl")} placeholder="https://..." {...register("poster")} />
          <Input label={t("movies.trailerUrl")} placeholder="https://youtube.com/..." {...register("trailerUrl")} />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <Input label={t("movies.director")} placeholder="Director name" {...register("director")} />
          <Input label={t("movies.cast")} placeholder="Cast members" {...register("cast")} />
        </div>

        <Select
          label={t("movies.status")}
          options={statusOptions}
          error={errors.status?.message as string | undefined}
          {...register("status")}
        />

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
