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
import {
  Edit,
  Trash,
  Plus,
  Calendar as CalendarIcon,
  Clock,
  History,
  Copy,
  Filter,
  Search,
  Armchair,
  Building2,
  Layers,
  Film,
  Sparkles,
  Bell,
  AlertTriangle,
} from "lucide-react";
import { useTranslation } from "@/lib/i18n";
import { formatDuration } from "@/lib/formatDuration";

const scheduleSchema = (t: (key: string, ...args: any[]) => string) => z.object({
  movieId: z.string().uuid(t("schedules.selectMovie")),
  studioId: z.string().uuid(t("schedules.selectStudio")),
  startTime: z.string().min(1, t("schedules.start")),
  ticketPrice: z.coerce.number().positive(t("schedules.price")),
  status: z.enum(["DRAFT", "PUBLISHED", "CLOSED"]),
});

const getDingdongConflict = (schedule: Schedule, allSchedulesInStudio: Schedule[]) => {
  const currentStart = new Date(schedule.startTime).getTime();
  if (isNaN(currentStart)) return null;
  const currentDingdong = currentStart - 15 * 60 * 1000;

  for (const prev of allSchedulesInStudio) {
    if (prev.id === schedule.id) continue;
    const prevStart = new Date(prev.startTime).getTime();
    if (isNaN(prevStart) || prevStart >= currentStart) continue;

    let prevEnd = prev.endTime ? new Date(prev.endTime).getTime() : NaN;
    if (isNaN(prevEnd) && prev.movie?.durationMinutes) {
      prevEnd = prevStart + prev.movie.durationMinutes * 60 * 1000;
    }

    if (!isNaN(prevEnd) && currentDingdong < prevEnd && currentDingdong >= prevStart) {
      return {
        prevMovie: prev.movie?.title || "Film sebelumnya",
        prevEndTimeStr: new Date(prevEnd).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", hour12: false }),
      };
    }
  }
  return null;
};

export default function SchedulesManagement() {
  const { t, locale, formatDate, formatCurrency } = useTranslation();
  const schema = scheduleSchema(t);
  type ScheduleFormValues = z.infer<typeof schema>;
  const { success: toastSuccess, error: toastError } = useToast();

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [isCopyOpen, setIsCopyOpen] = useState(false);
  const [selectedSchedule, setSelectedSchedule] = useState<Schedule | null>(null);

  // Date & Filter states (Default: 'active' -> starting from today onwards)
  const [filterMode, setFilterMode] = useState<"active" | "today" | "all" | "custom">("active");
  const [customStartDate, setCustomStartDate] = useState("");
  const [customEndDate, setCustomEndDate] = useState("");
  const [selectedStudioFilter, setSelectedStudioFilter] = useState<string>("ALL");
  const [searchQuery, setSearchQuery] = useState("");

  // Copy schedule state
  const [sourceDate, setSourceDate] = useState("");
  const [targetDate, setTargetDate] = useState("");
  const [copyStatus, setCopyStatus] = useState("KEEP");

  const todayStr = React.useMemo(() => {
    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, "0");
    const d = String(now.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
  }, []);

  const queryParams = React.useMemo(() => {
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
    // "all"
    return {};
  }, [filterMode, todayStr, customStartDate, customEndDate]);

  // Queries
  const { data: schedulesResponse, isLoading: schedulesLoading } = useGetSchedulesQuery(queryParams);
  const { data: moviesResponse } = useGetMoviesQuery({ status: "NOW_SHOWING", limit: 100 });
  const { data: studiosResponse, isLoading: studiosLoading } = useGetStudiosQuery({ status: "ACTIVE", limit: 100 });

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
  const selectedMovie = React.useMemo(() => {
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

  const showDurationWarning = !!(selectedMovieId && selectedMovie && !selectedMovie.durationMinutes);

  const movieOptions = React.useMemo(() => {
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

  const studioOptions = React.useMemo(() => {
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

  const statusOptions = [
    { value: "DRAFT", label: "DRAFT" },
    { value: "PUBLISHED", label: "PUBLISHED" },
    { value: "CLOSED", label: "CLOSED" },
  ];

  const getDefaultStartTime = () => {
    const now = new Date();
    const targetDate = new Date(now);

    // Jika sudah pukul 21:00 atau lewat (hours >= 21), gunakan default hari esok pukul 10:00
    if (now.getHours() >= 21) {
      targetDate.setDate(targetDate.getDate() + 1);
      targetDate.setHours(10, 0, 0, 0);
    } else {
      // Jika masih sebelum pukul 21:00, bulatkan ke slot jam terdekat berikutnya
      const currentMinutes = now.getMinutes();
      if (currentMinutes > 30) {
        targetDate.setHours(now.getHours() + 1, 0, 0, 0);
      } else {
        targetDate.setMinutes(30, 0, 0);
      }
    }

    const year = targetDate.getFullYear();
    const month = String(targetDate.getMonth() + 1).padStart(2, "0");
    const day = String(targetDate.getDate()).padStart(2, "0");
    const hours = String(targetDate.getHours()).padStart(2, "0");
    const minutes = String(targetDate.getMinutes()).padStart(2, "0");

    return `${year}-${month}-${day}T${hours}:${minutes}`;
  };

  const handleOpenAdd = (defaultStudioId?: string) => {
    setSelectedSchedule(null);
    reset({
      movieId: "",
      studioId: defaultStudioId || "",
      startTime: getDefaultStartTime(),
      ticketPrice: 45000,
      status: "DRAFT",
    });
    setIsFormOpen(true);
  };

  // Group schedules strictly by studio
  const groupedStudioSchedules = React.useMemo(() => {
    const rawSchedules = schedulesResponse?.data || [];
    const rawStudios = studiosResponse?.data || [];

    // Filter by search query
    const q = searchQuery.trim().toLowerCase();
    const filtered = rawSchedules.filter((s) => {
      if (!q) return true;
      const matchMovie = s.movie?.title?.toLowerCase().includes(q);
      const matchStudio = s.studio?.name?.toLowerCase().includes(q) || s.studio?.code?.toLowerCase().includes(q);
      const matchStatus = s.status?.toLowerCase().includes(q);
      return matchMovie || matchStudio || matchStatus;
    });

    // Create studio buckets
    const studioMap: Record<string, { studio: any; schedules: Schedule[] }> = {};

    // First register all active studios from database
    rawStudios.forEach((st) => {
      studioMap[st.id] = { studio: st, schedules: [] };
    });

    // Populate schedules into studio buckets
    filtered.forEach((s) => {
      if (studioMap[s.studioId]) {
        studioMap[s.studioId].schedules.push(s);
      } else {
        studioMap[s.studioId] = {
          studio: s.studio || { id: s.studioId, name: "Studio", code: "-", type: "REGULAR" },
          schedules: [s],
        };
      }
    });

    // Sort showtimes inside each studio chronologically
    Object.values(studioMap).forEach((group) => {
      group.schedules.sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime());
    });

    let groups = Object.values(studioMap);

    // Apply studio tab filter
    if (selectedStudioFilter !== "ALL") {
      groups = groups.filter((g) => g.studio.id === selectedStudioFilter);
    }

    return groups;
  }, [schedulesResponse?.data, studiosResponse?.data, searchQuery, selectedStudioFilter]);

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

    // Format dates for inputs in local time
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
          {s?.movie?.poster && (
            <img src={s.movie.poster} alt={s.movie?.title || "Movie"} className="w-8 h-10 object-cover rounded-md" />
          )}
          <span className="font-semibold text-zinc-900 dark:text-zinc-50">{s?.movie?.title || "-"}</span>
        </div>
      ),
    },
    {
      key: "studio",
      header: t("schedules.studio"),
      render: (s: Schedule) => `${s.studio?.name} (${s.studio?.code})`,
    },
    {
      key: "dingdongTime",
      header: t("schedules.dingdongTime"),
      render: (s: Schedule) => {
        const startDate = new Date(s.startTime);
        const dingdongDate = new Date(startDate.getTime() - 15 * 60 * 1000);
        const dingdong = !isNaN(dingdongDate.getTime())
          ? dingdongDate.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", hour12: false })
          : "-";
        const conflict = getDingdongConflict(s, schedulesResponse?.data?.filter((other) => other.studioId === s.studioId) || []);
        return conflict ? (
          <div className="flex flex-col">
            <span className="text-xs font-mono font-bold text-rose-600 dark:text-rose-400 flex items-center gap-1.5">
              <Bell className="w-3.5 h-3.5 text-rose-500 shrink-0" />
              <span>{dingdong}</span>
              <span className="px-1.5 py-0.2 rounded text-[10px] font-sans font-bold bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20">
                -15 mnt
              </span>
            </span>
            <span className="text-[10px] text-rose-500 dark:text-rose-400 font-medium mt-0.5 flex items-center gap-1">
              <AlertTriangle className="w-3 h-3 shrink-0" />
              Selesai sblmnya: {conflict.prevEndTimeStr}
            </span>
          </div>
        ) : (
          <div className="flex flex-col">
            <span className="text-xs font-mono font-semibold text-amber-600 dark:text-amber-400 flex items-center gap-1.5">
              <Bell className="w-3.5 h-3.5 text-amber-500 shrink-0" /> {dingdong}
            </span>
            <span className="text-[10px] text-zinc-400 dark:text-zinc-500 mt-0.5">
              -15 mnt
            </span>
          </div>
        );
      },
    },
    {
      key: "startTime",
      header: t("schedules.showTime"),
      render: (s: Schedule) => {
        const start = new Date(s.startTime).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", hour12: false });
        const end = s.endTime
          ? new Date(s.endTime).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", hour12: false })
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
      <div className="bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800/80 rounded-2xl p-4 shadow-2xs space-y-3.5">
        {/* Row 1: Date Filter Mode & Search */}
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
          {/* Date Segmented Control */}
          <div className="flex items-center gap-1 bg-zinc-100 dark:bg-zinc-800/70 p-1 rounded-xl overflow-x-auto scrollbar-none">
            <button
              type="button"
              onClick={() => setFilterMode("active")}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${filterMode === "active"
                  ? "bg-white dark:bg-zinc-700 text-zinc-900 dark:text-zinc-50 shadow-2xs"
                  : "text-zinc-500 dark:text-zinc-400 hover:text-zinc-800 dark:hover:text-zinc-200"
                }`}
            >
              {t("schedules.filterActive")}
            </button>
            <button
              type="button"
              onClick={() => setFilterMode("today")}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${filterMode === "today"
                  ? "bg-white dark:bg-zinc-700 text-zinc-900 dark:text-zinc-50 shadow-2xs"
                  : "text-zinc-500 dark:text-zinc-400 hover:text-zinc-800 dark:hover:text-zinc-200"
                }`}
            >
              {t("schedules.filterToday")}
            </button>
            <button
              type="button"
              onClick={() => setFilterMode("all")}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${filterMode === "all"
                  ? "bg-white dark:bg-zinc-700 text-zinc-900 dark:text-zinc-50 shadow-2xs"
                  : "text-zinc-500 dark:text-zinc-400 hover:text-zinc-800 dark:hover:text-zinc-200"
                }`}
            >
              {t("schedules.filterAll")}
            </button>
            <button
              type="button"
              onClick={() => setFilterMode("custom")}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${filterMode === "custom"
                  ? "bg-white dark:bg-zinc-700 text-zinc-900 dark:text-zinc-50 shadow-2xs"
                  : "text-zinc-500 dark:text-zinc-400 hover:text-zinc-800 dark:hover:text-zinc-200"
                }`}
            >
              {t("schedules.filterCustom")}
            </button>
          </div>

          {/* Custom Date Range Picker */}
          {filterMode === "custom" && (
            <div className="flex flex-wrap items-center gap-2 bg-zinc-50 dark:bg-zinc-800/40 px-3 py-1.5 rounded-xl border border-zinc-200/80 dark:border-zinc-800">
              <span className="text-xs font-medium text-zinc-500 dark:text-zinc-400">{t("schedules.filterFrom")}:</span>
              <input
                type="date"
                value={customStartDate}
                onChange={(e) => setCustomStartDate(e.target.value)}
                className="px-2 py-1 bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg text-xs text-zinc-900 dark:text-zinc-100 focus:outline-none"
              />
              <span className="text-xs font-medium text-zinc-500 dark:text-zinc-400">{t("schedules.filterTo")}:</span>
              <input
                type="date"
                value={customEndDate}
                onChange={(e) => setCustomEndDate(e.target.value)}
                className="px-2 py-1 bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg text-xs text-zinc-900 dark:text-zinc-100 focus:outline-none"
              />
            </div>
          )}

          {/* Search Box */}
          <div className="relative min-w-[220px]">
            <Search className="w-3.5 h-3.5 text-zinc-400 dark:text-zinc-500 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={t("schedules.search")}
              className="w-full pl-8.5 pr-3 py-1.5 bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-200/80 dark:border-zinc-800 rounded-xl text-xs focus:outline-none focus:bg-white dark:focus:bg-zinc-900 focus:border-zinc-400 dark:focus:border-zinc-600 text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 transition-colors"
            />
          </div>
        </div>

        {/* Row 2: Studio Selector Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pt-1 border-t border-zinc-100 dark:border-zinc-800/60 scrollbar-none">
          <button
            type="button"
            onClick={() => setSelectedStudioFilter("ALL")}
            className={`px-3 py-1.5 rounded-xl text-xs font-medium whitespace-nowrap transition-all cursor-pointer flex items-center gap-1.5 ${selectedStudioFilter === "ALL"
                ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 shadow-2xs font-semibold"
                : "bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200/70 dark:border-zinc-800 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 hover:text-zinc-900 dark:hover:text-zinc-200"
              }`}
          >
            <Building2 className="w-3.5 h-3.5" />
            <span>{t("schedules.allStudios")}</span>
            <span className={`px-1.5 py-0.2 rounded-md text-[10px] font-mono ${selectedStudioFilter === "ALL"
                ? "bg-white/20 text-white dark:bg-zinc-900/15 dark:text-zinc-900"
                : "bg-zinc-200/70 dark:bg-zinc-700 text-zinc-600 dark:text-zinc-300"
              }`}>
              {schedulesResponse?.data?.length || 0}
            </span>
          </button>

          {studiosResponse?.data?.map((st) => {
            const count = (schedulesResponse?.data || []).filter((s) => s.studioId === st.id).length;
            const isSelected = selectedStudioFilter === st.id;
            return (
              <button
                key={st.id}
                type="button"
                onClick={() => setSelectedStudioFilter(st.id)}
                className={`px-3 py-1.5 rounded-xl text-xs font-medium whitespace-nowrap transition-all cursor-pointer flex items-center gap-1.5 ${isSelected
                    ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 shadow-2xs font-semibold"
                    : "bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200/70 dark:border-zinc-800 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 hover:text-zinc-900 dark:hover:text-zinc-200"
                  }`}
              >
                <Armchair className="w-3.5 h-3.5" />
                <span>{st.name}</span>
                <span className={`px-1.5 py-0.2 rounded-md text-[10px] font-mono ${isSelected
                    ? "bg-white/20 text-white dark:bg-zinc-900/15 dark:text-zinc-900"
                    : "bg-zinc-200/70 dark:bg-zinc-700 text-zinc-600 dark:text-zinc-300"
                  }`}>
                  {count}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Studio-Grouped Schedule List */}
      <div className="space-y-5">
        {schedulesLoading || studiosLoading ? (
          <div className="p-12 text-center text-zinc-500 dark:text-zinc-400 bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800 rounded-2xl">
            <div className="animate-spin w-6 h-6 border-2 border-zinc-600 dark:border-zinc-300 border-t-transparent rounded-full mx-auto mb-3" />
            <p className="text-sm">Memuat jadwal tayang studio...</p>
          </div>
        ) : groupedStudioSchedules.length === 0 ? (
          <div className="p-12 text-center text-zinc-500 dark:text-zinc-400 bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800 rounded-2xl">
            <Armchair className="w-10 h-10 text-zinc-300 dark:text-zinc-700 mx-auto mb-3" />
            <p className="text-sm font-medium">{t("schedules.noSchedulesInStudio")}</p>
          </div>
        ) : (
          groupedStudioSchedules.map((group) => {
            const typeStyles = {
              VIP: "bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/20",
              PREMIERE: "bg-purple-500/10 text-purple-700 dark:text-purple-300 border-purple-500/20",
              REGULAR: "bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 border-zinc-200 dark:border-zinc-700",
            }[group.studio?.type as "VIP" | "PREMIERE" | "REGULAR"] || "bg-zinc-100 text-zinc-600 border-zinc-200";

            return (
              <div
                key={group.studio.id}
                className="bg-white dark:bg-zinc-900/90 border border-zinc-200/80 dark:border-zinc-800/80 rounded-2xl overflow-hidden shadow-2xs transition-all hover:border-zinc-300/80 dark:hover:border-zinc-700/80"
              >
                {/* Studio Section Header */}
                <div className="px-5 py-3.5 bg-zinc-50/50 dark:bg-zinc-800/30 border-b border-zinc-150/70 dark:border-zinc-800/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex flex-wrap items-center gap-2.5">
                    <div className="w-8 h-8 rounded-lg bg-zinc-200/70 dark:bg-zinc-800 flex items-center justify-center text-zinc-700 dark:text-zinc-300 shrink-0">
                      <Armchair className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h2 className="text-sm font-bold text-zinc-900 dark:text-zinc-100">
                          {group.studio.name}
                        </h2>
                        <span className="text-xs font-mono text-zinc-400 dark:text-zinc-500">
                          ({group.studio.code})
                        </span>
                      </div>
                    </div>

                    <span className={`px-2 py-0.5 rounded-md text-[10px] font-semibold border uppercase tracking-wider ${typeStyles}`}>
                      {group.studio.type || "REGULAR"}
                    </span>

                    <span className="text-xs text-zinc-500 dark:text-zinc-400 flex items-center gap-1.5 font-medium ml-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-zinc-300 dark:bg-zinc-600" />
                      {group.schedules.length} Jadwal
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleOpenAdd(group.studio.id)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-zinc-700 dark:text-zinc-300 bg-white dark:bg-zinc-800 border border-zinc-200/90 dark:border-zinc-700/80 hover:bg-zinc-50 dark:hover:bg-zinc-750 hover:text-zinc-900 dark:hover:text-zinc-100 shadow-2xs transition-all cursor-pointer self-start sm:self-auto"
                  >
                    <Plus className="w-3.5 h-3.5 text-zinc-500 dark:text-zinc-400" />
                    <span>{t("schedules.create")}</span>
                  </button>
                </div>

                {/* Studio Schedules Table */}
                {group.schedules.length > 0 ? (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse text-xs">
                      <thead>
                        <tr className="border-b border-zinc-150/80 dark:border-zinc-800/80 text-zinc-400 dark:text-zinc-500 font-semibold uppercase tracking-wider text-[11px]">
                          <th className="py-2.5 px-5">{t("schedules.movie")}</th>
                          <th className="py-2.5 px-5">{t("schedules.dingdongTime")}</th>
                          <th className="py-2.5 px-5">{t("schedules.showTime")}</th>
                          <th className="py-2.5 px-5">{t("schedules.price")}</th>
                          <th className="py-2.5 px-5">{t("schedules.status")}</th>
                          <th className="py-2.5 px-5 text-right">{t("schedules.actions")}</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-zinc-150/60 dark:divide-zinc-800/60">
                        {group.schedules.map((s) => {
                          const startDate = new Date(s.startTime);
                          const dingdongDate = new Date(startDate.getTime() - 15 * 60 * 1000);
                          const dingdong = !isNaN(dingdongDate.getTime())
                            ? dingdongDate.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", hour12: false })
                            : "-";
                          const start = !isNaN(startDate.getTime())
                            ? startDate.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", hour12: false })
                            : "-";
                          const end = s.endTime
                            ? new Date(s.endTime).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", hour12: false })
                            : "-";
                          const date = formatDate(s.businessDate || s.startTime);
                          const dingdongConflict = getDingdongConflict(s, group.schedules);

                          return (
                            <tr key={s.id} className={`transition-colors ${dingdongConflict ? "bg-rose-500/5 hover:bg-rose-500/10" : "hover:bg-zinc-50/50 dark:hover:bg-zinc-800/30"}`}>
                              {/* Movie */}
                              <td className="py-3 px-5">
                                <div className="flex items-center gap-3">
                                  {s?.movie?.poster ? (
                                    <img
                                      src={s.movie.poster}
                                      alt={s.movie?.title || "Movie"}
                                      className="w-8 h-11 object-cover rounded-md border border-zinc-200/60 dark:border-zinc-800 shadow-2xs shrink-0"
                                    />
                                  ) : (
                                    <div className="w-8 h-11 rounded-md bg-zinc-100 dark:bg-zinc-800 border border-zinc-200/60 dark:border-zinc-800 flex items-center justify-center text-zinc-400 shrink-0">
                                      <Film className="w-4 h-4" />
                                    </div>
                                  )}
                                  <div>
                                    <span className="font-semibold text-zinc-900 dark:text-zinc-100 text-xs block">
                                      {s?.movie?.title || "-"}
                                    </span>
                                    {s?.movie?.durationMinutes ? (
                                      <span className="text-[11px] text-zinc-400 dark:text-zinc-500">
                                        {formatDuration(s.movie.durationMinutes, locale)}
                                      </span>
                                    ) : null}
                                  </div>
                                </div>
                              </td>

                              {/* Jam Dindong */}
                              <td className="py-3 px-5">
                                {dingdongConflict ? (
                                  <div className="flex flex-col">
                                    <span className="text-xs font-mono font-bold text-rose-600 dark:text-rose-400 flex items-center gap-1.5">
                                      <Bell className="w-3.5 h-3.5 text-rose-500 shrink-0" />
                                      <span>{dingdong}</span>
                                      <span className="px-1.5 py-0.2 rounded text-[10px] font-sans font-bold bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20">
                                        -15 mnt
                                      </span>
                                    </span>
                                    <span
                                      className="text-[10px] text-rose-500 dark:text-rose-400 font-medium mt-0.5 flex items-center gap-1"
                                      title={`Jam dindong (${dingdong}) bertabrakan dengan "${dingdongConflict.prevMovie}" yang baru selesai pukul ${dingdongConflict.prevEndTimeStr}`}
                                    >
                                      <AlertTriangle className="w-3 h-3 shrink-0" />
                                      Selesai sblmnya: {dingdongConflict.prevEndTimeStr}
                                    </span>
                                  </div>
                                ) : (
                                  <div className="flex flex-col">
                                    <span className="text-xs font-mono font-semibold text-amber-600 dark:text-amber-400 flex items-center gap-1.5">
                                      <Bell className="w-3.5 h-3.5 text-amber-500 shrink-0" /> {dingdong}
                                    </span>
                                    <span className="text-[11px] text-zinc-400 dark:text-zinc-500 mt-0.5">
                                      -15 mnt
                                    </span>
                                  </div>
                                )}
                              </td>

                              {/* Showtime */}
                              <td className="py-3 px-5">
                                <div className="flex flex-col">
                                  <span className="text-zinc-800 dark:text-zinc-200 font-medium text-xs">{date}</span>
                                  <span className="text-xs font-mono font-medium text-zinc-600 dark:text-zinc-400 flex items-center gap-1.5 mt-0.5">
                                    <Clock className="w-3.5 h-3.5 text-zinc-400 dark:text-zinc-500" /> {start} - {end}
                                  </span>
                                </div>
                              </td>

                              {/* Price */}
                              <td className="py-3 px-5 font-mono font-semibold text-zinc-900 dark:text-zinc-100 text-xs">
                                {formatCurrency(s.ticketPrice)}
                              </td>

                              {/* Status */}
                              <td className="py-3 px-5">
                                {s.status === "PUBLISHED" ? (
                                  <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20">
                                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                                    {s.status}
                                  </span>
                                ) : s.status === "CLOSED" ? (
                                  <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-rose-500/10 text-rose-700 dark:text-rose-400 border border-rose-500/20">
                                    <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
                                    {s.status}
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-zinc-500/10 text-zinc-700 dark:text-zinc-300 border border-zinc-500/20">
                                    <span className="w-1.5 h-1.5 rounded-full bg-zinc-400" />
                                    {s.status}
                                  </span>
                                )}
                              </td>

                              {/* Actions */}
                              <td className="py-3 px-5 text-right">
                                <div className="flex items-center justify-end gap-1">
                                  <button
                                    onClick={() => handleOpenEdit(s)}
                                    className="p-1.5 text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg transition-colors cursor-pointer"
                                    title={t("schedules.edit")}
                                  >
                                    <Edit className="w-3.5 h-3.5" />
                                  </button>
                                  <button
                                    onClick={() => handleOpenDelete(s)}
                                    className="p-1.5 text-zinc-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 rounded-lg transition-colors cursor-pointer"
                                    title={t("schedules.deleteTitle")}
                                  >
                                    <Trash className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="py-8 px-5 text-center text-zinc-400 dark:text-zinc-500 text-xs flex flex-col items-center justify-center gap-2">
                    <p>{t("schedules.noSchedulesInStudio")}</p>
                    <button
                      type="button"
                      onClick={() => handleOpenAdd(group.studio.id)}
                      className="text-xs font-semibold text-zinc-700 dark:text-zinc-300 hover:text-zinc-900 dark:hover:text-zinc-100 underline underline-offset-2 cursor-pointer"
                    >
                      + {t("schedules.addScheduleForStudio")}
                    </button>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

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

          <div className="bg-zinc-50 dark:bg-zinc-850/80 border border-zinc-200 dark:border-zinc-800 rounded-xl p-3.5 text-xs text-zinc-600 dark:text-zinc-300 flex items-start gap-2.5">
            <History className="w-4 h-4 text-zinc-400 shrink-0 mt-0.5" />
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
            <Button type="submit" isLoading={isCopying} className="flex items-center gap-2 bg-zinc-900 hover:bg-zinc-800 text-white dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-white">
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
