"use client";

import React from "react";
import { Modal } from "@/components/ui/modal";
import { Select, Button } from "@/components/ui/form-controls";
import { Download } from "lucide-react";
import { useTranslation } from "@/lib/i18n";

interface MovieImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  importType: "NOW_PLAYING" | "UPCOMING" | "BOTH";
  setImportType: (val: "NOW_PLAYING" | "UPCOMING" | "BOTH") => void;
  isImporting: boolean;
  onImport: () => void;
}

export function MovieImportModal({
  isOpen,
  onClose,
  importType,
  setImportType,
  isImporting,
  onImport,
}: MovieImportModalProps) {
  const { t } = useTranslation();

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={t("movies.importFrom21")}>
      <div className="space-y-4">
        <p className="text-sm text-zinc-500 dark:text-zinc-400 leading-relaxed">
          {t("movies.importDesc")}
        </p>

        <Select
          label={t("movies.importCategory")}
          value={importType}
          onChange={(e) => setImportType(e.target.value as any)}
          options={[
            { value: "BOTH", label: `${t("movies.nowPlaying")} & ${t("movies.comingSoon")}` },
            { value: "NOW_PLAYING", label: t("movies.nowPlayingOnly") },
            { value: "UPCOMING", label: t("movies.comingSoonOnly") },
          ]}
        />

        <div className="p-3 bg-zinc-50 dark:bg-zinc-800/50 rounded-xl border border-zinc-200 dark:border-zinc-700 text-xs text-zinc-500 dark:text-zinc-400">
          📍 {t("movies.cityFilterNotice")}
        </div>

        <div className="flex justify-end gap-3 pt-4 border-t border-zinc-150 dark:border-zinc-800">
          <Button variant="secondary" onClick={onClose}>
            {t("common.cancel")}
          </Button>
          <Button
            onClick={onImport}
            isLoading={isImporting}
            className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white"
          >
            <Download className="w-4 h-4" /> {t("movies.startImport")}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
