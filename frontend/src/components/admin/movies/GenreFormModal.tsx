"use client";

import React from "react";
import { Modal } from "@/components/ui/modal";
import { Input, Button } from "@/components/ui/form-controls";
import { UseFormReturn } from "react-hook-form";
import { useTranslation } from "@/lib/i18n";

interface GenreFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedItem: any;
  form: UseFormReturn<any>;
  onSave: (data: any) => void;
  isSaving: boolean;
}

export function GenreFormModal({
  isOpen,
  onClose,
  selectedItem,
  form,
  onSave,
  isSaving,
}: GenreFormModalProps) {
  const { t } = useTranslation();
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = form;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={selectedItem ? `${t("common.edit")} ${t("movies.genres")}` : `${t("movies.add")} ${t("movies.genres")}`}
    >
      <form onSubmit={handleSubmit(onSave)} className="space-y-4">
        <Input
          label={t("movies.name")}
          placeholder="e.g. Action"
          error={errors.name?.message as string | undefined}
          {...register("name")}
        />
        <Input label={t("movies.description")} placeholder="Optional description" {...register("description")} />

        <div className="flex items-center gap-2">
          <input type="checkbox" id="genreActive" {...register("isActive")} />
          <label htmlFor="genreActive" className="text-sm">
            {t("movies.active")}
          </label>
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
