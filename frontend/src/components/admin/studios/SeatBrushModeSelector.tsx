"use client";

import React from "react";

export type EditMode = "REGULAR" | "VIP" | "COUPLE" | "WHEELCHAIR" | "TOGGLE_STATUS" | "DELETE";

interface SeatBrushModeSelectorProps {
  editMode: EditMode;
  setEditMode: (mode: EditMode) => void;
}

export function SeatBrushModeSelector({ editMode, setEditMode }: SeatBrushModeSelectorProps) {
  const buttons: { mode: EditMode; label: string; color: string }[] = [
    { mode: "REGULAR", label: "Add/Set Regular (Blue)", color: "bg-indigo-600 text-white" },
    { mode: "VIP", label: "Add/Set VIP (Yellow)", color: "bg-amber-500 text-white" },
    { mode: "COUPLE", label: "Add/Set Couple (Rose)", color: "bg-rose-500 text-white" },
    { mode: "WHEELCHAIR", label: "Add/Set Wheelchair (Light Blue)", color: "bg-blue-500 text-white" },
    {
      mode: "TOGGLE_STATUS",
      label: "Enable/Disable Seat",
      color: "bg-zinc-200 dark:bg-zinc-800 text-zinc-800 dark:text-zinc-250 border border-zinc-300 dark:border-zinc-700",
    },
    {
      mode: "DELETE",
      label: "Remove Seat (Eraser)",
      color: "bg-rose-50 text-rose-600 border border-rose-200 hover:bg-rose-100",
    },
  ];

  return (
    <div className="p-6 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl space-y-4 shadow-sm">
      <h3 className="font-semibold text-xs text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
        Brush Actions / Editor Modes
      </h3>
      <div className="flex flex-wrap gap-2">
        {buttons.map((btn) => (
          <button
            key={btn.mode}
            onClick={() => setEditMode(btn.mode)}
            className={`px-4 py-2 text-xs font-semibold rounded-xl transition-all cursor-pointer ${
              editMode === btn.mode ? "ring-4 ring-indigo-500/35 scale-102" : "opacity-85 hover:opacity-100"
            } ${btn.color}`}
          >
            {btn.label}
          </button>
        ))}
      </div>
    </div>
  );
}
