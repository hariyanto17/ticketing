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
} from "@/services/movieApi";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useToast } from "@/components/ui/toast";
import { DataTable } from "@/components/ui/data-table";
import { DeleteDialog } from "@/components/ui/dialogs";
import { Input, Select, Button } from "@/components/ui/form-controls";
import { Plus, Film, Tag, Building2, Truck, Download } from "lucide-react";
import { useTranslation } from "@/lib/i18n";

// Modular Subcomponents & Utilities
import { movieFormSchema, genreFormSchema, orgFormSchema } from "@/components/admin/movies/movieSchemas";
import { getMovieColumns, getGenreColumns, getOrgColumns } from "@/components/admin/movies/adminMovieColumns";
import { MovieImportModal } from "@/components/admin/movies/MovieImportModal";
import { MovieFormModal } from "@/components/admin/movies/MovieFormModal";
import { GenreFormModal } from "@/components/admin/movies/GenreFormModal";
import { OrganizationFormModal } from "@/components/admin/movies/OrganizationFormModal";

export default function MoviesDashboard() {
  const { t, locale, formatNumber } = useTranslation();
  const movieSchema = movieFormSchema(t);
  const genreSchema = genreFormSchema(t);
  const orgSchema = orgFormSchema(t);
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

  // --- MODAL STATES ---
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isImportOpen, setIsImportOpen] = useState(false);
  const [importType, setImportType] = useState<"NOW_PLAYING" | "UPCOMING" | "BOTH">("BOTH");
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<any | null>(null);

  // --- FORMS ---
  const movieForm = useForm<z.infer<typeof movieSchema>>({ resolver: zodResolver(movieSchema) });
  const genreForm = useForm<z.infer<typeof genreSchema>>({ resolver: zodResolver(genreSchema) });
  const phForm = useForm<z.infer<typeof orgSchema>>({ resolver: zodResolver(orgSchema) });
  const distForm = useForm<z.infer<typeof orgSchema>>({ resolver: zodResolver(orgSchema) });

  const handleOpenAdd = () => {
    setSelectedItem(null);
    if (activeTab === "movies") {
      movieForm.reset({
        title: "",
        synopsis: "",
        durationMinutes: 120,
        censorshipRating: "SU",
        poster: "",
        trailerUrl: "",
        director: "",
        writer: "",
        producer: "",
        cast: "",
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
        durationMinutes: item.durationMinutes || "",
        censorshipRating: item.censorshipRating,
        poster: item.poster || "",
        trailerUrl: item.trailerUrl || "",
        director: item.director || "",
        writer: item.writer || "",
        producer: item.producer || "",
        cast: item.cast || "",
        status: item.status,
        productionHouseId: item.productionHouseId,
        distributorId: item.distributorId || "",
        genreIds: item.genres ? item.genres.map((g: any) => g.genreId) : [],
      });
    } else if (activeTab === "genres") {
      genreForm.reset({
        name: item.name,
        description: item.description || "",
        isActive: item.isActive,
      });
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

  const onSave = async (data: any) => {
    try {
      if (activeTab === "movies") {
        const payload = {
          ...data,
          synopsis: data.synopsis === "" ? null : data.synopsis,
          durationMinutes:
            data.durationMinutes === "" || data.durationMinutes === undefined || data.durationMinutes === null
              ? null
              : Number(data.durationMinutes),
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
      toastSuccess(
        `${t("movies.importSuccess")}: ${formatNumber(summary.created)} ${t("movies.created")}, ${formatNumber(
          summary.updated
        )} ${t("movies.updated")}, ${formatNumber(summary.skipped)} skipped, ${formatNumber(summary.failed)} failed`
      );
      setIsImportOpen(false);
    } catch (err: any) {
      toastError(err?.data?.message || t("movies.operationFailed"));
    }
  };

  const movieColumns = getMovieColumns({ t, locale, onEdit: handleOpenEdit, onDelete: handleOpenDelete });
  const genreColumns = getGenreColumns({ t, onEdit: handleOpenEdit, onDelete: handleOpenDelete });
  const orgColumns = getOrgColumns({ t, onEdit: handleOpenEdit, onDelete: handleOpenDelete });

  return (
    <div className="space-y-6 font-sans">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2 border-b border-zinc-200/60 dark:border-zinc-800/60">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
            {t("movies.title")}
          </h1>
          <p className="text-xs sm:text-sm text-zinc-500 dark:text-zinc-400 mt-1">
            {t("movies.subtitle")}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2.5">
          {activeTab === "movies" && (
            <Button
              variant="secondary"
              onClick={() => setIsImportOpen(true)}
              className="flex items-center gap-2 border-indigo-200 dark:border-indigo-900 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/30 text-xs font-semibold px-3.5 py-2 rounded-xl transition-all"
            >
              <Download className="w-4 h-4" />
              {t("movies.importFrom21")}
            </Button>
          )}
          <Button onClick={handleOpenAdd} className="flex items-center gap-2 text-xs font-semibold px-4 py-2 rounded-xl">
            <Plus className="w-4 h-4" />
            {t("common.add")}
          </Button>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex gap-2 border-b border-zinc-200 dark:border-zinc-800 pb-2">
        <button
          onClick={() => setActiveTab("movies")}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition-all ${
            activeTab === "movies"
              ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900"
              : "text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100"
          }`}
        >
          <Film className="w-4 h-4" /> {t("movies.moviesList")}
        </button>
        <button
          onClick={() => setActiveTab("genres")}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition-all ${
            activeTab === "genres"
              ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900"
              : "text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100"
          }`}
        >
          <Tag className="w-4 h-4" /> {t("movies.genres")}
        </button>
        <button
          onClick={() => setActiveTab("phs")}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition-all ${
            activeTab === "phs"
              ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900"
              : "text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100"
          }`}
        >
          <Building2 className="w-4 h-4" /> {t("movies.productionHouses")}
        </button>
        <button
          onClick={() => setActiveTab("dists")}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition-all ${
            activeTab === "dists"
              ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900"
              : "text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100"
          }`}
        >
          <Truck className="w-4 h-4" /> {t("movies.distributors")}
        </button>
      </div>

      {/* Main Tab Views */}
      {activeTab === "movies" && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row gap-3 bg-white dark:bg-zinc-900 p-4 rounded-2xl border border-zinc-200 dark:border-zinc-800">
            <Input
              placeholder={t("movies.searchPlaceholder")}
              value={movieSearch}
              onChange={(e) => {
                setMovieSearch(e.target.value);
                setMoviePage(1);
              }}
              className="sm:w-64"
            />
            <Select
              value={movieFilterStatus}
              onChange={(e) => {
                setMovieFilterStatus(e.target.value);
                setMoviePage(1);
              }}
              options={[
                { value: "", label: t("movies.allStatus") },
                { value: "DRAFT", label: "Draft" },
                { value: "COMING_SOON", label: "Coming Soon" },
                { value: "NOW_SHOWING", label: "Now Showing" },
                { value: "ENDED", label: "Ended" },
              ]}
              className="sm:w-48"
            />
            <Select
              value={movieFilterGenre}
              onChange={(e) => {
                setMovieFilterGenre(e.target.value);
                setMoviePage(1);
              }}
              options={[
                { value: "", label: t("movies.allGenres") },
                ...(genresResponse?.data?.map((g) => ({ value: g.id, label: g.name })) || []),
              ]}
              className="sm:w-48"
            />
          </div>

          <DataTable
            columns={movieColumns}
            data={moviesResponse?.data || []}
            isLoading={moviesLoading}
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

      {activeTab === "genres" && (
        <DataTable columns={genreColumns} data={genresResponse?.data || []} isLoading={genresLoading} />
      )}

      {activeTab === "phs" && (
        <DataTable columns={orgColumns} data={phsResponse?.data || []} isLoading={phsLoading} />
      )}

      {activeTab === "dists" && (
        <DataTable columns={orgColumns} data={distsResponse?.data || []} isLoading={distsLoading} />
      )}

      {/* Modals */}
      <MovieImportModal
        isOpen={isImportOpen}
        onClose={() => setIsImportOpen(false)}
        importType={importType}
        setImportType={setImportType}
        isImporting={isImporting}
        onImport={onImport}
      />

      <MovieFormModal
        isOpen={isFormOpen && activeTab === "movies"}
        onClose={() => setIsFormOpen(false)}
        selectedItem={selectedItem}
        form={movieForm}
        onSave={onSave}
        isSaving={isMovieSaving}
        genres={genresResponse?.data}
        phs={phsResponse?.data}
        distributors={distsResponse?.data}
      />

      <GenreFormModal
        isOpen={isFormOpen && activeTab === "genres"}
        onClose={() => setIsFormOpen(false)}
        selectedItem={selectedItem}
        form={genreForm}
        onSave={onSave}
        isSaving={isGenreSaving}
      />

      <OrganizationFormModal
        isOpen={isFormOpen && (activeTab === "phs" || activeTab === "dists")}
        onClose={() => setIsFormOpen(false)}
        selectedItem={selectedItem}
        form={activeTab === "phs" ? phForm : distForm}
        onSave={onSave}
        isSaving={activeTab === "phs" ? isPHSaving : isDistSaving}
        type={activeTab === "phs" ? "PH" : "DISTRIBUTOR"}
      />

      <DeleteDialog
        isOpen={isDeleteOpen}
        onClose={() => setIsDeleteOpen(false)}
        onConfirm={onDelete}
        title={t("common.delete")}
        message={t("common.deleteConfirm")}
        isLoading={isMovieDeleting}
      />
    </div>
  );
}
