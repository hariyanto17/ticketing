/**
 * Kiosk Barcode / QR Parsing Utilities
 */

/**
 * Extracts and sanitizes Kiosk ID from a scanned barcode / QR payload.
 * Supports URLs (e.g., https://domain.com/kiosk-print/mobile-scan?kiosk=KIOSK-01)
 * as well as plain station identifiers (e.g., KIOSK-01, KIOSK-02).
 */
export const parseKioskIdFromScannedCode = (raw: string): string | null => {
  if (!raw) return null;
  const trimmed = raw.trim();

  // 1. URL format containing ?kiosk=...
  if (trimmed.includes("kiosk=")) {
    try {
      const match = trimmed.match(/[?&]kiosk=([^&]+)/i);
      if (match && match[1]) {
        return decodeURIComponent(match[1]).toUpperCase();
      }
    } catch (_) {}
  }

  // 2. Direct KIOSK identifier pattern (e.g. KIOSK-01, KIOSK-A)
  if (/^KIOSK[-_A-Z0-9]+$/i.test(trimmed)) {
    return trimmed.toUpperCase();
  }

  // 3. Starts with KIOSK
  if (trimmed.toUpperCase().startsWith("KIOSK")) {
    return trimmed.toUpperCase();
  }

  // 4. Fallback: Short alphanumeric station identifier
  if (trimmed.length <= 16 && /^[A-Z0-9_-]+$/i.test(trimmed)) {
    return trimmed.toUpperCase();
  }

  return null;
};
