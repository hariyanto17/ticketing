"use client";

import { ShowtimeSeat } from "@/services/studioApi";

export const CUSTOMER_DISPLAY_CHANNEL_NAME = "planet_cinema_customer_display";

export interface CustomerDisplayStatePayload {
  movie: {
    id: string;
    title: string;
    poster?: string | null;
    censorshipRating?: string | null;
    durationMinutes?: number | null;
  } | null;
  schedule: {
    id: string;
    studioName: string;
    studioCode?: string;
    startTime: string;
    businessDate: string;
    ticketPrice: number;
  } | null;
  seats: ShowtimeSeat[];
  selectedSeats: ShowtimeSeat[];
  quantity: number;
  ticketPrice: number;
  totalAmount: number;
  theme: "light" | "dark" | "system";
  locale: "id" | "en";
  lastUpdated: number;
}

export type CustomerDisplayMessage =
  | { type: "CUSTOMER_DISPLAY_STATE"; payload: CustomerDisplayStatePayload }
  | { type: "CUSTOMER_DISPLAY_REQUEST_STATE" }
  | { type: "CUSTOMER_DISPLAY_PING" }
  | { type: "CUSTOMER_DISPLAY_PONG" }
  | { type: "CUSTOMER_DISPLAY_CLOSED" };

export interface OpenCustomerDisplayResult {
  success: boolean;
  status: "opened_secondary" | "opened_single_monitor" | "opened_fallback" | "already_open" | "blocked" | "error";
  message?: string;
  windowRef?: Window | null;
}

/**
 * Open customer display window.
 * - Opens synchronously on user click to prevent popup blockers.
 * - If multi-screen placement is available, repositions window to secondary monitor.
 * - If single monitor (dev/test environment), keeps window on primary monitor as normal movable window.
 */
export async function openCustomerDisplayWindow(
  existingWindow: Window | null
): Promise<OpenCustomerDisplayResult> {
  if (typeof window === "undefined") {
    return { success: false, status: "error", message: "Window is not defined" };
  }

  // 1. If already open and not closed, focus and return
  if (existingWindow && !existingWindow.closed) {
    try {
      existingWindow.focus();
      return { success: true, status: "already_open", windowRef: existingWindow };
    } catch {
      // Proceed to open
    }
  }

  const targetUrl = "/customer-display";
  const windowName = "PlanetCinemaCustomerDisplay";
  const defaultFeatures = "width=1100,height=750,menubar=no,toolbar=no,location=no,status=no,resizable=yes,scrollbars=yes";

  // 2. Open immediately and synchronously within the user gesture to avoid popup blocking
  let newWin: Window | null = null;
  try {
    newWin = window.open(targetUrl, windowName, defaultFeatures);
  } catch (err) {
    return { success: false, status: "blocked" };
  }

  if (!newWin || newWin.closed || typeof newWin.closed === "undefined") {
    return { success: false, status: "blocked" };
  }

  // 3. Detect multi-screen and reposition to secondary monitor if available
  if ("getScreenDetails" in window) {
    try {
      const screenDetails = await (window as any).getScreenDetails();
      if (screenDetails && screenDetails.screens && screenDetails.screens.length > 1) {
        const screens = screenDetails.screens;
        const currentScreen = screenDetails.currentScreen;
        const secondaryScreen =
          screens.find((s: any) => s !== currentScreen) || screens[1] || screens[0];

        const left = secondaryScreen.availLeft ?? secondaryScreen.left ?? 0;
        const top = secondaryScreen.availTop ?? secondaryScreen.top ?? 0;
        const width = secondaryScreen.availWidth ?? secondaryScreen.width ?? 1280;
        const height = secondaryScreen.availHeight ?? secondaryScreen.height ?? 800;

        if (newWin && !newWin.closed) {
          try {
            newWin.moveTo(left, top);
            newWin.resizeTo(width, height);
          } catch (e) {
            console.warn("Could not reposition window across monitors:", e);
          }
        }

        return { success: true, status: "opened_secondary", windowRef: newWin };
      }
    } catch (err) {
      console.warn("Multi-screen detection note:", err);
    }
  }

  // Single-monitor or standard fallback (works seamlessly for local dev & testing)
  return { success: true, status: "opened_single_monitor", windowRef: newWin };
}
