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
import { ConfirmationDialog } from "@/components/ui/dialogs";
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
  const rawId = params?.id;
  const studioId = typeof rawId === "string" ? rawId : Array.isArray(rawId) ? rawId[0] : "";
  const { success: toastSuccess, error: toastError } = useToast();

  const { data: studioResponse, isLoading: studioLoading } = useGetStudioByIdQuery(studioId, {
    skip: !studioId,
  });
  const { data: seatsResponse, isLoading: seatsLoading } = useGetSeatsQuery(studioId, {
    skip: !studioId,
  });
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

  // Custom Confirmation Dialog states
  const [isConfirmRowOpen, setIsConfirmRowOpen] = useState(false);
  const [isConfirmColOpen, setIsConfirmColOpen] = useState(false);
  const [isConfirmAisleOpen, setIsConfirmAisleOpen] = useState(false);

  // Grid dimensions (derived strictly from database values & active seats)
  const studioRowsCount = studioResponse?.data?.layoutRows || 0;
  const studioColsCount = studioResponse?.data?.layoutColumns || 0;

  const currentSeatMaxCol = localSeats.length > 0 ? Math.max(...localSeats.map((s) => s.column)) : 0;
  const currentSeatMaxRowIdx = localSeats.length > 0 ? Math.max(...localSeats.map((s) => getRowIndex(s.row))) : -1;

  const derivedDbRows = studioRowsCount > 0 ? studioRowsCount : currentSeatMaxRowIdx >= 0 ? currentSeatMaxRowIdx + 1 : 1;
  const derivedDbCols = studioColsCount > 0 ? studioColsCount : currentSeatMaxCol > 0 ? currentSeatMaxCol : 1;

  const rowsCount = localRowsCount ?? derivedDbRows;
  const maxColumn = localColsCount ?? derivedDbCols;

  const rows = Array.from({ length: rowsCount }, (_, i) => getRowLabel(i));
  const visualRows = getVisualRowOrder(rows);
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

  // Sync loaded seats and synchronize dimensions strictly from database
  useEffect(() => {
    if (seatsResponse?.data) {
      const formatted = recalculateSeatLabels(seatsResponse.data);
      setLocalSeats(formatted);

      const seatCols = formatted.length > 0 ? Math.max(...formatted.map((s) => s.column)) : 0;
      const seatRows = formatted.length > 0 ? Math.max(...formatted.map((s) => getRowIndex(s.row))) + 1 : 0;
      const stdCols = studioResponse?.data?.layoutColumns || 0;
      const stdRows = studioResponse?.data?.layoutRows || 0;

      const finalCols = stdCols > 0 ? stdCols : seatCols > 0 ? seatCols : 1;
      const finalRows = stdRows > 0 ? stdRows : seatRows > 0 ? seatRows : 1;

      setLocalColsCount(finalCols);
      setLocalRowsCount(finalRows);
    }
  }, [seatsResponse, studioResponse]);

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

    setIsConfirmRowOpen(true);
  };

  const executeRemoveRow = () => {
    const rowIdx = getRowIndex(selectedRowToRemove);
    if (rowIdx < 0) return;

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
    setIsConfirmRowOpen(false);
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

    setIsConfirmColOpen(true);
  };

  const executeRemoveColumn = () => {
    if (!selectedColToRemove) return;

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
    setIsConfirmColOpen(false);
    toastSuccess(`Column ${selectedColToRemove} removed successfully.`);
  };

  const handleRemoveAisle = () => {
    if (!selectedAisleToRemove) return;
    setIsConfirmAisleOpen(true);
  };

  const executeRemoveAisle = () => {
    if (!selectedAisleToRemove) return;

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
    setIsConfirmAisleOpen(false);
    toastSuccess(`Aisle at Column ${selectedAisleToRemove} removed.`);
  };

  const handleResetToDefault = () => {
    if (seatsResponse?.data) {
      const formatted = recalculateSeatLabels(seatsResponse.data);
      setLocalSeats(formatted);

      const seatCols = formatted.length > 0 ? Math.max(...formatted.map((s) => s.column)) : 0;
      const seatRows = formatted.length > 0 ? Math.max(...formatted.map((s) => getRowIndex(s.row))) + 1 : 0;
      const stdCols = studioResponse?.data?.layoutColumns || 0;
      const stdRows = studioResponse?.data?.layoutRows || 0;

      const finalCols = stdCols > 0 ? stdCols : seatCols > 0 ? seatCols : 1;
      const finalRows = stdRows > 0 ? stdRows : seatRows > 0 ? seatRows : 1;

      setLocalColsCount(finalCols);
      setLocalRowsCount(finalRows);
      toastSuccess("Grid dikembalikan ke konfigurasi data database");
    }
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

      {/* Stats Summary Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3">
        <div className="p-3.5 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-xs">
          <span className="text-[11px] font-semibold text-zinc-400 block uppercase">Total Kapasitas</span>
          <span className="text-xl font-bold text-zinc-900 dark:text-zinc-100">
            {localSeats.filter((s) => s.status === "ACTIVE").length} <span className="text-xs font-normal text-zinc-400">kursi</span>
          </span>
        </div>
        <div className="p-3.5 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-xs">
          <span className="text-[11px] font-semibold text-zinc-400 block uppercase">Regular</span>
          <span className="text-xl font-bold text-indigo-600 dark:text-indigo-400">
            {localSeats.filter((s) => s.status === "ACTIVE" && s.seatType === "REGULAR").length}
          </span>
        </div>
        <div className="p-3.5 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-xs">
          <span className="text-[11px] font-semibold text-zinc-400 block uppercase">VIP</span>
          <span className="text-xl font-bold text-amber-500">
            {localSeats.filter((s) => s.status === "ACTIVE" && s.seatType === "VIP").length}
          </span>
        </div>
        <div className="p-3.5 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-xs">
          <span className="text-[11px] font-semibold text-zinc-400 block uppercase">Couple</span>
          <span className="text-xl font-bold text-rose-500">
            {localSeats.filter((s) => s.status === "ACTIVE" && s.seatType === "COUPLE").length}
          </span>
        </div>
        <div className="p-3.5 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-xs">
          <span className="text-[11px] font-semibold text-zinc-400 block uppercase">Wheelchair</span>
          <span className="text-xl font-bold text-blue-500">
            {localSeats.filter((s) => s.status === "ACTIVE" && s.seatType === "WHEELCHAIR").length}
          </span>
        </div>
        <div className="p-3.5 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-xs">
          <span className="text-[11px] font-semibold text-zinc-400 block uppercase">Dimensi Grid</span>
          <span className="text-xl font-bold text-zinc-700 dark:text-zinc-300">
            {rows.length} <span className="text-xs text-zinc-400">×</span> {cols.length}
          </span>
        </div>
      </div>

      {/* Seat Grid Area */}
      <div className="p-6 sm:p-10 bg-zinc-100 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-3xl overflow-x-auto flex flex-col items-center shadow-inner">
        {/* Modern Curved Cinema Screen Bar */}
        <div className="w-full max-w-3xl mb-12 flex flex-col items-center">
          <div className="w-full h-3 bg-gradient-to-r from-transparent via-indigo-500/80 to-transparent rounded-full shadow-[0_0_24px_rgba(99,102,241,0.5)] border-t border-indigo-300/40" />
          <div className="mt-2 text-[11px] font-extrabold tracking-[0.3em] text-zinc-500 dark:text-zinc-400 uppercase text-center flex items-center gap-2">
            <span>—</span>
            <span>LAYAR BIOSKOP / SCREEN</span>
            <span>—</span>
          </div>
        </div>

        {/* Column Number Headers (Top) */}
        <div className="flex gap-2 items-center mb-3 select-none">
          <div className="w-8 text-center text-[10px] font-bold text-zinc-400">ROW</div>
          {cols.map((col) => {
            const isAisle = emptyColumns.has(col);
            return (
              <div
                key={`col-hdr-${col}`}
                className={`w-9 sm:w-10 text-center text-[10px] font-mono font-bold ${
                  isAisle ? "text-zinc-350 dark:text-zinc-650" : "text-zinc-400 dark:text-zinc-500"
                }`}
                title={isAisle ? `Kolom ${col} (Lorong / Aisle)` : `Kolom ${col}`}
              >
                {col}
              </div>
            );
          })}
          <div className="w-8 text-center text-[10px] font-bold text-zinc-400">ROW</div>
        </div>

        {/* Grid layout representation */}
        <div className="grid gap-2.5 select-none">
          {visualRows.map((row) => (
            <div key={row} className="flex gap-2 items-center">
              {/* Left Row Label header */}
              <div className="w-8 h-9 sm:h-10 flex items-center justify-center font-bold text-zinc-600 dark:text-zinc-300 text-xs sm:text-sm bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg shadow-2xs">
                {row}
              </div>

              {/* Seats inside row */}
              {cols.map((col) => {
                const seat = getSeatAt(row, col);
                const isAisleCol = emptyColumns.has(col);

                if (!seat && isAisleCol) {
                  return (
                    <button
                      key={`aisle-${row}-${col}`}
                      type="button"
                      onClick={() => handleCellClick(row, col)}
                      title={`Lorong Kolom ${col} (Klik untuk tambah kursi pada baris ${row})`}
                      className="w-9 sm:w-10 h-9 sm:h-10 flex items-center justify-center rounded-xl border border-dashed border-zinc-250 dark:border-zinc-850 hover:border-indigo-400 hover:bg-indigo-50/30 dark:hover:bg-indigo-950/20 text-transparent hover:text-indigo-400 text-[10px] transition-all cursor-pointer"
                    >
                      +
                    </button>
                  );
                }

                return (
                  <button
                    key={`${row}-${col}`}
                    type="button"
                    onClick={() => handleCellClick(row, col)}
                    title={
                      seat
                        ? `${seat.seatLabel} (Tipe: ${seat.seatType}, Status: ${seat.status})`
                        : `Slot Kosong ${row}${col} (Klik untuk pasang kursi)`
                    }
                    className={`w-9 sm:w-10 h-9 sm:h-10 rounded-xl text-[10px] sm:text-xs font-bold transition-all hover:scale-105 border flex items-center justify-center cursor-pointer shadow-xs ${
                      seat
                        ? getSeatColor(seat)
                        : "bg-white/80 dark:bg-zinc-900/80 border-dashed border-zinc-300 dark:border-zinc-750 text-zinc-350 dark:text-zinc-600 hover:text-zinc-600 dark:hover:text-zinc-300 hover:border-zinc-400 dark:hover:border-zinc-600"
                    }`}
                  >
                    {seat ? seat.seatLabel : `${row}${col}`}
                  </button>
                );
              })}

              {/* Right Row Label header */}
              <div className="w-8 h-9 sm:h-10 flex items-center justify-center font-bold text-zinc-600 dark:text-zinc-300 text-xs sm:text-sm bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg shadow-2xs">
                {row}
              </div>
            </div>
          ))}
        </div>

        {/* Column Number Headers (Bottom) */}
        <div className="flex gap-2 items-center mt-3 select-none">
          <div className="w-8 text-center text-[10px] font-bold text-zinc-400">ROW</div>
          {cols.map((col) => {
            const isAisle = emptyColumns.has(col);
            return (
              <div
                key={`col-ftr-${col}`}
                className={`w-9 sm:w-10 text-center text-[10px] font-mono font-bold ${
                  isAisle ? "text-zinc-350 dark:text-zinc-650" : "text-zinc-400 dark:text-zinc-500"
                }`}
              >
                {col}
              </div>
            );
          })}
          <div className="w-8 text-center text-[10px] font-bold text-zinc-400">ROW</div>
        </div>

        {/* Legend */}
        <div className="flex flex-wrap gap-4 sm:gap-6 justify-center mt-12 pt-6 border-t border-zinc-200 dark:border-zinc-800 w-full max-w-2xl text-xs font-semibold text-zinc-600 dark:text-zinc-400">
          <div className="flex items-center gap-2"><div className="w-4 h-4 bg-indigo-600 rounded-md shadow-xs" /> Regular</div>
          <div className="flex items-center gap-2"><div className="w-4 h-4 bg-amber-500 rounded-md shadow-xs" /> VIP</div>
          <div className="flex items-center gap-2"><div className="w-4 h-4 bg-rose-500 rounded-md shadow-xs" /> Couple</div>
          <div className="flex items-center gap-2"><div className="w-4 h-4 bg-blue-500 rounded-md shadow-xs" /> Wheelchair</div>
          <div className="flex items-center gap-2"><div className="w-4 h-4 bg-zinc-300 dark:bg-zinc-800 rounded-md shadow-xs" /> Nonaktif</div>
          <div className="flex items-center gap-2"><div className="w-4 h-4 bg-white dark:bg-zinc-900 border border-dashed border-zinc-300 dark:border-zinc-700 rounded-md shadow-xs" /> Slot Kosong / Lorong</div>
        </div>
      </div>

      {/* Remove Row Confirmation Dialog */}
      <ConfirmationDialog
        isOpen={isConfirmRowOpen}
        onClose={() => setIsConfirmRowOpen(false)}
        onConfirm={executeRemoveRow}
        title="Hapus Baris Kursi"
        message={`Are you sure you want to remove Row ${selectedRowToRemove}? This will shift rows above it down.`}
        confirmText="Hapus Baris"
        cancelText="Batal"
        variant="danger"
      />

      {/* Remove Column Confirmation Dialog */}
      <ConfirmationDialog
        isOpen={isConfirmColOpen}
        onClose={() => setIsConfirmColOpen(false)}
        onConfirm={executeRemoveColumn}
        title="Hapus Kolom Kursi"
        message={`Are you sure you want to remove Column ${selectedColToRemove}?`}
        confirmText="Hapus Kolom"
        cancelText="Batal"
        variant="danger"
      />

      {/* Remove Aisle Confirmation Dialog */}
      <ConfirmationDialog
        isOpen={isConfirmAisleOpen}
        onClose={() => setIsConfirmAisleOpen(false)}
        onConfirm={executeRemoveAisle}
        title="Hapus Lorong"
        message={`Are you sure you want to remove the aisle at Column ${selectedAisleToRemove}?`}
        confirmText="Hapus Lorong"
        cancelText="Batal"
        variant="warning"
      />
    </div>
  );
}
