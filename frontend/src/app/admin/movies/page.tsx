"use client";

import React, { useState } from "react";
import {
  useGetMoviesQuery,
  useCreateMovieMutation,
  useUpdateMovieMutation,
  useDeleteMovieMutation,
  useImportMoviesMutation,
  useGetGenresQuery,
  useCreateGenreMutation,
  useUpdateGenreMutation,
  useDeleteGenreMutation,
  useGetPHsQuery,
  useCreatePHMutation,
  useUpdatePHMutation,
  useDeletePHMutation,
  useGetDistributorsQuery,
  useCreateDistributorMutation,
  useUpdateDistributorMutation,
  useDeleteDistributorMutation,
  Movie,
  Genre,
  ProductionHouse,
  Distributor,
} from "@/services/movieApi";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useToast } from "@/components/ui/toast";
import { DataTable } from "@/components/ui/data-table";
import { Modal } from "@/components/ui/modal";
import { DeleteDialog } from "@/components/ui/dialogs";
import { Input, Select, Button } from "@/components/ui/form-controls";
import { Edit, Trash, Plus, Film, Tag, Building2, Truck, Download } from "lucide-react";
import Link from "next/link";
import { useTranslation } from "@/lib/i18n";

// --- VALIDATION SCHEMAS ---
const movieFormSchema = (t: (key: string) => string) => z.object({
  title: z.string().min(1, t("validation.titleRequired")),
  synopsis: z.string().optional().nullable(),
  durationMinutes: z.preprocess((val) => val === "" || val === null || val === undefined ? null : Number(val), z.number().int().positive(t("validation.durationPositive")).nullable().optional()),
  censorshipRating: z.string().min(1, t("validation.censorshipRequired")),
  poster: z.string().optional().nullable(),
  trailerUrl: z.string().optional().nullable(),
  status: z.enum(["DRAFT", "COMING_SOON", "NOW_SHOWING", "ENDED", "ARCHIVED"]),
  productionHouseId: z.string().uuid(t("validation.productionRequired")),
  distributorId: z.string().uuid(t("validation.distributorRequired")).optional().nullable(),
  genreIds: z.array(z.string().uuid()).min(1, t("validation.genreRequired")),
});

const genreFormSchema = (t: (key: string) => string) => z.object({
  name: z.string().min(1, t("validation.nameRequired")),
  description: z.string().optional().nullable(),
  isActive: z.boolean().default(true),
});

const phFormSchema = (t: (key: string) => string) => z.object({
  name: z.string().min(1, t("validation.nameRequired")),
  contactPerson: z.string().optional().nullable(),
  phone: z.string().optional().nullable(),
  email: z.string().email(t("validation.emailInvalid")).optional().or(z.literal("")).nullable(),
  address: z.string().optional().nullable(),
  isActive: z.boolean().default(true),
});

const distributorFormSchema = (t: (key: string) => string) => z.object({
  name: z.string().min(1, t("validation.nameRequired")),
  contactPerson: z.string().optional().nullable(),
  phone: z.string().optional().nullable(),
  email: z.string().email(t("validation.emailInvalid")).optional().or(z.literal("")).nullable(),
  address: z.string().optional().nullable(),
  isActive: z.boolean().default(true),
});

export default function MoviesDashboard() {
  const { t, locale, formatNumber } = useTranslation();
  const movieSchema = movieFormSchema(t);
  const genreSchema = genreFormSchema(t);
  const phSchema = phFormSchema(t);
  const distributorSchema = distributorFormSchema(t);
  const [activeTab, setActiveTab] = useState<"movies" | "genres" | "phs" | "dists">("movies");
  const { success: toastSuccess, error: toastError } = useToast();

  // --- QUERY HOOKS ---
  const [movieSearch, setMovieSearch] = useState("");
  const [movieFilterStatus, setMovieFilterStatus] = useState("");
  const [movieFilterGenre, setMovieFilterGenre] = useState("");
  const [moviePage, setMoviePage] = useState(1);

  const { data: moviesResponse, isLoading: moviesLoading } = useGetMoviesQuery({
    page: moviePage,
    search: movieSearch || undefined,
    status: movieFilterStatus || undefined,
    genreId: movieFilterGenre || undefined,
  });

  const { data: genresResponse, isLoading: genresLoading } = useGetGenresQuery();
  const { data: phsResponse, isLoading: phsLoading } = useGetPHsQuery();
  const { data: distsResponse, isLoading: distsLoading } = useGetDistributorsQuery();

  // --- MUTATION HOOKS ---
  const [createMovie, { isLoading: isMovieSaving }] = useCreateMovieMutation();
  const [updateMovie] = useUpdateMovieMutation();
  const [deleteMovie, { isLoading: isMovieDeleting }] = useDeleteMovieMutation();
  const [importMovies, { isLoading: isImporting }] = useImportMoviesMutation();

  const [createGenre, { isLoading: isGenreSaving }] = useCreateGenreMutation();
  const [updateGenre] = useUpdateGenreMutation();
  const [deleteGenre] = useDeleteGenreMutation();

  const [createPH, { isLoading: isPHSaving }] = useCreatePHMutation();
  const [updatePH] = useUpdatePHMutation();
  const [deletePH] = useDeletePHMutation();

  const [createDist, { isLoading: isDistSaving }] = useCreateDistributorMutation();
  const [updateDist] = useUpdateDistributorMutation();
  const [deleteDist] = useDeleteDistributorMutation();

  // --- STATE FOR MODALS ---
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isImportOpen, setIsImportOpen] = useState(false);
  const [importType, setImportType] = useState<"NOW_PLAYING" | "UPCOMING" | "BOTH">("BOTH");
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<any | null>(null);

  // --- FORMS CONFIG ---
  const movieForm = useForm<z.infer<typeof movieSchema>>({ resolver: zodResolver(movieSchema) });
  const genreForm = useForm<z.infer<typeof genreSchema>>({ resolver: zodResolver(genreSchema) });
  const phForm = useForm<z.infer<typeof phSchema>>({ resolver: zodResolver(phSchema) });
  const distForm = useForm<z.infer<typeof distributorSchema>>({ resolver: zodResolver(distributorSchema) });

  const handleOpenAdd = () => {
    setSelectedItem(null);
    if (activeTab === "movies") {
      movieForm.reset({
        title: "",
        synopsis: "",
        durationMinutes: undefined,
        censorshipRating: "SU",
        poster: "",
        trailerUrl: "",
        status: "DRAFT",
        productionHouseId: "",
        distributorId: "",
        genreIds: [],
      });
    } else if (activeTab === "genres") {
      genreForm.reset({ name: "", description: "", isActive: true });
    } else if (activeTab === "phs") {
      phForm.reset({ name: "", contactPerson: "", phone: "", email: "", address: "", isActive: true });
    } else {
      distForm.reset({ name: "", contactPerson: "", phone: "", email: "", address: "", isActive: true });
    }
    setIsFormOpen(true);
  };

  const handleOpenEdit = (item: any) => {
    setSelectedItem(item);
    if (activeTab === "movies") {
      movieForm.reset({
        title: item.title,
        synopsis: item.synopsis || "",
        durationMinutes: item.durationMinutes ?? undefined,
        censorshipRating: item.censorshipRating,
        poster: item.poster || "",
        trailerUrl: item.trailerUrl || "",
        status: item.status,
        productionHouseId: item.productionHouseId,
        distributorId: item.distributorId || "",
        genreIds: item.genres.map((g: any) => g.genre.id),
      });
    } else if (activeTab === "genres") {
      genreForm.reset({ name: item.name, description: item.description || "", isActive: item.isActive });
    } else if (activeTab === "phs") {
      phForm.reset({
        name: item.name,
        contactPerson: item.contactPerson || "",
        phone: item.phone || "",
        email: item.email || "",
        address: item.address || "",
        isActive: item.isActive,
      });
    } else {
      distForm.reset({
        name: item.name,
        contactPerson: item.contactPerson || "",
        phone: item.phone || "",
        email: item.email || "",
        address: item.address || "",
        isActive: item.isActive,
      });
    }
    setIsFormOpen(true);
  };

  const handleOpenDelete = (item: any) => {
    setSelectedItem(item);
    setIsDeleteOpen(true);
  };

  // --- SUBMIT OPERATIONS ---
  const onSave = async (data: any) => {
    try {
      if (activeTab === "movies") {
        const payload = {
          ...data,
          synopsis: data.synopsis === "" ? null : data.synopsis,
          durationMinutes: data.durationMinutes === "" || data.durationMinutes === undefined || data.durationMinutes === null ? null : Number(data.durationMinutes),
        };
        if (selectedItem) {
          await updateMovie({ id: selectedItem.id, body: payload }).unwrap();
          toastSuccess(`${t("movies.titleLabel")} ${t("movies.updated")}`);
        } else {
          await createMovie(payload).unwrap();
          toastSuccess(`${t("movies.titleLabel")} ${t("movies.created")}`);
        }
      } else if (activeTab === "genres") {
        if (selectedItem) {
          await updateGenre({ id: selectedItem.id, body: data }).unwrap();
          toastSuccess(`${t("movies.genres")} ${t("movies.updated")}`);
        } else {
          await createGenre(data).unwrap();
          toastSuccess(`${t("movies.genres")} ${t("movies.created")}`);
        }
      } else if (activeTab === "phs") {
        if (selectedItem) {
          await updatePH({ id: selectedItem.id, body: data }).unwrap();
          toastSuccess(`${t("movies.productionHouses")} ${t("movies.updated")}`);
        } else {
          await createPH(data).unwrap();
          toastSuccess(`${t("movies.productionHouses")} ${t("movies.created")}`);
        }
      } else {
        if (selectedItem) {
          await updateDist({ id: selectedItem.id, body: data }).unwrap();
          toastSuccess(`${t("movies.distributors")} ${t("movies.updated")}`);
        } else {
          await createDist(data).unwrap();
          toastSuccess(`${t("movies.distributors")} ${t("movies.created")}`);
        }
      }
      setIsFormOpen(false);
    } catch (err: any) {
      toastError(err?.data?.message || t("movies.saveFailed"));
    }
  };

  const onDelete = async () => {
    if (!selectedItem) return;
    try {
      if (activeTab === "movies") {
        await deleteMovie(selectedItem.id).unwrap();
        toastSuccess(t("movies.archived"));
      } else if (activeTab === "genres") {
        await deleteGenre(selectedItem.id).unwrap();
        toastSuccess(`${t("movies.genres")} ${t("movies.deleted")}`);
      } else if (activeTab === "phs") {
        await deletePH(selectedItem.id).unwrap();
        toastSuccess(`${t("movies.productionHouses")} ${t("movies.deleted")}`);
      } else {
        await deleteDist(selectedItem.id).unwrap();
        toastSuccess(`${t("movies.distributors")} ${t("movies.deleted")}`);
      }
      setIsDeleteOpen(false);
    } catch (err: any) {
      toastError(err?.data?.message || t("movies.operationFailed"));
    }
  };

  const onImport = async () => {
    try {
      const result = await importMovies({ source: "21CINEPLEX", type: importType, cityId: "72" }).unwrap();
      const summary = result.data;
      toastSuccess(`${t("movies.importSuccess")}: ${formatNumber(summary.created)} ${t("movies.created")}, ${formatNumber(summary.updated)} ${t("movies.updated")}, ${formatNumber(summary.skipped)} skipped, ${formatNumber(summary.failed)} failed`);
      setIsImportOpen(false);
    } catch (err: any) {
      toastError(err?.data?.message || t("movies.operationFailed"));
    }
  };

  // --- OPTION ARRAYS ---
  const phOptions = [
    { value: "", label: t("movies.productionHouse") },
    ...(phsResponse?.data?.map((p) => ({ value: p.id, label: p.name })) || []),
  ];

  const distOptions = [
    { value: "", label: t("movies.distributor") },
    ...(distsResponse?.data?.map((d) => ({ value: d.id, label: d.name })) || []),
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

  // --- DATA COLUMNS ---
  const movieColumns = [
    {
      key: "title",
      header: t("movies.titleLabel"),
      render: (m: Movie) => (
        <div className="flex items-center gap-3">
          {m.poster ? (
            <img src={m.poster} alt={m.title} className="w-10 h-14 object-cover rounded-md" />
          ) : (
            <div className="w-10 h-14 bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center rounded-md text-zinc-400">
              <Film className="w-5 h-5" />
            </div>
          )}
          <div>
            <Link href={`/movies/${m.id}`} className="font-semibold text-zinc-900 dark:text-zinc-50 hover:text-indigo-600 dark:hover:text-indigo-400">
              {m.title}
            </Link>
            <div className="text-xs text-zinc-400">{m.originalTitle || m.title}</div>
          </div>
        </div>
      ),
    },
    { key: "durationMinutes", header: t("movies.duration"), render: (m: Movie) => {
      if (!m.durationMinutes) return t("movies.unspecified");
      const hours = Math.floor(m.durationMinutes / 60);
      const minutes = m.durationMinutes % 60;
      const minuteLabel = locale === "id" ? "menit" : "min";
      const hourLabel = locale === "id" ? "jam" : "hr";
      if (!hours) return `${minutes} ${minuteLabel}`;
      if (!minutes) return `${hours} ${hourLabel}`;
      return `${hours} ${hourLabel} ${minutes} ${minuteLabel}`;
    } },
    {
      key: "status",
      header: t("movies.status"),
      render: (m: Movie) => {
        const statusColors = {
          DRAFT: "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300",
          COMING_SOON: "bg-blue-50 text-blue-600 dark:bg-blue-950/40 dark:text-blue-400",
          NOW_SHOWING: "bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400",
          ENDED: "bg-amber-50 text-amber-600 dark:bg-amber-950/40 dark:text-amber-400",
          ARCHIVED: "bg-rose-50 text-rose-600 dark:bg-rose-950/40 dark:text-rose-400",
        };
        return (
          <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${statusColors[m.status]}`}>
            {m.status.replace("_", " ")}
          </span>
        );
      },
    },
    {
      key: "genres",
      header: t("movies.genres"),
      render: (m: Movie) => (
        <div className="flex flex-wrap gap-1">
          {m.genres.map((g) => (
            <span
              key={g.genre.id}
              className="px-1.5 py-0.5 rounded-md text-[10px] bg-indigo-50/50 dark:bg-indigo-950/30 text-indigo-600 dark:text-indigo-400 font-medium"
            >
              {g.genre.name}
            </span>
          ))}
        </div>
      ),
    },
    {
      key: "actions",
      header: t("movies.actions"),
      render: (m: Movie) => (
        <div className="flex gap-2">
          <button onClick={() => handleOpenEdit(m)} className="p-1 text-zinc-400 hover:text-indigo-600 cursor-pointer">
            <Edit className="w-4 h-4" />
          </button>
          <button onClick={() => handleOpenDelete(m)} className="p-1 text-zinc-400 hover:text-rose-600 cursor-pointer">
            <Trash className="w-4 h-4" />
          </button>
        </div>
      ),
    },
  ];

  const genreColumns = [
    { key: "name", header: t("movies.name") },
    { key: "description", header: t("movies.description") },
    {
      key: "isActive",
      header: t("movies.status"),
      render: (g: Genre) => (
        <span
          className={`px-2.5 py-1 rounded-full text-xs font-semibold ${
            g.isActive
              ? "bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400"
              : "bg-rose-50 text-rose-600 dark:bg-rose-950/40 dark:text-rose-400"
          }`}
        >
          {g.isActive ? t("movies.active") : t("movies.disabled")}
        </span>
      ),
    },
    {
      key: "actions",
      header: t("movies.actions"),
      render: (g: Genre) => (
        <div className="flex gap-2">
          <button onClick={() => handleOpenEdit(g)} className="p-1 text-zinc-400 hover:text-indigo-600 cursor-pointer">
            <Edit className="w-4 h-4" />
          </button>
          <button onClick={() => handleOpenDelete(g)} className="p-1 text-zinc-400 hover:text-rose-600 cursor-pointer">
            <Trash className="w-4 h-4" />
          </button>
        </div>
      ),
    },
  ];

  const phColumns = [
    { key: "name", header: t("movies.name") },
    { key: "contactPerson", header: t("movies.contact") },
    { key: "phone", header: t("movies.phone") },
    { key: "email", header: t("movies.email") },
    {
      key: "actions",
      header: t("movies.actions"),
      render: (item: any) => (
        <div className="flex gap-2">
          <button onClick={() => handleOpenEdit(item)} className="p-1 text-zinc-400 hover:text-indigo-600 cursor-pointer">
            <Edit className="w-4 h-4" />
          </button>
          <button onClick={() => handleOpenDelete(item)} className="p-1 text-zinc-400 hover:text-rose-600 cursor-pointer">
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
            {t("movies.title")}
          </h1>
          <p className="text-zinc-500 dark:text-zinc-400 mt-1">
            {t("movies.subtitle")}
          </p>
        </div>
        <div className="flex gap-2 self-start sm:self-auto">
          <Button variant="secondary" onClick={() => setIsImportOpen(true)} className="flex items-center gap-2">
            <Download className="w-4 h-4" /> {t("movies.import")}
          </Button>
          <Button onClick={handleOpenAdd} className="flex items-center gap-2">
            <Plus className="w-4 h-4" /> {t("movies.add")}
          </Button>
        </div>
      </div>

      {/* Tabs Menu */}
      <div className="flex border-b border-zinc-200 dark:border-zinc-800 gap-2">
        <button
          onClick={() => setActiveTab("movies")}
          className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 cursor-pointer transition-all ${
            activeTab === "movies"
              ? "border-indigo-600 text-indigo-600 dark:text-indigo-400"
              : "border-transparent text-zinc-500 hover:text-zinc-700 hover:border-zinc-300"
          }`}
        >
          <Film className="w-4 h-4" /> {t("movies.movies")}
        </button>
        <button
          onClick={() => setActiveTab("genres")}
          className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 cursor-pointer transition-all ${
            activeTab === "genres"
              ? "border-indigo-600 text-indigo-600 dark:text-indigo-400"
              : "border-transparent text-zinc-500 hover:text-zinc-700 hover:border-zinc-300"
          }`}
        >
          <Tag className="w-4 h-4" /> {t("movies.genres")}
        </button>
        <button
          onClick={() => setActiveTab("phs")}
          className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 cursor-pointer transition-all ${
            activeTab === "phs"
              ? "border-indigo-600 text-indigo-600 dark:text-indigo-400"
              : "border-transparent text-zinc-500 hover:text-zinc-700 hover:border-zinc-300"
          }`}
        >
          <Building2 className="w-4 h-4" /> {t("movies.productionHouses")}
        </button>
        <button
          onClick={() => setActiveTab("dists")}
          className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 cursor-pointer transition-all ${
            activeTab === "dists"
              ? "border-indigo-600 text-indigo-600 dark:text-indigo-400"
              : "border-transparent text-zinc-500 hover:text-zinc-700 hover:border-zinc-300"
          }`}
        >
          <Truck className="w-4 h-4" /> {t("movies.distributors")}
        </button>
      </div>

      {/* Movies Tab Panel */}
      {activeTab === "movies" && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <Select
              options={[
                { value: "", label: t("movies.allStatuses") },
                { value: "DRAFT", label: "Draft" },
                { value: "COMING_SOON", label: "Coming Soon" },
                { value: "NOW_SHOWING", label: "Now Showing" },
                { value: "ENDED", label: "Ended" },
              ]}
              onChange={(e) => {
                setMoviePage(1);
                setMovieFilterStatus(e.target.value);
              }}
              className="max-w-[180px]"
            />
            <Select
              options={[
                { value: "", label: t("movies.allGenres") },
                ...(genresResponse?.data?.map((g) => ({ value: g.id, label: g.name })) || []),
              ]}
              onChange={(e) => {
                setMoviePage(1);
                setMovieFilterGenre(e.target.value);
              }}
              className="max-w-[180px]"
            />
          </div>
          <DataTable
            columns={movieColumns}
            data={moviesResponse?.data || []}
            isLoading={moviesLoading}
            onSearch={(value) => {
              setMoviePage(1);
              setMovieSearch(value);
            }}
            searchPlaceholder={t("movies.search")}
            pagination={
              moviesResponse?.meta
                ? {
                    currentPage: moviesResponse.meta.page,
                    totalPages: moviesResponse.meta.totalPages,
                    onPageChange: setMoviePage,
                  }
                : undefined
            }
          />
        </div>
      )}

      {/* Genres Tab Panel */}
      {activeTab === "genres" && (
        <DataTable columns={genreColumns} data={genresResponse?.data || []} isLoading={genresLoading} />
      )}

      {/* PHs Tab Panel */}
      {activeTab === "phs" && (
        <DataTable columns={phColumns} data={phsResponse?.data || []} isLoading={phsLoading} />
      )}

      {/* Distributors Tab Panel */}
      {activeTab === "dists" && (
        <DataTable columns={phColumns} data={distsResponse?.data || []} isLoading={distsLoading} />
      )}

      <Modal
        isOpen={isImportOpen}
        onClose={() => setIsImportOpen(false)}
        title={t("movies.import")}
        size="md"
      >
        <div className="space-y-4">
          <Select
            label={t("movies.importSource")}
            options={[
              { value: "BOTH", label: "Now Playing and Upcoming" },
              { value: "NOW_PLAYING", label: "Now Playing" },
              { value: "UPCOMING", label: "Upcoming" },
            ]}
            value={importType}
            onChange={(event) => setImportType(event.target.value as typeof importType)}
          />
          <p className="text-sm text-zinc-500">City is fixed to 72 for Now Playing imports.</p>
          <div className="flex justify-end gap-3 pt-4 border-t border-zinc-100 dark:border-zinc-800">
            <Button variant="secondary" type="button" onClick={() => setIsImportOpen(false)}>{t("movies.cancel")}</Button>
            <Button type="button" onClick={onImport} isLoading={isImporting}>{t("movies.startImport")}</Button>
          </div>
        </div>
      </Modal>

      {/* User configuration form modals */}
      <Modal
        isOpen={isFormOpen}
        onClose={() => setIsFormOpen(false)}
        title={
            selectedItem
            ? `${t("movies.edit")} ${activeTab === "movies" ? t("movies.movies") : activeTab === "genres" ? t("movies.genres") : activeTab === "phs" ? t("movies.productionHouses") : t("movies.distributors")}`
            : `${t("movies.addForm")} ${activeTab === "movies" ? t("movies.movies") : activeTab === "genres" ? t("movies.genres") : activeTab === "phs" ? t("movies.productionHouses") : t("movies.distributors")}`
        }
        size={activeTab === "movies" ? "lg" : "md"}
      >
        {activeTab === "movies" && (
          <form onSubmit={movieForm.handleSubmit(onSave)} className="space-y-4">
            <div>
              <Input label={t("movies.movieTitle")} error={movieForm.formState.errors.title?.message} {...movieForm.register("title")} />
            </div>

            <div>
              <Input label={t("movies.durationMinutes")} type="number" error={movieForm.formState.errors.durationMinutes?.message} {...movieForm.register("durationMinutes")} />
            </div>

            <div>
              <Select label={t("movies.censorship")} options={censorshipOptions} error={movieForm.formState.errors.censorshipRating?.message} {...movieForm.register("censorshipRating")} />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Select label={t("movies.productionHouse")} options={phOptions} error={movieForm.formState.errors.productionHouseId?.message} {...movieForm.register("productionHouseId")} />
              <Select label={t("movies.distributor")} options={distOptions} error={movieForm.formState.errors.distributorId?.message} {...movieForm.register("distributorId")} />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input label={t("movies.poster")} error={movieForm.formState.errors.poster?.message} {...movieForm.register("poster")} />
              <Input label={t("movies.trailer")} error={movieForm.formState.errors.trailerUrl?.message} {...movieForm.register("trailerUrl")} />
            </div>

            <div className="space-y-1">
              <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">{t("movies.selectGenres")}</label>
              <div className="flex flex-wrap gap-2 p-3 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-2xl">
                {genresResponse?.data?.map((g) => {
                  const selectedGenres = movieForm.watch("genreIds") || [];
                  const isChecked = selectedGenres.includes(g.id);
                  return (
                    <label key={g.id} className="flex items-center gap-1.5 px-3 py-1 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-full text-xs font-semibold cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => {
                          if (isChecked) {
                            movieForm.setValue("genreIds", selectedGenres.filter((id) => id !== g.id));
                          } else {
                            movieForm.setValue("genreIds", [...selectedGenres, g.id]);
                          }
                        }}
                        className="rounded text-indigo-600 focus:ring-indigo-500/20"
                      />
                      {g.name}
                    </label>
                  );
                })}
              </div>
              {movieForm.formState.errors.genreIds && (
                <span className="text-xs text-rose-500">{movieForm.formState.errors.genreIds.message}</span>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Select label={t("movies.status")} options={statusOptions} error={movieForm.formState.errors.status?.message} {...movieForm.register("status")} />
              <div className="flex flex-col gap-1 w-full">
                <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">{t("movies.synopsis")}</label>
                <textarea rows={3} className="w-full px-3 py-2 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl text-sm placeholder-zinc-400 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 dark:focus:border-indigo-400 transition-all" {...movieForm.register("synopsis")} />
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t border-zinc-100 dark:border-zinc-800">
              <Button variant="secondary" type="button" onClick={() => setIsFormOpen(false)}>{t("movies.cancel")}</Button>
              <Button type="submit" isLoading={isMovieSaving}>{t("movies.save")}</Button>
            </div>
          </form>
        )}

        {activeTab === "genres" && (
          <form onSubmit={genreForm.handleSubmit(onSave)} className="space-y-4">
            <Input label={t("movies.name")} error={genreForm.formState.errors.name?.message} {...genreForm.register("name")} />
            <div className="flex flex-col gap-1 w-full">
              <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">{t("movies.description")}</label>
              <textarea rows={2} className="w-full px-3 py-2 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl text-sm placeholder-zinc-400 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 dark:focus:border-indigo-400 transition-all" {...genreForm.register("description")} />
            </div>
            <div className="flex items-center gap-2">
              <input type="checkbox" id="genreIsActive" className="rounded text-indigo-600 focus:ring-indigo-500/20" {...genreForm.register("isActive")} />
              <label htmlFor="genreIsActive" className="text-sm text-zinc-700 dark:text-zinc-300 font-semibold cursor-pointer">{t("movies.active")}</label>
            </div>
            <div className="flex justify-end gap-3 pt-4 border-t border-zinc-100 dark:border-zinc-800">
              <Button variant="secondary" type="button" onClick={() => setIsFormOpen(false)}>{t("movies.cancel")}</Button>
              <Button type="submit" isLoading={isGenreSaving}>{t("movies.save")}</Button>
            </div>
          </form>
        )}

        {activeTab === "phs" && (
          <form onSubmit={phForm.handleSubmit(onSave)} className="space-y-4">
            <Input label={t("movies.productionHouse")} error={phForm.formState.errors.name?.message} {...phForm.register("name")} />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input label={t("movies.contact")} error={phForm.formState.errors.contactPerson?.message} {...phForm.register("contactPerson")} />
              <Input label={t("movies.phone")} error={phForm.formState.errors.phone?.message} {...phForm.register("phone")} />
            </div>
            <Input label={t("movies.email")} error={phForm.formState.errors.email?.message} {...phForm.register("email")} />
            <Input label={t("movies.description")} error={phForm.formState.errors.address?.message} {...phForm.register("address")} />
            <div className="flex justify-end gap-3 pt-4 border-t border-zinc-100 dark:border-zinc-800">
              <Button variant="secondary" type="button" onClick={() => setIsFormOpen(false)}>{t("movies.cancel")}</Button>
              <Button type="submit" isLoading={isPHSaving}>{t("movies.save")}</Button>
            </div>
          </form>
        )}

        {activeTab === "dists" && (
          <form onSubmit={distForm.handleSubmit(onSave)} className="space-y-4">
            <Input label={t("movies.distributor")} error={distForm.formState.errors.name?.message} {...distForm.register("name")} />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input label={t("movies.contact")} error={distForm.formState.errors.contactPerson?.message} {...distForm.register("contactPerson")} />
              <Input label={t("movies.phone")} error={distForm.formState.errors.phone?.message} {...distForm.register("phone")} />
            </div>
            <Input label={t("movies.email")} error={distForm.formState.errors.email?.message} {...distForm.register("email")} />
            <Input label={t("movies.description")} error={distForm.formState.errors.address?.message} {...distForm.register("address")} />
            <div className="flex justify-end gap-3 pt-4 border-t border-zinc-100 dark:border-zinc-800">
              <Button variant="secondary" type="button" onClick={() => setIsFormOpen(false)}>{t("movies.cancel")}</Button>
              <Button type="submit" isLoading={isDistSaving}>{t("movies.save")}</Button>
            </div>
          </form>
        )}
      </Modal>

      {/* Delete Confirmation Dialog */}
      <DeleteDialog
        isOpen={isDeleteOpen}
        onClose={() => setIsDeleteOpen(false)}
        onConfirm={onDelete}
        title={`${t("movies.delete")} ${activeTab === "movies" ? t("movies.movies") : activeTab === "genres" ? t("movies.genres") : activeTab === "phs" ? t("movies.productionHouses") : t("movies.distributors")}`}
        message={`${t("movies.delete")} "${selectedItem?.name || selectedItem?.title}"?`}
        isLoading={isMovieDeleting}
      />
    </div>
  );
}
