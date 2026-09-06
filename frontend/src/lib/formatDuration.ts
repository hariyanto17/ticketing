/**
 * Format duration in minutes to a localized human-readable string.
 * Example:
 *   115 -> "1 jam 55 menit" (id) / "1 hr 55 min" (en)
 *   120 -> "2 jam" (id) / "2 hrs" (en)
 *   45  -> "45 menit" (id) / "45 min" (en)
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
  const hourLabel = isId ? "jam" : hours > 1 ? "hrs" : "hr";
  const minuteLabel = isId ? "menit" : "min";

  if (!hours) {
    return `${remainingMinutes} ${minuteLabel}`;
  }
  if (!remainingMinutes) {
    return `${hours} ${hourLabel}`;
  }
  return `${hours} ${hourLabel} ${remainingMinutes} ${minuteLabel}`;
}
