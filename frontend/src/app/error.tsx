"use client";

import React from "react";
import { AlertCircle } from "lucide-react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 flex flex-col items-center justify-center p-6 text-center font-sans">
      <div className="space-y-6 max-w-md">
        <div className="w-16 h-16 bg-rose-50 dark:bg-rose-955/20 text-rose-600 rounded-2xl flex items-center justify-center mx-auto shadow-sm">
          <AlertCircle className="w-8 h-8" />
        </div>

        <div className="space-y-2">
          <h1 className="text-3xl font-black text-zinc-900 dark:text-zinc-50 tracking-tight">Something went wrong</h1>
          <p className="text-sm text-zinc-500 leading-relaxed">
            An unexpected error occurred during processing. Please try reloading or return to the main dashboard.
          </p>
        </div>

        <div className="flex gap-3 justify-center">
          <button
            onClick={() => reset()}
            className="px-5 py-2.5 bg-zinc-900 dark:bg-zinc-50 hover:bg-zinc-800 dark:hover:bg-zinc-150 text-white dark:text-zinc-900 rounded-xl text-xs font-bold transition-all cursor-pointer"
          >
            Try Again
          </button>
          <button
            onClick={() => window.location.href = "/"}
            className="px-5 py-2.5 border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-900 text-zinc-700 dark:text-zinc-300 rounded-xl text-xs font-bold transition-all cursor-pointer"
          >
            Go Back Home
          </button>
        </div>
      </div>
    </div>
  );
}
