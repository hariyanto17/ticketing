/**
 * Format duration in minutes to a localized compact string.
 * Example:
 *   115 -> "1j55m" (id) / "1h 55m" (en)
 *   120 -> "2j" (id) / "2h" (en)
 *   45  -> "45m" (id) / "45m" (en)
 */
export function formatDuration(
  minutes: number | null | undefined,
  locale: string = "id",
  unavailableText?: string
): string {
  if (!minutes || minutes <= 0) {
    return unavailableText || (locale === "id" ? "Belum ditentukan" : "Not specified");
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
}

/**
 * Returns Tailwind badge classes based on censorship rating (SU: green, 13+: yellow, 21+: red).
 */
export function getCensorshipBadgeClass(rating?: string | null): string {
  if (!rating) return "bg-emerald-500/20 text-emerald-400 border-emerald-500/30";
  const r = rating.trim().toUpperCase();
  if (r.includes("21") || r.includes("D21") || r.includes("17") || r.includes("D17") || r.includes("18") || r === "R" || r === "D") {
    return "bg-rose-500/20 text-rose-400 border-rose-500/30";
  }
  if (r.includes("13") || r.includes("R13") || r.includes("PG")) {
    return "bg-amber-500/20 text-amber-400 border-amber-500/30";
  }
  return "bg-emerald-500/20 text-emerald-400 border-emerald-500/30";
}

