"use client";

import React, { useState } from "react";
import {
  useGetSchedulesQuery,
  useCreateScheduleMutation,
  useUpdateScheduleMutation,
  useDeleteScheduleMutation,
  useCopySchedulesMutation,
  useGetStudiosQuery,
  Schedule,
} from "@/services/studioApi";
import { useGetMoviesQuery } from "@/services/movieApi";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useToast } from "@/components/ui/toast";
import { DataTable } from "@/components/ui/data-table";
import { Modal } from "@/components/ui/modal";
import { DeleteDialog } from "@/components/ui/dialogs";
import { Input, Select, Button, SearchableSelect } from "@/components/ui/form-controls";
import { DateTimePicker } from "@/components/ui/DateTimePicker";
import { CurrencyInput } from "@/components/ui/CurrencyInput";
import { Edit, Trash, Plus, Calendar as CalendarIcon, Clock, History, Copy } from "lucide-react";
import { useTranslation } from "@/lib/i18n";
import { formatDuration } from "@/lib/formatDuration";

const scheduleSchema = (t: (key: string, ...args: any[]) => string) => z.object({
  movieId: z.string().uuid(t("schedules.selectMovie")),
  studioId: z.string().uuid(t("schedules.selectStudio")),
  startTime: z.string().min(1, t("schedules.start")),
  ticketPrice: z.coerce.number().positive(t("schedules.price")),
  status: z.enum(["DRAFT", "PUBLISHED", "CLOSED"]),
});

export default function SchedulesManagement() {
  const { t, locale, formatDate, formatCurrency } = useTranslation();
  const schema = scheduleSchema(t);
  type ScheduleFormValues = z.infer<typeof schema>;
  const { success: toastSuccess, error: toastError } = useToast();

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [isCopyOpen, setIsCopyOpen] = useState(false);
  const [selectedSchedule, setSelectedSchedule] = useState<Schedule | null>(null);

  // Copy schedule state
  const [sourceDate, setSourceDate] = useState("");
  const [targetDate, setTargetDate] = useState("");
  const [copyStatus, setCopyStatus] = useState("KEEP");

  // Queries
  const { data: schedulesResponse, isLoading: schedulesLoading } = useGetSchedulesQuery({});
  const { data: moviesResponse } = useGetMoviesQuery({ limit: 100 });
  const { data: studiosResponse } = useGetStudiosQuery({ limit: 100 });

  // Mutations
  const [createSchedule, { isLoading: isCreating }] = useCreateScheduleMutation();
  const [updateSchedule, { isLoading: isUpdating }] = useUpdateScheduleMutation();
  const [deleteSchedule, { isLoading: isDeleting }] = useDeleteScheduleMutation();
  const [copySchedules, { isLoading: isCopying }] = useCopySchedulesMutation();

  const {
    register,
    handleSubmit,
    reset,
    control,
    watch,
    formState: { errors },
  } = useForm<ScheduleFormValues>({
    resolver: zodResolver(schema),
  });

  const selectedMovieId = watch("movieId");
  const selectedMovie = moviesResponse?.data?.find((m) => m.id === selectedMovieId);
  const showDurationWarning = !!(selectedMovieId && selectedMovie && !selectedMovie.durationMinutes);

  const movieOptions = [
    { value: "", label: t("schedules.selectMovie") },
    ...(moviesResponse?.data?.map((m) => ({
      value: m.id,
      label: m.durationMinutes
        ? `${m.title} (${formatDuration(m.durationMinutes, locale)})`
        : `${m.title} (${t("movies.unspecified")})`,
    })) || []),
  ];

  const studioOptions = [
    { value: "", label: t("schedules.selectStudio") },
    ...(studiosResponse?.data?.map((s) => ({ value: s.id, label: `${s.name} (${s.code})` })) || []),
  ];

  const statusOptions = [
    { value: "DRAFT", label: "DRAFT" },
    { value: "PUBLISHED", label: "PUBLISHED" },
    { value: "CLOSED", label: "CLOSED" },
  ];

  const handleOpenAdd = () => {
    setSelectedSchedule(null);
    reset({
      movieId: "",
      studioId: "",
      startTime: new Date().toISOString().substring(0, 16),
      ticketPrice: 45000,
      status: "DRAFT",
    });
    setIsFormOpen(true);
  };

  const handleOpenCopy = () => {
    const todayObj = new Date();
    const todayIso = todayObj.toISOString().substring(0, 10);
    const yesterdayObj = new Date(todayObj.getTime() - 24 * 60 * 60 * 1000);
    const yesterdayIso = yesterdayObj.toISOString().substring(0, 10);

    setSourceDate(yesterdayIso);
    setTargetDate(todayIso);
    setCopyStatus("KEEP");
    setIsCopyOpen(true);
  };

  const handleCopySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await copySchedules({
        sourceDate: sourceDate || undefined,
        targetDate: targetDate || undefined,
        status: copyStatus === "KEEP" ? undefined : (copyStatus as any),
      }).unwrap();

      if (res.data?.created > 0) {
        toastSuccess(
          t("schedules.copySuccess", {
            count: res.data.created,
            date: formatDate(res.data.targetDate),
          })
        );
        if (res.data.skipped > 0) {
          toastError(t("schedules.copySkippedNotice", { skipped: res.data.skipped }));
        }
        setIsCopyOpen(false);
      } else if (res.data?.totalFound === 0) {
        toastError(t("schedules.copyNoSchedules", { date: formatDate(res.data.sourceDate) }));
      } else {
        toastError(
          res.data?.skippedReasons?.[0]?.reason ||
            t("schedules.copySkippedNotice", { skipped: res.data?.skipped || 0 })
        );
      }
    } catch (err: any) {
      toastError(err?.data?.message || t("schedules.saveFailed"));
    }
  };

  const handleOpenEdit = (sched: Schedule) => {
    setSelectedSchedule(sched);
    
    // Format dates for inputs
    const sTime = new Date(sched.startTime).toISOString().substring(0, 16);

    reset({
      movieId: sched.movieId,
      studioId: sched.studioId,
      startTime: sTime,
      ticketPrice: sched.ticketPrice,
      status: sched.status,
    });
    setIsFormOpen(true);
  };

  const handleOpenDelete = (sched: Schedule) => {
    setSelectedSchedule(sched);
    setIsDeleteOpen(true);
  };

  const onSubmit = async (data: ScheduleFormValues) => {
    try {
      // Parse dates to standard ISO strings
      const payload = {
        ...data,
        startTime: new Date(data.startTime).toISOString(),
      };

      if (selectedSchedule) {
        await updateSchedule({ id: selectedSchedule.id, body: payload }).unwrap();
        toastSuccess(t("schedules.updated"));
      } else {
        await createSchedule(payload).unwrap();
        toastSuccess(t("schedules.createdSuccess"));
      }
      setIsFormOpen(false);
    } catch (err: any) {
      toastError(err?.data?.message || t("schedules.saveFailed"));
    }
  };

  const handleDelete = async () => {
    if (!selectedSchedule) return;
    try {
      await deleteSchedule(selectedSchedule.id).unwrap();
      toastSuccess(t("schedules.deleted"));
      setIsDeleteOpen(false);
    } catch (err: any) {
      toastError(err?.data?.message || t("schedules.deleteFailed"));
    }
  };

  const columns = [
    {
      key: "movie",
      header: t("schedules.movie"),
      render: (s: Schedule) => (
        <div className="flex items-center gap-2">
          {s.movie?.poster && (
            <img src={s.movie.poster} alt={s.movie.title} className="w-8 h-10 object-cover rounded-md" />
          )}
          <span className="font-semibold text-zinc-900 dark:text-zinc-50">{s.movie?.title}</span>
        </div>
      ),
    },
    {
      key: "studio",
      header: t("schedules.studio"),
      render: (s: Schedule) => `${s.studio?.name} (${s.studio?.code})`,
    },
    {
      key: "startTime",
      header: t("schedules.showTime"),
      render: (s: Schedule) => {
        const start = new Date(s.startTime).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
        const end = s.endTime 
          ? new Date(s.endTime).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
          : "-";
        const date = formatDate(s.businessDate || s.startTime);
        return (
          <div className="flex flex-col">
            <span className="text-zinc-800 dark:text-zinc-200 font-semibold">{date}</span>
            <span className="text-xs text-zinc-500 flex items-center gap-1">
              <Clock className="w-3.5 h-3.5 text-zinc-400" /> {start} - {end}
            </span>
          </div>
        );
      },
    },
    {
      key: "ticketPrice",
      header: t("schedules.price"),
      render: (s: Schedule) => formatCurrency(s.ticketPrice),
    },
    {
      key: "status",
      header: t("schedules.status"),
      render: (s: Schedule) => {
        const badges = {
          DRAFT: "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300",
          PUBLISHED: "bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400",
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
      header: t("schedules.actions"),
      render: (s: Schedule) => (
        <div className="flex gap-2">
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
            {t("schedules.title")}
          </h1>
          <p className="text-zinc-500 dark:text-zinc-400 mt-1">
            {t("schedules.subtitle")}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3 self-start sm:self-auto">
          <Button
            variant="secondary"
            onClick={handleOpenCopy}
            className="flex items-center gap-2 border-zinc-200 dark:border-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-800 dark:text-zinc-200"
          >
            <History className="w-4 h-4 text-indigo-500 dark:text-indigo-400" />
            {t("schedules.copyYesterday")}
          </Button>
          <Button onClick={handleOpenAdd} className="flex items-center gap-2">
            <Plus className="w-4 h-4" /> {t("schedules.create")}
          </Button>
        </div>
      </div>

      <DataTable
        columns={columns}
        data={schedulesResponse?.data || []}
        isLoading={schedulesLoading}
        searchPlaceholder={t("schedules.search")}
      />

      <Modal
        isOpen={isCopyOpen}
        onClose={() => setIsCopyOpen(false)}
        title={t("schedules.copyModalTitle")}
      >
        <form onSubmit={handleCopySubmit} className="space-y-4">
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            {t("schedules.copyModalSubtitle")}
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <DateTimePicker
              mode="date"
              label={t("schedules.sourceDate")}
              value={sourceDate}
              onChange={(val) => setSourceDate(val || "")}
              required
            />
            <DateTimePicker
              mode="date"
              label={t("schedules.targetDate")}
              value={targetDate}
              onChange={(val) => setTargetDate(val || "")}
              required
            />
          </div>

          <Select
            label={t("schedules.copyStatus")}
            value={copyStatus}
            onChange={(e) => setCopyStatus(e.target.value)}
            options={[
              { value: "KEEP", label: t("schedules.statusKeepOriginal") },
              { value: "PUBLISHED", label: "PUBLISHED" },
              { value: "DRAFT", label: "DRAFT" },
              { value: "CLOSED", label: "CLOSED" },
            ]}
          />

          <div className="bg-indigo-50/70 dark:bg-indigo-950/30 border border-indigo-200/60 dark:border-indigo-900/50 rounded-xl p-3.5 text-xs text-indigo-900 dark:text-indigo-200 flex items-start gap-2.5">
            <History className="w-4 h-4 text-indigo-600 dark:text-indigo-400 shrink-0 mt-0.5" />
            <span>
              {t("schedules.copyNotice", {
                source: formatDate(sourceDate),
                target: formatDate(targetDate),
              })}
            </span>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-zinc-150 dark:border-zinc-800">
            <Button variant="secondary" type="button" onClick={() => setIsCopyOpen(false)}>
              {t("common.cancel")}
            </Button>
            <Button type="submit" isLoading={isCopying} className="flex items-center gap-2">
              <Copy className="w-4 h-4" /> {t("schedules.copyAction")}
            </Button>
          </div>
        </form>
      </Modal>

      <Modal
        isOpen={isFormOpen}
        onClose={() => setIsFormOpen(false)}
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
                error={errors.movieId?.message}
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
                error={errors.studioId?.message}
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
                  error={errors.startTime?.message}
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
                  error={errors.ticketPrice?.message}
                  required
                />
              )}
            />
            <Select label={t("schedules.status")} options={statusOptions} error={errors.status?.message} {...register("status")} />
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-zinc-150 dark:border-zinc-800">
            <Button variant="secondary" type="button" onClick={() => setIsFormOpen(false)}>
              {t("common.cancel")}
            </Button>
            <Button type="submit" isLoading={selectedSchedule ? isUpdating : isCreating}>
              {t("common.save")}
            </Button>
          </div>
        </form>
      </Modal>

      <DeleteDialog
        isOpen={isDeleteOpen}
        onClose={() => setIsDeleteOpen(false)}
        onConfirm={handleDelete}
        title={t("schedules.deleteTitle")}
        message={t("schedules.deleteMessage")}
        isLoading={isDeleting}
      />
    </div>
  );
}
