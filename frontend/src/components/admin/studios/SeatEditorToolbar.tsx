"use client";

import React from "react";
import Link from "next/link";
import { ArrowLeft, RefreshCw, Save } from "lucide-react";
import { Button } from "@/components/ui/form-controls";

interface SeatEditorToolbarProps {
  studioName?: string;
  studioType?: string;
  forceSave: boolean;
  setForceSave: (val: boolean) => void;
  isSaving: boolean;
  onResetToDefault: () => void;
  onSave: () => void;
}

export function SeatEditorToolbar({
  studioName,
  studioType,
  forceSave,
  setForceSave,
  isSaving,
  onResetToDefault,
  onSave,
}: SeatEditorToolbarProps) {
  return (
    <div className="flex flex-col xl:flex-row xl:items-center xl:justify-between gap-6">
      <div className="flex items-center gap-4">
        <Link
          href="/admin/studios"
          className="p-2 border border-zinc-200 dark:border-zinc-800 rounded-xl hover:bg-zinc-50 dark:hover:bg-zinc-800/50"
        >
          <ArrowLeft className="w-4 h-4" />
        </Link>
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
            Seat Layout Editor
          </h1>
          <p className="text-zinc-500 dark:text-zinc-400 mt-1">
            Configure theater grid for{" "}
            <strong className="text-zinc-850 dark:text-zinc-200">{studioName}</strong> ({studioType}).
          </p>
        </div>
      </div>

      <div className="flex flex-wrap gap-3 items-center">
        <Button variant="secondary" onClick={onResetToDefault} className="flex items-center gap-2">
          <RefreshCw className="w-4 h-4" /> Reset Grid
        </Button>

        <label className="flex items-center gap-2 text-xs py-2 px-3 bg-zinc-50 dark:bg-zinc-900 border rounded-xl cursor-pointer select-none">
          <input type="checkbox" checked={forceSave} onChange={(e) => setForceSave(e.target.checked)} />
          <span className="text-zinc-650 dark:text-zinc-350">Force save (disable dependents)</span>
        </label>

        <Button onClick={onSave} isLoading={isSaving} className="flex items-center gap-2">
          <Save className="w-4 h-4" /> Save Layout
        </Button>
      </div>
    </div>
  );
}
