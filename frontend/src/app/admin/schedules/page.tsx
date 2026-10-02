"use client";

import React, { useState, useMemo } from "react";
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
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useToast } from "@/components/ui/toast";
import { DeleteDialog } from "@/components/ui/dialogs";
import { Button } from "@/components/ui/form-controls";
import { Plus, History } from "lucide-react";
import { useTranslation } from "@/lib/i18n";
import { formatDuration } from "@/lib/formatDuration";
import { getDefaultScheduleStartTime } from "@/lib/scheduleHelpers";

// Modular Subcomponents
import { ScheduleFilters } from "@/components/admin/schedules/ScheduleFilters";
import { ScheduleCopyModal } from "@/components/admin/schedules/ScheduleCopyModal";
import { ScheduleFormModal } from "@/components/admin/schedules/ScheduleFormModal";
import { ScheduleStudioCards, StudioScheduleGroup } from "@/components/admin/schedules/ScheduleStudioCards";

const scheduleSchema = (t: (key: string, ...args: any[]) => string) =>
  z.object({
    movieId: z.string().uuid(t("schedules.selectMovie")),
    studioId: z.string().uuid(t("schedules.selectStudio")),
    startTime: z.string().min(1, t("schedules.start")),
    ticketPrice: z.coerce.number().positive(t("schedules.price")),
    status: z.enum(["DRAFT", "PUBLISHED", "CLOSED"]),
  });

export default function SchedulesManagement() {
  const { t, locale, formatDate } = useTranslation();
  const schema = scheduleSchema(t);
  type ScheduleFormValues = z.infer<typeof schema>;
  const { success: toastSuccess, error: toastError } = useToast();

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [isCopyOpen, setIsCopyOpen] = useState(false);
  const [selectedSchedule, setSelectedSchedule] = useState<Schedule | null>(null);

  // Date & Filter states
  const [filterMode, setFilterMode] = useState<"active" | "today" | "all" | "custom">("active");
  const [customStartDate, setCustomStartDate] = useState("");
  const [customEndDate, setCustomEndDate] = useState("");
  const [selectedStudioFilter, setSelectedStudioFilter] = useState<string>("ALL");
  const [searchQuery, setSearchQuery] = useState("");

  // Copy schedule state
  const [sourceDate, setSourceDate] = useState("");
  const [targetDate, setTargetDate] = useState("");
  const [copyStatus, setCopyStatus] = useState("KEEP");

  const todayStr = useMemo(() => {
    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, "0");
    const d = String(now.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
  }, []);

  const queryParams = useMemo(() => {
    if (filterMode === "active") {
      return { startDate: todayStr };
    }
    if (filterMode === "today") {
      return { startDate: todayStr, endDate: todayStr };
    }
    if (filterMode === "custom") {
      return {
        startDate: customStartDate || undefined,
        endDate: customEndDate || undefined,
      };
    }
    return {};
  }, [filterMode, todayStr, customStartDate, customEndDate]);

  // Queries
  const { data: schedulesResponse, isLoading: schedulesLoading } = useGetSchedulesQuery(queryParams);
  const { data: moviesResponse } = useGetMoviesQuery({ status: "NOW_SHOWING", limit: 100 });
  const { data: studiosResponse, isLoading: studiosLoading } = useGetStudiosQuery({
    status: "ACTIVE",
    limit: 100,
  });

  // Mutations
  const [createSchedule, { isLoading: isCreating }] = useCreateScheduleMutation();
  const [updateSchedule, { isLoading: isUpdating }] = useUpdateScheduleMutation();
  const [deleteSchedule, { isLoading: isDeleting }] = useDeleteScheduleMutation();
  const [copySchedules, { isLoading: isCopying }] = useCopySchedulesMutation();

  const form = useForm<ScheduleFormValues>({
    resolver: zodResolver(schema),
  });
  const { reset, watch } = form;

  const selectedMovieId = watch("movieId");
  const selectedMovie = useMemo(() => {
    if (!selectedMovieId) return undefined;
    if (moviesResponse?.data) {
      const found = moviesResponse.data.find((m) => m?.id === selectedMovieId);
      if (found) return found;
    }
    if (selectedSchedule && selectedSchedule.movie && selectedSchedule.movieId === selectedMovieId) {
      return selectedSchedule.movie;
    }
    return undefined;
  }, [selectedMovieId, moviesResponse?.data, selectedSchedule]);

  const showDurationWarning = Boolean(selectedMovieId && selectedMovie && !selectedMovie.durationMinutes);

  const movieOptions = useMemo(() => {
    const opts = [
      { value: "", label: t("schedules.selectMovie") },
      ...(moviesResponse?.data?.filter(Boolean)?.map((m) => ({
        value: m.id,
        label: m.durationMinutes
          ? `${m.title} (${formatDuration(m.durationMinutes, locale)})`
          : `${m.title} (${t("movies.unspecified")})`,
      })) || []),
    ];

    if (
      selectedSchedule &&
      selectedSchedule.movie &&
      !opts.some((opt) => opt.value === selectedSchedule.movieId)
    ) {
      opts.push({
        value: selectedSchedule.movieId,
        label: selectedSchedule.movie.durationMinutes
          ? `${selectedSchedule.movie.title} (${formatDuration(selectedSchedule.movie.durationMinutes, locale)})`
          : selectedSchedule.movie.title,
      });
    }

    return opts;
  }, [moviesResponse?.data, selectedSchedule, t, locale]);

  const studioOptions = useMemo(() => {
    const opts = [
      { value: "", label: t("schedules.selectStudio") },
      ...(studiosResponse?.data
        ?.filter((s) => s.status === "ACTIVE")
        ?.map((s) => ({ value: s.id, label: `${s.name} (${s.code})` })) || []),
    ];

    if (
      selectedSchedule &&
      selectedSchedule.studio &&
      !opts.some((opt) => opt.value === selectedSchedule.studioId)
    ) {
      opts.push({
        value: selectedSchedule.studioId,
        label: `${selectedSchedule.studio.name} (${selectedSchedule.studio.code})`,
      });
    }

    return opts;
  }, [studiosResponse?.data, selectedSchedule, t]);

  const handleOpenAdd = (defaultStudioId?: string) => {
    setSelectedSchedule(null);
    reset({
      movieId: "",
      studioId: defaultStudioId || "",
      startTime: getDefaultScheduleStartTime(),
      ticketPrice: 45000,
      status: "DRAFT",
    });
    setIsFormOpen(true);
  };

  const handleOpenEdit = (sched: Schedule) => {
    setSelectedSchedule(sched);
    const d = new Date(sched.startTime);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    const hours = String(d.getHours()).padStart(2, "0");
    const minutes = String(d.getMinutes()).padStart(2, "0");
    const sTime = `${year}-${month}-${day}T${hours}:${minutes}`;

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

  const onSubmit = async (data: ScheduleFormValues) => {
    try {
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

  const groupedStudioSchedules: StudioScheduleGroup[] = useMemo(() => {
    const rawSchedules = schedulesResponse?.data || [];
    const rawStudios = studiosResponse?.data || [];

    const q = searchQuery.trim().toLowerCase();
    const filtered = rawSchedules.filter((s) => {
      if (!q) return true;
      const matchMovie = s.movie?.title?.toLowerCase().includes(q);
      const matchStudio = s.studio?.name?.toLowerCase().includes(q) || s.studio?.code?.toLowerCase().includes(q);
      const matchStatus = s.status?.toLowerCase().includes(q);
      return matchMovie || matchStudio || matchStatus;
    });

    const studioMap: Record<string, StudioScheduleGroup> = {};

    rawStudios.forEach((st) => {
      studioMap[st.id] = { studio: st, schedules: [] };
    });

    filtered.forEach((s) => {
      if (studioMap[s.studioId]) {
        studioMap[s.studioId].schedules.push(s);
      } else {
        studioMap[s.studioId] = {
          studio: (s.studio as any) || {
            id: s.studioId,
            name: "Studio",
            code: "-",
            type: "REGULAR",
            branchId: "",
            capacity: 0,
            status: "ACTIVE",
          },
          schedules: [s],
        };
      }
    });

    Object.values(studioMap).forEach((group) => {
      group.schedules.sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime());
    });

    let groups = Object.values(studioMap);

    if (selectedStudioFilter !== "ALL") {
      groups = groups.filter((g) => g.studio.id === selectedStudioFilter);
    }

    return groups;
  }, [schedulesResponse?.data, studiosResponse?.data, searchQuery, selectedStudioFilter]);

  const getStudioScheduleCount = (studioId: string) => {
    return (schedulesResponse?.data || []).filter((s) => s.studioId === studioId).length;
  };

  return (
    <div className="space-y-6 font-sans">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2 border-b border-zinc-200/60 dark:border-zinc-800/60">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
            {t("schedules.title")}
          </h1>
          <p className="text-xs sm:text-sm text-zinc-500 dark:text-zinc-400 mt-1">
            {t("schedules.subtitle")}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2.5 self-start sm:self-auto">
          <Button
            variant="secondary"
            onClick={handleOpenCopy}
            className="flex items-center gap-2 border-zinc-200 dark:border-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300 text-xs font-medium px-3.5 py-2 rounded-xl transition-all"
          >
            <History className="w-3.5 h-3.5 text-zinc-400 dark:text-zinc-500" />
            {t("schedules.copyYesterday")}
          </Button>
          <Button
            onClick={() => handleOpenAdd()}
            className="flex items-center gap-2 bg-zinc-900 hover:bg-zinc-800 text-white dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-white text-xs font-semibold px-4 py-2 rounded-xl shadow-2xs transition-all cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            {t("schedules.create")}
          </Button>
        </div>
      </div>

      {/* Unified Filters Bar */}
      <ScheduleFilters
        filterMode={filterMode}
        setFilterMode={setFilterMode}
        customStartDate={customStartDate}
        setCustomStartDate={setCustomStartDate}
        customEndDate={customEndDate}
        setCustomEndDate={setCustomEndDate}
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        selectedStudioFilter={selectedStudioFilter}
        setSelectedStudioFilter={setSelectedStudioFilter}
        studios={studiosResponse?.data}
        totalSchedulesCount={schedulesResponse?.data?.length || 0}
        getStudioScheduleCount={getStudioScheduleCount}
      />

      {/* Studio-Grouped Schedule List */}
      <ScheduleStudioCards
        isLoading={schedulesLoading || studiosLoading}
        groupedStudioSchedules={groupedStudioSchedules}
        onOpenAdd={handleOpenAdd}
        onOpenEdit={handleOpenEdit}
        onOpenDelete={handleOpenDelete}
      />

      {/* Copy Modal */}
      <ScheduleCopyModal
        isOpen={isCopyOpen}
        onClose={() => setIsCopyOpen(false)}
        sourceDate={sourceDate}
        setSourceDate={setSourceDate}
        targetDate={targetDate}
        setTargetDate={setTargetDate}
        copyStatus={copyStatus}
        setCopyStatus={setCopyStatus}
        isCopying={isCopying}
        onCopySubmit={handleCopySubmit}
      />

      {/* Form Modal */}
      <ScheduleFormModal
        isOpen={isFormOpen}
        onClose={() => setIsFormOpen(false)}
        selectedSchedule={selectedSchedule}
        form={form}
        onSubmit={onSubmit}
        isSaving={selectedSchedule ? isUpdating : isCreating}
        movieOptions={movieOptions}
        studioOptions={studioOptions}
        showDurationWarning={showDurationWarning}
      />

      {/* Delete Dialog */}
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
