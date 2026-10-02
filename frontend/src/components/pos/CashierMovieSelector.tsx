"use client";

import React from "react";
import { Film } from "lucide-react";
import { Spinner } from "@/components/ui/spinner";
import { SearchableSelect } from "@/components/ui/form-controls";
import { Movie } from "@/services/movieApi";
import { useTranslation } from "@/lib/i18n";

interface CashierMovieSelectorProps {
  movies: Movie[] | undefined;
  isLoading: boolean;
  selectedMovie: Movie | null;
  onSelectMovie: (movie: Movie | null) => void;
}

export function CashierMovieSelector({
  movies,
  isLoading,
  selectedMovie,
  onSelectMovie,
}: CashierMovieSelectorProps) {
  const { t } = useTranslation();

  return (
    <div className="p-6 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl space-y-4">
      <h2 className="text-lg font-bold text-zinc-900 dark:text-zinc-50 flex items-center gap-2">
        <Film className="w-5 h-5 text-indigo-600" /> {t("cashier.movie")}
      </h2>

      {isLoading ? (
        <div className="flex justify-center py-6">
          <Spinner className="w-8 h-8" />
        </div>
      ) : !movies || movies.length === 0 ? (
        <p className="text-sm text-zinc-400 italic">{t("cashier.noMovies")}</p>
      ) : (
        <div className="max-w-md">
          <SearchableSelect
            label={t("cashier.movie")}
            value={selectedMovie?.id || ""}
            onChange={(movieId) => {
              if (!movieId) {
                onSelectMovie(null);
                return;
              }
              const movie = movies.find((item) => item.id === movieId) || null;
              onSelectMovie(movie);
            }}
            options={movies.map((movie) => ({
              value: movie.id,
              label: movie.title,
              searchText: movie.censorshipRating,
            }))}
            placeholder={t("cashier.movie")}
            searchPlaceholder={t("cashier.movie")}
            clearable
          />
        </div>
      )}
    </div>
  );
}
