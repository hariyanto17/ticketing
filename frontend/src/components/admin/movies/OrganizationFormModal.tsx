"use client";

import React from "react";
import { Modal } from "@/components/ui/modal";
import { Input, Button } from "@/components/ui/form-controls";
import { UseFormReturn } from "react-hook-form";
import { useTranslation } from "@/lib/i18n";

interface OrganizationModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedItem: any;
  form: UseFormReturn<any>;
  onSave: (data: any) => void;
  isSaving: boolean;
  type: "PH" | "DISTRIBUTOR";
}

export function OrganizationFormModal({
  isOpen,
  onClose,
  selectedItem,
  form,
  onSave,
  isSaving,
  type,
}: OrganizationModalProps) {
  const { t } = useTranslation();
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = form;

  const titleName = type === "PH" ? t("movies.productionHouses") : t("movies.distributors");

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={selectedItem ? `${t("common.edit")} ${titleName}` : `${t("movies.add")} ${titleName}`}
    >
      <form onSubmit={handleSubmit(onSave)} className="space-y-4">
        <Input
          label={t("movies.name")}
          placeholder="Company Name"
          error={errors.name?.message as string | undefined}
          {...register("name")}
        />
        <Input label={t("movies.contact")} placeholder="John Doe" {...register("contactPerson")} />
        <div className="grid grid-cols-2 gap-4">
          <Input label={t("movies.phone")} placeholder="+62..." {...register("phone")} />
          <Input
            label={t("movies.email")}
            placeholder="info@..."
            error={errors.email?.message as string | undefined}
            {...register("email")}
          />
        </div>
        <Input label={t("movies.address")} placeholder="Office address..." {...register("address")} />

        <div className="flex items-center gap-2">
          <input type="checkbox" id="orgActive" {...register("isActive")} />
          <label htmlFor="orgActive" className="text-sm">
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
