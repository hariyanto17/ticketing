"use client";

import React from "react";
import { Modal } from "@/components/ui/modal";
import { DateTimePicker } from "@/components/ui/DateTimePicker";
import { Select, Button } from "@/components/ui/form-controls";
import { History, Copy } from "lucide-react";
import { useTranslation } from "@/lib/i18n";

interface ScheduleCopyModalProps {
  isOpen: boolean;
  onClose: () => void;
  sourceDate: string;
  setSourceDate: (val: string) => void;
  targetDate: string;
  setTargetDate: (val: string) => void;
  copyStatus: string;
  setCopyStatus: (val: string) => void;
  isCopying: boolean;
  onCopySubmit: (e: React.FormEvent) => void;
}

export function ScheduleCopyModal({
  isOpen,
  onClose,
  sourceDate,
  setSourceDate,
  targetDate,
  setTargetDate,
  copyStatus,
  setCopyStatus,
  isCopying,
  onCopySubmit,
}: ScheduleCopyModalProps) {
  const { t, formatDate } = useTranslation();

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={t("schedules.copyModalTitle")}>
      <form onSubmit={onCopySubmit} className="space-y-4">
        <p className="text-sm text-zinc-500 dark:text-zinc-400">{t("schedules.copyModalSubtitle")}</p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <DateTimePicker
            mode="date"
            label={t("schedules.sourceDate")}
            value={sourceDate}
            onChange={(val) => setSourceDate(val || "")}
            required
          />
          <DateTimePicker
            mode="date"
            label={t("schedules.targetDate")}
            value={targetDate}
            onChange={(val) => setTargetDate(val || "")}
            required
          />
        </div>

        <Select
          label={t("schedules.copyStatus")}
          value={copyStatus}
          onChange={(e) => setCopyStatus(e.target.value)}
          options={[
            { value: "KEEP", label: t("schedules.statusKeepOriginal") },
            { value: "PUBLISHED", label: "PUBLISHED" },
            { value: "DRAFT", label: "DRAFT" },
            { value: "CLOSED", label: "CLOSED" },
          ]}
        />

        <div className="bg-zinc-50 dark:bg-zinc-850/80 border border-zinc-200 dark:border-zinc-800 rounded-xl p-3.5 text-xs text-zinc-600 dark:text-zinc-300 flex items-start gap-2.5">
          <History className="w-4 h-4 text-zinc-400 shrink-0 mt-0.5" />
          <span>
            {t("schedules.copyNotice", {
              source: formatDate(sourceDate),
              target: formatDate(targetDate),
            })}
          </span>
        </div>

        <div className="flex justify-end gap-3 pt-4 border-t border-zinc-150 dark:border-zinc-800">
          <Button variant="secondary" type="button" onClick={onClose}>
            {t("common.cancel")}
          </Button>
          <Button
            type="submit"
            isLoading={isCopying}
            className="flex items-center gap-2 bg-zinc-900 hover:bg-zinc-800 text-white dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-white"
          >
            <Copy className="w-4 h-4" /> {t("schedules.copyAction")}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
