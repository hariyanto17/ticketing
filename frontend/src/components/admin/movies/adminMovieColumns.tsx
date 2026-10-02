import React from "react";
import Link from "next/link";
import { Edit, Trash, Film } from "lucide-react";
import { Movie, Genre } from "@/services/movieApi";
import { formatDuration } from "@/lib/formatDuration";

interface MovieColumnProps {
  t: (key: string) => string;
  locale: string;
  onEdit: (item: any) => void;
  onDelete: (item: any) => void;
}

export function getMovieColumns({ t, locale, onEdit, onDelete }: MovieColumnProps) {
  return [
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
            <Link
              href={`/movies/${m.id}`}
              className="font-semibold text-zinc-900 dark:text-zinc-50 hover:text-indigo-600 dark:hover:text-indigo-400"
            >
              {m.title}
            </Link>
            <div className="text-xs text-zinc-400">{m.originalTitle || m.title}</div>
          </div>
        </div>
      ),
    },
    {
      key: "durationMinutes",
      header: t("movies.duration"),
      render: (m: Movie) => formatDuration(m.durationMinutes, locale, t("movies.unspecified")),
    },
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
          <button onClick={() => onEdit(m)} className="p-1 text-zinc-400 hover:text-indigo-600 cursor-pointer">
            <Edit className="w-4 h-4" />
          </button>
          <button onClick={() => onDelete(m)} className="p-1 text-zinc-400 hover:text-rose-600 cursor-pointer">
            <Trash className="w-4 h-4" />
          </button>
        </div>
      ),
    },
  ];
}

export function getGenreColumns({ t, onEdit, onDelete }: { t: (key: string) => string; onEdit: (item: any) => void; onDelete: (item: any) => void }) {
  return [
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
          <button onClick={() => onEdit(g)} className="p-1 text-zinc-400 hover:text-indigo-600 cursor-pointer">
            <Edit className="w-4 h-4" />
          </button>
          <button onClick={() => onDelete(g)} className="p-1 text-zinc-400 hover:text-rose-600 cursor-pointer">
            <Trash className="w-4 h-4" />
          </button>
        </div>
      ),
    },
  ];
}

export function getOrgColumns({ t, onEdit, onDelete }: { t: (key: string) => string; onEdit: (item: any) => void; onDelete: (item: any) => void }) {
  return [
    { key: "name", header: t("movies.name") },
    { key: "contactPerson", header: t("movies.contact") },
    { key: "phone", header: t("movies.phone") },
    { key: "email", header: t("movies.email") },
    {
      key: "actions",
      header: t("movies.actions"),
      render: (item: any) => (
        <div className="flex gap-2">
          <button onClick={() => onEdit(item)} className="p-1 text-zinc-400 hover:text-indigo-600 cursor-pointer">
            <Edit className="w-4 h-4" />
          </button>
          <button onClick={() => onDelete(item)} className="p-1 text-zinc-400 hover:text-rose-600 cursor-pointer">
            <Trash className="w-4 h-4" />
          </button>
        </div>
      ),
    },
  ];
}
