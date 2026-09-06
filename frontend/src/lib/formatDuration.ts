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
