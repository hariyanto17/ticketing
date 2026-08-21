"use client";

import React, { useState } from "react";
import {
  useGetStudiosQuery,
  useCreateStudioMutation,
  useUpdateStudioMutation,
  useDeleteStudioMutation,
  useCopyLayoutMutation,
  Studio,
} from "@/services/studioApi";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useToast } from "@/components/ui/toast";
import { DataTable } from "@/components/ui/data-table";
import { Modal } from "@/components/ui/modal";
import { DeleteDialog } from "@/components/ui/dialogs";
import { Input, Select, Button } from "@/components/ui/form-controls";
import { Edit, Trash, Plus, Armchair, Copy } from "lucide-react";
import Link from "next/link";
import { useTranslation } from "@/lib/i18n";

const studioSchema = (t: (key: string) => string) => z.object({
  name: z.string().min(1, t("validation.nameRequired")),
  code: z.string().min(1, t("validation.codeRequired")).max(10),
  capacity: z.coerce.number().int().positive(t("validation.capacityPositive")),
  type: z.enum(["REGULAR", "PREMIERE", "VIP"]),
  status: z.enum(["ACTIVE", "MAINTENANCE", "CLOSED"]),
});

export default function StudiosManagement() {
  const { t, formatNumber } = useTranslation();
  const schema = studioSchema(t);
  type StudioFormValues = z.infer<typeof schema>;
  const { success: toastSuccess, error: toastError } = useToast();
  const [searchQuery, setSearchQuery] = useState("");
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [isCopyOpen, setIsCopyOpen] = useState(false);
  const [sourceStudioId, setSourceStudioId] = useState("");
  const [selectedStudio, setSelectedStudio] = useState<Studio | null>(null);

  const { data: studiosResponse, isLoading } = useGetStudiosQuery({
    search: searchQuery || undefined,
  });

  const [createStudio, { isLoading: isCreating }] = useCreateStudioMutation();
  const [updateStudio, { isLoading: isUpdating }] = useUpdateStudioMutation();
  const [deleteStudio, { isLoading: isDeleting }] = useDeleteStudioMutation();
  const [copyLayout, { isLoading: isCopying }] = useCopyLayoutMutation();

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<StudioFormValues>({
    resolver: zodResolver(schema),
  });

  const handleOpenAdd = () => {
    setSelectedStudio(null);
    reset({ name: "", code: "", capacity: 50, type: "REGULAR", status: "ACTIVE" });
    setIsFormOpen(true);
  };

  const handleOpenEdit = (studio: Studio) => {
    setSelectedStudio(studio);
    reset({
      name: studio.name,
      code: studio.code,
      capacity: studio.capacity,
      type: studio.type,
      status: studio.status,
    });
    setIsFormOpen(true);
  };

  const handleOpenDelete = (studio: Studio) => {
    setSelectedStudio(studio);
    setIsDeleteOpen(true);
  };

  const onSubmit = async (data: StudioFormValues) => {
    try {
      if (selectedStudio) {
        await updateStudio({ id: selectedStudio.id, body: data }).unwrap();
        toastSuccess(t("studios.updated"));
      } else {
        await createStudio(data).unwrap();
        toastSuccess(t("studios.created"));
      }
      setIsFormOpen(false);
    } catch (err: any) {
      toastError(err?.data?.message || t("studios.saveFailed"));
    }
  };

  const handleDelete = async () => {
    if (!selectedStudio) return;
    try {
      await deleteStudio(selectedStudio.id).unwrap();
      toastSuccess(t("studios.deleted"));
      setIsDeleteOpen(false);
    } catch (err: any) {
      toastError(err?.data?.message || t("studios.deleteFailed"));
    }
  };

  const handleOpenCopy = (studio: Studio) => {
    setSelectedStudio(studio);
    setSourceStudioId("");
    setIsCopyOpen(true);
  };

  const handleCopyLayout = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStudio) return;
    if (!sourceStudioId) {
      toastError(t("studios.source"));
      return;
    }

    const sourceStudio = studiosResponse?.data?.find((s) => s.id === sourceStudioId);
    if (!sourceStudio) return;

    if (
      !window.confirm(
        `This will replace the current seat layout of "${selectedStudio.name}" with the layout from "${sourceStudio.name}". Existing seats in this studio will be replaced. Showtimes and tickets will not be copied. Are you sure you want to proceed?`
      )
    ) {
      return;
    }

    try {
      const res = await copyLayout({
        destinationStudioId: selectedStudio.id,
        sourceStudioId,
      }).unwrap();
      toastSuccess(`${t("studios.copyAction")}: ${formatNumber(res.data.seatCount)} (${t("studios.capacity")} ${formatNumber(res.data.capacity)})`);
      setIsCopyOpen(false);
    } catch (err: any) {
      toastError(err?.data?.message || t("studios.saveFailed"));
    }
  };

  const typeOptions = [
    { value: "REGULAR", label: t("studios.regular") },
    { value: "PREMIERE", label: t("studios.premiere") },
    { value: "VIP", label: "VIP" },
  ];

  const statusOptions = [
    { value: "ACTIVE", label: t("studios.active") },
    { value: "MAINTENANCE", label: t("studios.maintenance") },
    { value: "CLOSED", label: t("studios.closed") },
  ];

  const columns = [
    { key: "name", header: t("studios.name") },
    { key: "code", header: t("studios.code") },
    { key: "capacity", header: t("studios.capacity") },
    {
      key: "type",
      header: t("studios.type"),
      render: (s: Studio) => {
        const badges = {
          REGULAR: "bg-zinc-50 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300",
          PREMIERE: "bg-indigo-50 text-indigo-600 dark:bg-indigo-950/40 dark:text-indigo-400",
          VIP: "bg-amber-50 text-amber-600 dark:bg-amber-950/40 dark:text-amber-400",
        };
        return (
          <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${badges[s.type]}`}>
            {s.type}
          </span>
        );
      },
    },
    {
      key: "status",
      header: t("studios.status"),
      render: (s: Studio) => {
        const badges = {
          ACTIVE: "bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400",
          MAINTENANCE: "bg-amber-50 text-amber-600 dark:bg-amber-950/40 dark:text-amber-400",
          CLOSED: "bg-rose-50 text-rose-600 dark:bg-rose-950/40 dark:text-rose-400",
        };
        return (
          <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${badges[s.status]}`}>
            {s.status}
          </span>
        );
      },
    },
    {
      key: "actions",
      header: t("studios.actions"),
      render: (s: Studio) => (
        <div className="flex gap-2">
          {/* Seat configuration redirect */}
          <Link
            href={`/admin/studios/${s.id}/seats`}
            title={t("studios.copy")}
            className="p-1 text-zinc-500 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg transition-colors cursor-pointer"
          >
            <Armchair className="w-4 h-4" />
          </Link>
          <button
            onClick={() => handleOpenCopy(s)}
            title={t("studios.copy")}
            className="p-1 text-zinc-500 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg transition-colors cursor-pointer"
          >
            <Copy className="w-4 h-4" />
          </button>
          <button
            onClick={() => handleOpenEdit(s)}
            className="p-1 text-zinc-500 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg transition-colors cursor-pointer"
          >
            <Edit className="w-4 h-4" />
          </button>
          <button
            onClick={() => handleOpenDelete(s)}
            className="p-1 text-zinc-500 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg transition-colors cursor-pointer"
          >
            <Trash className="w-4 h-4" />
          </button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-8 font-sans">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
            {t("studios.title")}
          </h1>
          <p className="text-zinc-500 dark:text-zinc-400 mt-1">
            {t("studios.subtitle")}
          </p>
        </div>
        <Button onClick={handleOpenAdd} className="flex items-center gap-2 self-start sm:self-auto">
          <Plus className="w-4 h-4" /> {t("studios.add")}
        </Button>
      </div>

      <DataTable
        columns={columns}
        data={studiosResponse?.data || []}
        isLoading={isLoading}
        onSearch={setSearchQuery}
        searchPlaceholder={t("studios.search")}
      />

      <Modal
        isOpen={isFormOpen}
        onClose={() => setIsFormOpen(false)}
        title={selectedStudio ? t("studios.edit") : t("studios.addTitle")}
      >
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input label={t("studios.name")} error={errors.name?.message} {...register("name")} />
            <Input label={t("studios.code")} error={errors.code?.message} {...register("code")} />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Input label={t("studios.capacity")} type="number" error={errors.capacity?.message} {...register("capacity")} />
            <Select label={t("studios.type")} options={typeOptions} error={errors.type?.message} {...register("type")} />
            <Select label={t("studios.status")} options={statusOptions} error={errors.status?.message} {...register("status")} />
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-zinc-150 dark:border-zinc-800">
            <Button variant="secondary" type="button" onClick={() => setIsFormOpen(false)}>
              {t("studios.cancel")}
            </Button>
            <Button type="submit" isLoading={selectedStudio ? isUpdating : isCreating}>
              {t("studios.save")}
            </Button>
          </div>
        </form>
      </Modal>

      <Modal
        isOpen={isCopyOpen}
        onClose={() => setIsCopyOpen(false)}
        title={t("studios.copy")}
      >
        <form onSubmit={handleCopyLayout} className="space-y-4">
          <div className="p-4 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900 rounded-2xl">
            <span className="text-xs font-semibold text-amber-800 dark:text-amber-400 block">
              {t("studios.warning")}
            </span>
            <p className="text-[11px] text-amber-700 dark:text-amber-300 mt-1">
              This will replace the current seat layout of <strong>{selectedStudio?.name}</strong>. Existing seats in this studio will be deleted. Active showtimes and ticket history will not be affected or copied.
            </p>
          </div>

          <Select
            label={t("studios.source")}
            value={sourceStudioId}
            onChange={(e) => setSourceStudioId(e.target.value)}
            options={[
              { value: "", label: t("studios.source") },
              ...(studiosResponse?.data || [])
                .filter((s) => s.id !== selectedStudio?.id)
                .map((s) => ({
                  value: s.id,
                  label: `${s.name} (${s.capacity})`,
                })),
            ]}
          />

          <div className="flex justify-end gap-3 pt-4 border-t border-zinc-150 dark:border-zinc-800">
            <Button variant="secondary" type="button" onClick={() => setIsCopyOpen(false)}>
              {t("studios.cancel")}
            </Button>
            <Button type="submit" isLoading={isCopying} disabled={!sourceStudioId}>
              {t("studios.copyAction")}
            </Button>
          </div>
        </form>
      </Modal>

      <DeleteDialog
        isOpen={isDeleteOpen}
        onClose={() => setIsDeleteOpen(false)}
        onConfirm={handleDelete}
        title={t("studios.closed")}
        message={`${t("studios.deleteFailed")} "${selectedStudio?.name}"?`}
        isLoading={isDeleting}
      />
    </div>
  );
}
