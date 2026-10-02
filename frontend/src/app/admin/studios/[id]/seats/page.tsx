"use client";

import React, { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import {
  useGetStudioByIdQuery,
  useGetSeatsQuery,
  useSaveLayoutMutation,
  useUpdateStudioMutation,
  useLazyValidateRemovalQuery,
  Seat,
} from "@/services/studioApi";
import { useToast } from "@/components/ui/toast";
import { ConfirmationDialog } from "@/components/ui/dialogs";
import { getRowIndex, getVisualRowOrder } from "@/lib/seatLayout";

// Modular Subcomponents
import { SeatEditorToolbar } from "@/components/admin/studios/SeatEditorToolbar";
import { SeatDimensionControls } from "@/components/admin/studios/SeatDimensionControls";
import { SeatBrushModeSelector, EditMode } from "@/components/admin/studios/SeatBrushModeSelector";
import { SeatStatsSummary } from "@/components/admin/studios/SeatStatsSummary";
import { SeatGridCanvas } from "@/components/admin/studios/SeatGridCanvas";

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
  const rawId = params?.id;
  const studioId = typeof rawId === "string" ? rawId : Array.isArray(rawId) ? rawId[0] : "";
  const { success: toastSuccess, error: toastError } = useToast();

  const { data: studioResponse } = useGetStudioByIdQuery(studioId, { skip: !studioId });
  const { data: seatsResponse } = useGetSeatsQuery(studioId, { skip: !studioId });
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

  // Confirmation Dialog states
  const [isConfirmRowOpen, setIsConfirmRowOpen] = useState(false);
  const [isConfirmColOpen, setIsConfirmColOpen] = useState(false);
  const [isConfirmAisleOpen, setIsConfirmAisleOpen] = useState(false);

  // Grid dimensions
  const studioRowsCount = studioResponse?.data?.layoutRows || 0;
  const studioColsCount = studioResponse?.data?.layoutColumns || 0;

  const currentSeatMaxCol = localSeats.length > 0 ? Math.max(...localSeats.map((s) => s.column)) : 0;
  const currentSeatMaxRowIdx =
    localSeats.length > 0 ? Math.max(...localSeats.map((s) => getRowIndex(s.row))) : -1;

  const derivedDbRows = studioRowsCount > 0 ? studioRowsCount : currentSeatMaxRowIdx >= 0 ? currentSeatMaxRowIdx + 1 : 1;
  const derivedDbCols = studioColsCount > 0 ? studioColsCount : currentSeatMaxCol > 0 ? currentSeatMaxCol : 1;

  const rowsCount = localRowsCount ?? derivedDbRows;
  const maxColumn = localColsCount ?? derivedDbCols;

  const rows = Array.from({ length: rowsCount }, (_, i) => getRowLabel(i));
  const visualRows = getVisualRowOrder(rows);
  const cols = Array.from({ length: maxColumn }, (_, i) => i + 1);
  const emptyColumns = new Set(cols.filter((c) => !localSeats.some((s) => s.column === c)));

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

  const getSeatAt = (row: string, col: number): Seat | undefined => {
    return localSeats.find((s) => s.row === row && s.column === col);
  };

  const handleCellClick = (row: string, col: number) => {
    const existingIndex = localSeats.findIndex((s) => s.row === row && s.column === col);

    if (editMode === "DELETE") {
      if (existingIndex >= 0) {
        const updated = localSeats.filter((_, idx) => idx !== existingIndex);
        setLocalSeats(recalculateSeatLabels(updated));
      }
      return;
    }

    if (existingIndex >= 0) {
      const existing = localSeats[existingIndex];
      let updatedSeat: Seat = { ...existing };

      if (editMode === "TOGGLE_STATUS") {
        updatedSeat.status = existing.status === "ACTIVE" ? "DISABLED" : "ACTIVE";
      } else {
        updatedSeat.seatType = editMode;
        if (existing.status === "DISABLED") {
          updatedSeat.status = "ACTIVE";
        }
      }

      const updated = [...localSeats];
      updated[existingIndex] = updatedSeat;
      setLocalSeats(recalculateSeatLabels(updated));
    } else {
      if (editMode === "TOGGLE_STATUS") return;

      const newSeat: Seat = {
        id: `temp-${Date.now()}-${Math.random()}`,
        studioId,
        row,
        column: col,
        seatNumber: 1,
        seatLabel: `${row}${col}`,
        seatType: editMode,
        status: "ACTIVE",
      };

      const updated = [...localSeats, newSeat];
      setLocalSeats(recalculateSeatLabels(updated));
    }
  };

  const handleResetToDefault = () => {
    if (confirm("Reset current grid changes to default 10x12 matrix?")) {
      const defaultRows = 10;
      const defaultCols = 12;
      const generated: Seat[] = [];

      for (let r = 0; r < defaultRows; r++) {
        const rowLabel = getRowLabel(r);
        for (let c = 1; c <= defaultCols; c++) {
          generated.push({
            id: `temp-${r}-${c}`,
            studioId,
            row: rowLabel,
            column: c,
            seatNumber: c,
            seatLabel: `${rowLabel}${c}`,
            seatType: "REGULAR",
            status: "ACTIVE",
          });
        }
      }

      setLocalRowsCount(defaultRows);
      setLocalColsCount(defaultCols);
      setLocalSeats(generated);
    }
  };

  const addRow = () => {
    setLocalRowsCount((prev) => (prev ?? rows.length) + 1);
  };

  const handleRemoveRow = async () => {
    if (!selectedRowToRemove) return;
    try {
      const res = await validateRemoval({ studioId, row: selectedRowToRemove }).unwrap();
      if (!res.data?.safe && !forceSave) {
        toastError(
          `Cannot remove Row ${selectedRowToRemove}: Active bookings exist. Check "Force save" to override.`
        );
        return;
      }
    } catch {
      // ignore
    }
    setIsConfirmRowOpen(true);
  };

  const executeRemoveRow = () => {
    const targetIdx = getRowIndex(selectedRowToRemove);
    const updatedSeats: Seat[] = [];

    localSeats.forEach((s) => {
      const rIdx = getRowIndex(s.row);
      if (rIdx < targetIdx) {
        updatedSeats.push(s);
      } else if (rIdx > targetIdx) {
        updatedSeats.push({
          ...s,
          row: getRowLabel(rIdx - 1),
        });
      }
    });

    setLocalRowsCount((prev) => Math.max(1, (prev ?? rows.length) - 1));
    setLocalSeats(recalculateSeatLabels(updatedSeats));
    setIsConfirmRowOpen(false);
    toastSuccess(`Row ${selectedRowToRemove} removed.`);
  };

  const addColumn = () => {
    setLocalColsCount((prev) => (prev ?? maxColumn) + 1);
  };

  const handleRemoveColumn = async () => {
    if (!selectedColToRemove) return;
    try {
      const res = await validateRemoval({ studioId, column: selectedColToRemove }).unwrap();
      if (!res.data?.safe && !forceSave) {
        toastError(
          `Cannot remove Column ${selectedColToRemove}: Active bookings exist. Check "Force save" to override.`
        );
        return;
      }
    } catch {
      // ignore
    }
    setIsConfirmColOpen(true);
  };

  const executeRemoveColumn = () => {
    const targetCol = selectedColToRemove;
    const updatedSeats: Seat[] = [];

    localSeats.forEach((s) => {
      if (s.column < targetCol) {
        updatedSeats.push(s);
      } else if (s.column > targetCol) {
        updatedSeats.push({
          ...s,
          column: s.column - 1,
        });
      }
    });

    setLocalColsCount((prev) => Math.max(1, (prev ?? maxColumn) - 1));
    setLocalSeats(recalculateSeatLabels(updatedSeats));
    setIsConfirmColOpen(false);
    toastSuccess(`Column ${targetCol} removed.`);
  };

  const insertAisle = (colPos: number) => {
    const updated = localSeats.map((s) => {
      if (s.column > colPos) {
        return { ...s, column: s.column + 1 };
      }
      return s;
    });

    setLocalColsCount((prev) => (prev ?? maxColumn) + 1);
    setLocalSeats(recalculateSeatLabels(updated));
    toastSuccess(`Aisle inserted after Column ${colPos}`);
  };

  const handleRemoveAisle = () => {
    setIsConfirmAisleOpen(true);
  };

  const executeRemoveAisle = () => {
    const targetCol = selectedAisleToRemove;
    const updated = localSeats.map((s) => {
      if (s.column > targetCol) {
        return { ...s, column: s.column - 1 };
      }
      return s;
    });

    setLocalColsCount((prev) => Math.max(1, (prev ?? maxColumn) - 1));
    setLocalSeats(recalculateSeatLabels(updated));
    setIsConfirmAisleOpen(false);
    toastSuccess(`Aisle at Column ${targetCol} removed.`);
  };

  const handleSave = async () => {
    try {
      const seatsToSave = recalculateSeatLabels(localSeats).map((s) => ({
        row: s.row,
        column: s.column,
        seatNumber: s.seatNumber,
        seatLabel: s.seatLabel,
        seatType: s.seatType,
        status: s.status,
      }));

      await saveLayout({
        studioId,
        seats: seatsToSave as any,
        force: forceSave,
      }).unwrap();

      await updateStudio({
        id: studioId,
        body: {
          layoutRows: rowsCount,
          layoutColumns: maxColumn,
          capacity: localSeats.filter((s) => s.status === "ACTIVE").length,
        },
      }).unwrap();

      toastSuccess("Layout and studio dimensions saved successfully!");
    } catch (err: any) {
      toastError(err?.data?.message || "Failed to save seat layout");
    }
  };

  const getSeatColor = (seat: Seat) => {
    if (seat.status === "DISABLED") {
      return "bg-zinc-200 dark:bg-zinc-800 border-zinc-300 dark:border-zinc-700 text-zinc-400 opacity-60";
    }
    switch (seat.seatType) {
      case "VIP":
        return "bg-amber-500 border-amber-400 text-white font-black";
      case "COUPLE":
        return "bg-rose-500 border-rose-400 text-white font-black";
      case "WHEELCHAIR":
        return "bg-blue-500 border-blue-400 text-white font-black";
      case "REGULAR":
      default:
        return "bg-indigo-600 border-indigo-500 text-white font-black";
    }
  };

  return (
    <div className="space-y-8 font-sans">
      <SeatEditorToolbar
        studioName={studioResponse?.data?.name}
        studioType={studioResponse?.data?.type}
        forceSave={forceSave}
        setForceSave={setForceSave}
        isSaving={isSaving}
        onResetToDefault={handleResetToDefault}
        onSave={handleSave}
      />

      <SeatDimensionControls
        rows={rows}
        cols={cols}
        emptyColumns={emptyColumns}
        selectedRowToRemove={selectedRowToRemove}
        setSelectedRowToRemove={setSelectedRowToRemove}
        selectedColToRemove={selectedColToRemove}
        setSelectedColToRemove={setSelectedColToRemove}
        insertAislePos={insertAislePos}
        setInsertAislePos={setInsertAislePos}
        selectedAisleToRemove={selectedAisleToRemove}
        setSelectedAisleToRemove={setSelectedAisleToRemove}
        onAddRow={addRow}
        onRemoveRow={handleRemoveRow}
        onAddColumn={addColumn}
        onRemoveColumn={handleRemoveColumn}
        onInsertAisle={insertAisle}
        onRemoveAisle={handleRemoveAisle}
      />

      <SeatBrushModeSelector editMode={editMode} setEditMode={setEditMode} />

      <SeatStatsSummary localSeats={localSeats} rowsCount={rows.length} colsCount={cols.length} />

      <SeatGridCanvas
        cols={cols}
        visualRows={visualRows}
        emptyColumns={emptyColumns}
        getSeatAt={getSeatAt}
        getSeatColor={getSeatColor}
        onCellClick={handleCellClick}
      />

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
