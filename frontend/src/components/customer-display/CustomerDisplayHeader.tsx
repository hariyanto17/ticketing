"use client";

import React from "react";
import { ThemeToggle } from "@/components/ui/ThemeToggle";
import { LanguageToggle } from "@/components/ui/LanguageToggle";

interface CustomerDisplayHeaderProps {
  isConnected: boolean;
  activeMovieTitle?: string;
  activeStudioName?: string;
}

export function CustomerDisplayHeader({
  isConnected,
  activeMovieTitle,
  activeStudioName,
}: CustomerDisplayHeaderProps) {
  return (
    <header className="px-6 py-4 bg-white/80 dark:bg-zinc-900/80 backdrop-blur-md border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between shadow-2xs">
      <div className="flex items-center gap-3.5">
        <img
          src="/PLANET-CINEMA-LOGO-2-COLOR.png"
          alt="Planet Cinema"
          className="h-9 w-auto object-contain"
        />
        <div>
          <h1 className="text-base font-extrabold tracking-tight text-zinc-900 dark:text-zinc-50 leading-tight">
            PLANET CINEMA
          </h1>
          <p className="text-xs text-zinc-400 font-medium">Customer Information Display</p>
        </div>
      </div>

      <div className="flex items-center gap-4">
        {/* Realtime Dual-Screen Sync indicator */}
        <div
          className={`flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-bold border transition-colors ${
            isConnected
              ? "bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300"
              : "bg-amber-50 dark:bg-amber-950/40 border-amber-200 dark:border-amber-800 text-amber-700 dark:text-amber-300 animate-pulse"
          }`}
        >
          <span
            className={`w-2 h-2 rounded-full ${
              isConnected ? "bg-emerald-500 animate-ping" : "bg-amber-500"
            }`}
          />
          <span>{isConnected ? "Kasir Terhubung" : "Menunggu Kasir..."}</span>
        </div>

        <LanguageToggle />
        <ThemeToggle />
      </div>
    </header>
  );
}
