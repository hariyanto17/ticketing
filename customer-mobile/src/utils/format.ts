/**
 * Format duration in minutes to a localized compact string for mobile app.
 * Example:
 *   115 -> "1j55m" (id) / "1h 55m" (en)
 *   120 -> "2j" (id) / "2h" (en)
 *   45  -> "45m" (id) / "45m" (en)
 */
export const formatDuration = (
  minutes: number | null | undefined,
  locale: "id" | "en" | string = "id",
  unavailableText?: string
): string => {
  if (!minutes || minutes <= 0) {
    return unavailableText || (locale === "id" ? "Durasi belum tersedia" : "Duration unavailable");
  }

  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  const isId = locale === "id";

  if (!hours) {
    return `${remainingMinutes}m`;
  }
  if (!remainingMinutes) {
    return isId ? `${hours}j` : `${hours}h`;
  }
  return isId ? `${hours}j${remainingMinutes}m` : `${hours}h ${remainingMinutes}m`;
};

/**
 * Return badge variant for censorship rating (batasan umur):
 * - SU -> "success" (Hijau)
 * - 13+ / R13 / PG-13 -> "warning" (Kuning)
 * - 21+ / D21 / 17+ / D17 -> "danger" (Merah)
 */
export const getCensorshipVariant = (
  rating?: string | null
): "success" | "warning" | "danger" => {
  if (!rating) return "success";
  const normalized = rating.trim().toUpperCase();

  if (
    normalized.includes("21") ||
    normalized.includes("D21") ||
    normalized.includes("17") ||
    normalized.includes("D17") ||
    normalized.includes("18") ||
    normalized === "R" ||
    normalized === "D"
  ) {
    return "danger";
  }

  if (
    normalized.includes("13") ||
    normalized.includes("R13") ||
    normalized.includes("PG")
  ) {
    return "warning";
  }

  return "success";
};

/**
 * Extract YouTube video ID from various URL formats.
 * Examples:
 *   https://www.youtube.com/watch?v=dQw4w9WgXcQ -> dQw4w9WgXcQ
 *   https://youtu.be/dQw4w9WgXcQ -> dQw4w9WgXcQ
 *   https://www.youtube.com/embed/dQw4w9WgXcQ -> dQw4w9WgXcQ
 */
export const getYouTubeVideoId = (url?: string | null): string | null => {
  if (!url) return null;
  const trimmed = url.trim();
  const match = trimmed.match(
    /(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=))([\w-]{11})/
  );
  if (match) return match[1];
  if (/^[\w-]{11}$/.test(trimmed)) return trimmed;
  return null;
};
