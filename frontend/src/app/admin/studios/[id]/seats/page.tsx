"use client";

import React, { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { 
  useGetStudioByIdQuery, 
  useGetSeatsQuery, 
  useSaveLayoutMutation, 
  useUpdateStudioMutation, 
  useLazyValidateRemovalQuery, 
  Seat 
} from "@/services/studioApi";
import { useToast } from "@/components/ui/toast";
import { Button } from "@/components/ui/form-controls";
import { getRowIndex, getVisualRowOrder } from "@/lib/seatLayout";
import { ArrowLeft, Save, Info, RefreshCw, Plus, Trash2 } from "lucide-react";
import Link from "next/link";
import { Spinner } from "@/components/ui/spinner";

type EditMode = "REGULAR" | "VIP" | "COUPLE" | "WHEELCHAIR" | "TOGGLE_STATUS" | "DELETE";

const getRowLabel = (index: number): string => {
  let label = "";
  let temp = index;
  while (temp >= 0) {
    label = String.fromCharCode((temp % 26) + 65) + label;
    temp = Math.floor(temp / 26) - 1;
  }
  return label;
};

export default function SeatLayoutEditor() {
  const params = useParams();
  const router = useRouter();
  const studioId = params.id as string;
  const { success: toastSuccess, error: toastError } = useToast();

  const { data: studioResponse, isLoading: studioLoading } = useGetStudioByIdQuery(studioId);
  const { data: seatsResponse, isLoading: seatsLoading } = useGetSeatsQuery(studioId);
  const [saveLayout, { isLoading: isSaving }] = useSaveLayoutMutation();
  const [updateStudio] = useUpdateStudioMutation();
  const [validateRemoval] = useLazyValidateRemovalQuery();

  const [localSeats, setLocalSeats] = useState<Seat[]>([]);
  const [editMode, setEditMode] = useState<EditMode>("REGULAR");
  const [forceSave, setForceSave] = useState(false);
  const [insertAislePos, setInsertAislePos] = useState<number>(1);
  const [localRowsCount, setLocalRowsCount] = useState<number | null>(null);
  const [localColsCount, setLocalColsCount] = useState<number | null>(null);

  // Removal selection states
  const [selectedRowToRemove, setSelectedRowToRemove] = useState<string>("");
  const [selectedColToRemove, setSelectedColToRemove] = useState<number>(1);
  const [selectedAisleToRemove, setSelectedAisleToRemove] = useState<number>(1);

  // Grid dimensions (derive dynamically)
  const defaultRowsCount = 11; // A-K
  const defaultColsCount = 12;

  const studioRowsCount = studioResponse?.data?.layoutRows ?? null;
  const studioColsCount = studioResponse?.data?.layoutColumns ?? null;

  const uniqueRows = Array.from(new Set(localSeats.map((s) => s.row))).sort((a, b) => getRowIndex(a) - getRowIndex(b));

  const maxRowIndex = uniqueRows.length > 0 ? getRowIndex(uniqueRows[uniqueRows.length - 1]) : -1;

  const rowsCount =
    localRowsCount ?? (studioRowsCount ?? (maxRowIndex >= 0 ? maxRowIndex + 1 : defaultRowsCount));

  const rows = Array.from({ length: rowsCount }, (_, i) => getRowLabel(i));
  const visualRows = getVisualRowOrder(rows);

  const maxColumn =
    localColsCount ?? (studioColsCount ?? Math.max(...localSeats.map((s) => s.column), defaultColsCount));
  const cols = Array.from({ length: maxColumn }, (_, i) => i + 1);
  const emptyColumns = new Set(cols.filter((c) => !localSeats.some((s) => s.column === c)));

  // Recalculate seat numbers and labels within each row sequentially
  const recalculateSeatLabels = (seats: Seat[]): Seat[] => {
    const seatsByRow: Record<string, Seat[]> = {};
    seats.forEach((s) => {
      if (!seatsByRow[s.row]) {
        seatsByRow[s.row] = [];
      }
      seatsByRow[s.row].push(s);
    });

    const updatedSeats: Seat[] = [];
    Object.keys(seatsByRow).forEach((row) => {
      const sortedSeats = [...seatsByRow[row]].sort((a, b) => a.column - b.column);
      sortedSeats.forEach((seat, idx) => {
        const seatNum = idx + 1;
        updatedSeats.push({
          ...seat,
          seatNumber: seatNum,
          seatLabel: `${row}${seatNum}`,
        });
      });
    });

    return updatedSeats;
  };

  // Sync loaded seats to local state
  useEffect(() => {
    if (seatsResponse?.data) {
      setLocalSeats(recalculateSeatLabels(seatsResponse.data));
    }
  }, [seatsResponse]);

  // Initialize editable rows/cols counts from studio or computed values
  useEffect(() => {
    if (localRowsCount === null) {
      const initialRows = studioRowsCount ?? (maxRowIndex >= 0 ? maxRowIndex + 1 : defaultRowsCount);
      setLocalRowsCount(initialRows);
    }
    if (localColsCount === null) {
      const initialCols = studioColsCount ?? Math.max(...localSeats.map((s) => s.column), defaultColsCount);
      setLocalColsCount(initialCols);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [studioResponse, seatsResponse]);

  // Update selection dropdown defaults when dimensions change
  useEffect(() => {
    if (rows.length > 0 && !rows.includes(selectedRowToRemove)) {
      setSelectedRowToRemove(rows[rows.length - 1]);
    }
  }, [rows, selectedRowToRemove]);

  useEffect(() => {
    if (cols.length > 0 && !cols.includes(selectedColToRemove)) {
      setSelectedColToRemove(cols[cols.length - 1]);
    }
  }, [cols, selectedColToRemove]);

  useEffect(() => {
    const list = Array.from(emptyColumns);
    if (list.length > 0) {
      if (!list.includes(selectedAisleToRemove)) {
        setSelectedAisleToRemove(list[0]);
      }
    }
  }, [emptyColumns, selectedAisleToRemove]);

  const getSeatAt = (row: string, col: number) => {
    return localSeats.find((s) => s.row === row && s.column === col);
  };

  const handleCellClick = (row: string, col: number) => {
    const existing = getSeatAt(row, col);
    let updated: Seat[] = [];

    if (editMode === "DELETE") {
      if (existing) {
        updated = localSeats.filter((s) => !(s.row === row && s.column === col));
      } else {
        return;
      }
    } else if (editMode === "TOGGLE_STATUS") {
      if (existing) {
        updated = localSeats.map((s) =>
          s.row === row && s.column === col
            ? { ...s, status: s.status === "ACTIVE" ? "DISABLED" : "ACTIVE" }
            : s
        );
      } else {
        return;
      }
    } else {
      // Toggle type mode (REGULAR, VIP, COUPLE, WHEELCHAIR)
      if (existing) {
        updated = localSeats.map((s) =>
          s.row === row && s.column === col
            ? { ...s, seatType: editMode as any, status: "ACTIVE" }
            : s
        );
      } else {
        // Create new seat at this cell
        const newSeat: Seat = {
          studioId,
          row,
          column: col,
          seatNumber: col,
          seatLabel: `${row}${col}`,
          seatType: editMode as any,
          status: "ACTIVE",
        };
        updated = [...localSeats, newSeat];
      }
    }
    setLocalSeats(recalculateSeatLabels(updated));
  };

  const handleSave = async () => {
    try {
      try {
        await updateStudio({ id: studioId, body: { layoutRows: rows.length, layoutColumns: cols.length } }).unwrap();
      } catch (e) {
        // ignore update failure for metadata
      }

      await saveLayout({ studioId, seats: localSeats, force: forceSave } as any).unwrap();
      toastSuccess("Studio seat layout saved successfully");
      router.push("/admin/studios");
    } catch (err: any) {
      toastError(err?.data?.message || "Failed to save layout.");
    }
  };

  const addRow = () => {
    setLocalRowsCount((prev) => (prev ?? rows.length) + 1);
    toastSuccess("New row added at the bottom");
  };

  const addColumn = () => {
    const nextCol = (localColsCount ?? cols.length) + 1;
    const newSeats: Seat[] = rows.map((r) => ({
      studioId,
      row: r,
      column: nextCol,
      seatNumber: nextCol,
      seatLabel: `${r}${nextCol}`,
      seatType: "REGULAR",
      status: "ACTIVE",
    }));

    setLocalSeats((prev) => recalculateSeatLabels([...prev, ...newSeats]));
    setLocalColsCount(nextCol);
    toastSuccess(`New column ${nextCol} added to the right`);
  };

  const insertAisle = (pos: number) => {
    setLocalColsCount((prev) => (prev ?? cols.length) + 1);
    setLocalSeats((prev) => {
      const shifted = prev.map((s) => {
        if (s.column >= pos + 1) {
          return { ...s, column: s.column + 1 };
        }
        return s;
      });
      return recalculateSeatLabels(shifted);
    });
    toastSuccess(`Aisle inserted after Column ${pos}`);
  };

  const handleRemoveRow = async () => {
    if (!selectedRowToRemove) return;
    const rowIdx = getRowIndex(selectedRowToRemove);
    if (rowIdx < 0) return;

    const rowSeats = localSeats.filter((s) => s.row === selectedRowToRemove);
    if (rowSeats.length > 0) {
      try {
        const response = await validateRemoval({ studioId, row: selectedRowToRemove }).unwrap();
        if (!response.data.safe) {
          toastError(`Cannot remove row ${selectedRowToRemove} because it is associated with existing ticket history.`);
          return;
        }
      } catch (err: any) {
        toastError(err?.data?.message || "Failed to validate row removal.");
        return;
      }
    }

    if (!window.confirm(`Are you sure you want to remove Row ${selectedRowToRemove}? This will shift rows above it down.`)) {
      return;
    }

    setLocalSeats((prev) => {
      const filtered = prev.filter((s) => s.row !== selectedRowToRemove);
      const shifted = filtered.map((s) => {
        const currentIdx = getRowIndex(s.row);
        if (currentIdx > rowIdx) {
          return { ...s, row: getRowLabel(currentIdx - 1) };
        }
        return s;
      });
      return recalculateSeatLabels(shifted);
    });

    setLocalRowsCount((prev) => Math.max(0, (prev ?? rows.length) - 1));
    toastSuccess(`Row ${selectedRowToRemove} removed successfully.`);
  };

  const handleRemoveColumn = async () => {
    if (!selectedColToRemove) return;

    const colSeats = localSeats.filter((s) => s.column === selectedColToRemove);
    if (colSeats.length > 0) {
      try {
        const response = await validateRemoval({ studioId, column: selectedColToRemove }).unwrap();
        if (!response.data.safe) {
          toastError(`Cannot remove column ${selectedColToRemove} because it is associated with existing ticket history.`);
          return;
        }
      } catch (err: any) {
        toastError(err?.data?.message || "Failed to validate column removal.");
        return;
      }
    }

    if (!window.confirm(`Are you sure you want to remove Column ${selectedColToRemove}?`)) {
      return;
    }

    setLocalSeats((prev) => {
      const filtered = prev.filter((s) => s.column !== selectedColToRemove);
      const shifted = filtered.map((s) => {
        if (s.column > selectedColToRemove) {
          return { ...s, column: s.column - 1 };
        }
        return s;
      });
      return recalculateSeatLabels(shifted);
    });

    setLocalColsCount((prev) => Math.max(0, (prev ?? cols.length) - 1));
    toastSuccess(`Column ${selectedColToRemove} removed successfully.`);
  };

  const handleRemoveAisle = () => {
    if (!selectedAisleToRemove) return;

    if (!window.confirm(`Are you sure you want to remove the aisle at Column ${selectedAisleToRemove}?`)) {
      return;
    }

    setLocalSeats((prev) => {
      const shifted = prev.map((s) => {
        if (s.column > selectedAisleToRemove) {
          return { ...s, column: s.column - 1 };
        }
        return s;
      });
      return recalculateSeatLabels(shifted);
    });

    setLocalColsCount((prev) => Math.max(0, (prev ?? cols.length) - 1));
    toastSuccess(`Aisle at Column ${selectedAisleToRemove} removed.`);
  };

  const handleResetToDefault = () => {
    const defaultSeats: Seat[] = [];
    const defaultRows = Array.from({ length: 11 }, (_, i) => getRowLabel(i));
    const totalCols = 13; // column 7 is aisle

    defaultRows.forEach((r) => {
      for (let c = 1; c <= totalCols; c++) {
        if (c === 7) continue;
        defaultSeats.push({
          studioId,
          row: r,
          column: c,
          seatNumber: c > 7 ? c - 1 : c,
          seatLabel: `${r}${c > 7 ? c - 1 : c}`,
          seatType: "REGULAR",
          status: "ACTIVE",
        });
      }
    });

    setLocalSeats(defaultSeats);
    setLocalRowsCount(11);
    setLocalColsCount(13);
    toastSuccess("Reset to default layout template (11 rows, 12 columns + 1 aisle)");
  };

  const getSeatColor = (seat: Seat) => {
    if (seat.status === "DISABLED") return "bg-zinc-300 dark:bg-zinc-800 text-zinc-400 dark:text-zinc-650 cursor-pointer";

    switch (seat.seatType) {
      case "VIP":
        return "bg-amber-500 hover:bg-amber-600 text-white shadow-xs cursor-pointer";
      case "COUPLE":
        return "bg-rose-500 hover:bg-rose-600 text-white shadow-xs cursor-pointer";
      case "WHEELCHAIR":
        return "bg-blue-500 hover:bg-blue-600 text-white shadow-xs cursor-pointer";
      default:
        return "bg-indigo-600 hover:bg-indigo-700 text-white shadow-xs cursor-pointer";
    }
  };

  if (studioLoading || seatsLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-4">
        <Spinner className="w-10 h-10" />
        <span className="text-zinc-500">Loading seat layout configurations...</span>
      </div>
    );
  }

  return (
    <div className="space-y-8 font-sans">
      {/* Header and Layout Actions */}
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
              Configure theater grid for <strong className="text-zinc-850 dark:text-zinc-200">{studioResponse?.data?.name}</strong> ({studioResponse?.data?.type}).
            </p>
          </div>
        </div>
        
        <div className="flex flex-wrap gap-3 items-center">
          <Button variant="secondary" onClick={handleResetToDefault} className="flex items-center gap-2">
            <RefreshCw className="w-4 h-4" /> Reset Grid
          </Button>

          <label className="flex items-center gap-2 text-xs py-2 px-3 bg-zinc-50 dark:bg-zinc-900 border rounded-xl cursor-pointer select-none">
            <input type="checkbox" checked={forceSave} onChange={(e) => setForceSave(e.target.checked)} />
            <span className="text-zinc-650 dark:text-zinc-350">Force save (disable dependents)</span>
          </label>

          <Button onClick={handleSave} isLoading={isSaving} className="flex items-center gap-2">
            <Save className="w-4 h-4" /> Save Layout
          </Button>
        </div>
      </div>

      {/* Modern Layout Management Toolbar */}
      <div className="p-6 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl space-y-4 shadow-sm">
        <h3 className="font-semibold text-xs text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
          Layout Management Toolbar
        </h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
          {/* Row expansion/removal */}
          <div className="p-4 bg-zinc-50 dark:bg-zinc-950 rounded-2xl border border-zinc-150 dark:border-zinc-850 space-y-3">
            <span className="text-xs font-bold text-zinc-500 block">Row Management</span>
            <Button variant="secondary" onClick={addRow} className="w-full flex items-center justify-center gap-1.5 py-1.5 text-xs">
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
                onClick={handleRemoveRow}
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
            <Button variant="secondary" onClick={addColumn} className="w-full flex items-center justify-center gap-1.5 py-1.5 text-xs">
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
                onClick={handleRemoveColumn}
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
                  <Button variant="secondary" onClick={() => insertAisle(insertAislePos)} className="px-3 text-xs">
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
                  <Button variant="secondary" onClick={handleRemoveAisle} className="px-3 text-xs bg-rose-50 text-rose-600 hover:bg-rose-100 border-none">
                    Remove
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Editor Controls / Brush Modes */}
      <div className="p-6 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl space-y-4 shadow-sm">
        <h3 className="font-semibold text-xs text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
          Brush Actions / Editor Modes
        </h3>
        <div className="flex flex-wrap gap-2">
          {[
            { mode: "REGULAR", label: "Add/Set Regular (Blue)", color: "bg-indigo-600 text-white" },
            { mode: "VIP", label: "Add/Set VIP (Yellow)", color: "bg-amber-500 text-white" },
            { mode: "COUPLE", label: "Add/Set Couple (Rose)", color: "bg-rose-500 text-white" },
            { mode: "WHEELCHAIR", label: "Add/Set Wheelchair (Light Blue)", color: "bg-blue-500 text-white" },
            { mode: "TOGGLE_STATUS", label: "Enable/Disable Seat", color: "bg-zinc-200 dark:bg-zinc-800 text-zinc-800 dark:text-zinc-250 border border-zinc-300 dark:border-zinc-700" },
            { mode: "DELETE", label: "Remove Seat (Eraser)", color: "bg-rose-50 text-rose-600 border border-rose-200 hover:bg-rose-100" },
          ].map((btn) => (
            <button
              key={btn.mode}
              onClick={() => setEditMode(btn.mode as EditMode)}
              className={`px-4 py-2 text-xs font-semibold rounded-xl transition-all cursor-pointer ${
                editMode === btn.mode
                  ? "ring-4 ring-indigo-500/35 scale-102"
                  : "opacity-85 hover:opacity-100"
              } ${btn.color}`}
            >
              {btn.label}
            </button>
          ))}
        </div>
      </div>

      {/* Seat Grid Area */}
      <div className="p-8 bg-zinc-100 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-3xl overflow-x-auto flex flex-col items-center shadow-inner">
        <div className="w-full max-w-xl bg-zinc-350 dark:bg-zinc-800 text-zinc-500 dark:text-zinc-400 text-center py-2.5 rounded-b-3xl font-bold tracking-widest text-xs uppercase mb-16 shadow-inner border-t border-zinc-200 dark:border-zinc-750">
          SCREEN STAGE
        </div>

        {/* Grid layout representation */}
        <div className="grid gap-3 select-none">
          {visualRows.map((row) => (
            <div key={row} className="flex gap-3 items-center">
              {/* Row Label header */}
              <div className="w-8 text-center font-bold text-zinc-400 text-sm">{row}</div>

              {/* Seats inside row */}
              {cols.map((col) => {
                if (emptyColumns.has(col)) {
                  return (
                    <div key={`aisle-${row}-${col}`} className="w-10 h-10 flex items-center justify-center mx-1">
                      {/* empty aisle spacer */}
                    </div>
                  );
                }

                const seat = getSeatAt(row, col);
                return (
                  <button
                    key={`${row}-${col}`}
                    onClick={() => handleCellClick(row, col)}
                    className={`w-10 h-10 rounded-xl text-[10px] font-bold transition-all hover:scale-105 border flex items-center justify-center ${
                      seat
                        ? getSeatColor(seat)
                        : "bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 text-transparent hover:text-zinc-400 dark:hover:text-zinc-650 hover:border-zinc-300"
                    }`}
                  >
                    {seat ? seat.seatLabel : ""}
                  </button>
                );
              })}
            </div>
          ))}
        </div>

        {/* Legend */}
        <div className="flex flex-wrap gap-4 justify-center mt-12 pt-6 border-t border-zinc-200 dark:border-zinc-850 w-full max-w-xl text-xs font-semibold text-zinc-500">
          <div className="flex items-center gap-1.5"><div className="w-4 h-4 bg-indigo-600 rounded-sm" /> Regular</div>
          <div className="flex items-center gap-1.5"><div className="w-4 h-4 bg-amber-500 rounded-sm" /> VIP</div>
          <div className="flex items-center gap-1.5"><div className="w-4 h-4 bg-rose-500 rounded-sm" /> Couple</div>
          <div className="flex items-center gap-1.5"><div className="w-4 h-4 bg-blue-500 rounded-sm" /> Wheelchair</div>
          <div className="flex items-center gap-1.5"><div className="w-4 h-4 bg-zinc-300 dark:bg-zinc-850 rounded-sm" /> Disabled</div>
          <div className="flex items-center gap-1.5"><div className="w-4 h-4 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-sm" /> Empty / Path</div>
        </div>
      </div>
    </div>
  );
}
