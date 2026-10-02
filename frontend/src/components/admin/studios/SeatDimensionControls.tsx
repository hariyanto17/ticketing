"use client";

import React from "react";
import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/form-controls";

interface SeatDimensionControlsProps {
  rows: string[];
  cols: number[];
  emptyColumns: Set<number>;
  selectedRowToRemove: string;
  setSelectedRowToRemove: (val: string) => void;
  selectedColToRemove: number;
  setSelectedColToRemove: (val: number) => void;
  insertAislePos: number;
  setInsertAislePos: (val: number) => void;
  selectedAisleToRemove: number;
  setSelectedAisleToRemove: (val: number) => void;
  onAddRow: () => void;
  onRemoveRow: () => void;
  onAddColumn: () => void;
  onRemoveColumn: () => void;
  onInsertAisle: (pos: number) => void;
  onRemoveAisle: () => void;
}

export function SeatDimensionControls({
  rows,
  cols,
  emptyColumns,
  selectedRowToRemove,
  setSelectedRowToRemove,
  selectedColToRemove,
  setSelectedColToRemove,
  insertAislePos,
  setInsertAislePos,
  selectedAisleToRemove,
  setSelectedAisleToRemove,
  onAddRow,
  onRemoveRow,
  onAddColumn,
  onRemoveColumn,
  onInsertAisle,
  onRemoveAisle,
}: SeatDimensionControlsProps) {
  return (
    <div className="p-6 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl space-y-4 shadow-sm">
      <h3 className="font-semibold text-xs text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
        Layout Management Toolbar
      </h3>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        {/* Row expansion/removal */}
        <div className="p-4 bg-zinc-50 dark:bg-zinc-950 rounded-2xl border border-zinc-150 dark:border-zinc-850 space-y-3">
          <span className="text-xs font-bold text-zinc-500 block">Row Management</span>
          <Button variant="secondary" onClick={onAddRow} className="w-full flex items-center justify-center gap-1.5 py-1.5 text-xs">
            <Plus className="w-3.5 h-3.5" /> Add Row
          </Button>
          <div className="flex gap-2 items-center">
            <select
              value={selectedRowToRemove}
              onChange={(e) => setSelectedRowToRemove(e.target.value)}
              className="w-full px-2 py-1.5 text-xs rounded-xl border bg-white dark:bg-zinc-900 dark:border-zinc-800"
            >
              {rows.map((r) => (
                <option key={r} value={r}>
                  Row {r}
                </option>
              ))}
            </select>
            <button
              onClick={onRemoveRow}
              className="p-2 bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/20 dark:hover:bg-rose-900/30 text-rose-600 rounded-xl transition"
              title={`Remove Row ${selectedRowToRemove}`}
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Column expansion/removal */}
        <div className="p-4 bg-zinc-50 dark:bg-zinc-950 rounded-2xl border border-zinc-150 dark:border-zinc-850 space-y-3">
          <span className="text-xs font-bold text-zinc-500 block">Column Management</span>
          <Button variant="secondary" onClick={onAddColumn} className="w-full flex items-center justify-center gap-1.5 py-1.5 text-xs">
            <Plus className="w-3.5 h-3.5" /> Add Column
          </Button>
          <div className="flex gap-2 items-center">
            <select
              value={selectedColToRemove}
              onChange={(e) => setSelectedColToRemove(Number(e.target.value))}
              className="w-full px-2 py-1.5 text-xs rounded-xl border bg-white dark:bg-zinc-900 dark:border-zinc-800"
            >
              {cols.map((c) => (
                <option key={c} value={c}>
                  Column {c}
                </option>
              ))}
            </select>
            <button
              onClick={onRemoveColumn}
              className="p-2 bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/20 dark:hover:bg-rose-900/30 text-rose-600 rounded-xl transition"
              title={`Remove Column ${selectedColToRemove}`}
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Aisle management */}
        <div className="p-4 bg-zinc-50 dark:bg-zinc-950 rounded-2xl border border-zinc-150 dark:border-zinc-850 space-y-3 lg:col-span-2">
          <span className="text-xs font-bold text-zinc-500 block">Aisle Management</span>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-zinc-400 block">Add Aisle After Column</label>
              <div className="flex gap-1">
                <select
                  value={insertAislePos}
                  onChange={(e) => setInsertAislePos(Number(e.target.value))}
                  className="w-full px-2 py-1.5 text-xs rounded-xl border bg-white dark:bg-zinc-900 dark:border-zinc-800"
                >
                  {cols.map((c) => (
                    <option key={c} value={c}>
                      Column {c}
                    </option>
                  ))}
                </select>
                <Button variant="secondary" onClick={() => onInsertAisle(insertAislePos)} className="px-3 text-xs">
                  Add
                </Button>
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-bold text-zinc-400 block">Remove Existing Aisle</label>
              <div className="flex gap-1">
                <select
                  value={selectedAisleToRemove}
                  onChange={(e) => setSelectedAisleToRemove(Number(e.target.value))}
                  className="w-full px-2 py-1.5 text-xs rounded-xl border bg-white dark:bg-zinc-900 dark:border-zinc-800"
                >
                  {Array.from(emptyColumns).map((c) => (
                    <option key={c} value={c}>
                      between {c - 1} and {c + 1}
                    </option>
                  ))}
                </select>
                <Button
                  variant="secondary"
                  onClick={onRemoveAisle}
                  className="px-3 text-xs bg-rose-50 text-rose-600 hover:bg-rose-100 border-none"
                >
                  Remove
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
