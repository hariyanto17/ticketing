"use client";

import React from "react";
import { Modal } from "@/components/ui/modal";
import { DateTimePicker } from "@/components/ui/DateTimePicker";
import { CurrencyInput } from "@/components/ui/CurrencyInput";
import { Select, Button, SearchableSelect } from "@/components/ui/form-controls";
import { Controller, UseFormReturn } from "react-hook-form";
import { Schedule } from "@/services/studioApi";
import { useTranslation } from "@/lib/i18n";

interface ScheduleFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedSchedule: Schedule | null;
  form: UseFormReturn<any>;
  onSubmit: (data: any) => void;
  isSaving: boolean;
  movieOptions: { value: string; label: string }[];
  studioOptions: { value: string; label: string }[];
  showDurationWarning: boolean;
}

export function ScheduleFormModal({
  isOpen,
  onClose,
  selectedSchedule,
  form,
  onSubmit,
  isSaving,
  movieOptions,
  studioOptions,
  showDurationWarning,
}: ScheduleFormModalProps) {
  const { t } = useTranslation();
  const {
    handleSubmit,
    control,
    register,
    formState: { errors },
  } = form;

  const statusOptions = [
    { value: "DRAFT", label: "DRAFT" },
    { value: "PUBLISHED", label: "PUBLISHED" },
    { value: "CLOSED", label: "CLOSED" },
  ];

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={selectedSchedule ? t("schedules.edit") : t("schedules.createTitle")}
    >
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <Controller
          name="movieId"
          control={control}
          render={({ field }) => (
            <SearchableSelect
              label={t("schedules.movie")}
              value={field.value}
              onChange={field.onChange}
              options={movieOptions}
              error={errors.movieId?.message as string | undefined}
              placeholder={t("schedules.selectMovie")}
              searchPlaceholder={t("schedules.searchMovies")}
            />
          )}
        />

        {showDurationWarning && (
          <div className="text-xs text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/20 px-3 py-2 rounded-xl border border-amber-200/50 dark:border-amber-900/30">
            {t("schedules.durationWarning")}
          </div>
        )}

        <Controller
          name="studioId"
          control={control}
          render={({ field }) => (
            <SearchableSelect
              label={t("schedules.studio")}
              value={field.value}
              onChange={field.onChange}
              options={studioOptions}
              error={errors.studioId?.message as string | undefined}
              placeholder={t("schedules.selectStudio")}
              searchPlaceholder={t("schedules.searchStudios")}
            />
          )}
        />

        <div>
          <Controller
            control={control}
            name="startTime"
            render={({ field }) => (
              <DateTimePicker
                mode="datetime"
                label={t("schedules.start")}
                value={field.value}
                onChange={field.onChange}
                error={errors.startTime?.message as string | undefined}
                required
              />
            )}
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Controller
            control={control}
            name="ticketPrice"
            render={({ field }) => (
              <CurrencyInput
                label={t("schedules.price")}
                value={field.value}
                onChange={field.onChange}
                error={errors.ticketPrice?.message as string | undefined}
                required
              />
            )}
          />
          <Select
            label={t("schedules.status")}
            options={statusOptions}
            error={errors.status?.message as string | undefined}
            {...register("status")}
          />
        </div>

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
