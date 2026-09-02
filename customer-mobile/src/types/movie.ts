export interface Genre {
  id: string;
  name: string;
  description?: string | null;
}

export interface MovieGenre {
  genre: Genre;
}

export interface ProductionHouse {
  id: string;
  name: string;
}

export interface Movie {
  id: string;
  title: string;
  originalTitle?: string | null;
  synopsis?: string | null;
  durationMinutes?: number | null; // Optional: graceful null handling
  releaseDate?: string | null;
  endDate?: string | null;
  censorshipRating: string; // SU, 13+, 17+, 21+
  language?: string | null;
  subtitle?: string | null;
  poster?: string | null;
  trailerUrl?: string | null;
  status: "DRAFT" | "COMING_SOON" | "NOW_SHOWING" | "ENDED" | "ARCHIVED";
  slug: string;
  genres?: MovieGenre[];
  productionHouse?: ProductionHouse;
}
