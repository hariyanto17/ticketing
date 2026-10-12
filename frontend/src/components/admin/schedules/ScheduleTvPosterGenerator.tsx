"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { Download, RefreshCw, Tv } from "lucide-react";
import { Button } from "@/components/ui/form-controls";
import { Modal } from "@/components/ui/modal";
import { useToast } from "@/components/ui/toast";
import { useTranslation } from "@/lib/i18n";
import type { Schedule } from "@/services/studioApi";
import { getScheduleDateKey, renderScheduleTvPoster } from "@/lib/schedulePoster";

interface ScheduleTvPosterGeneratorProps {
  schedules: Schedule[] | undefined;
}

export function ScheduleTvPosterGenerator({
  schedules,
}: ScheduleTvPosterGeneratorProps) {
  const { t } = useTranslation();
  const { success: toastSuccess, error: toastError } = useToast();
  const [isOpen, setIsOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [posterBlob, setPosterBlob] = useState<Blob | null>(null);
  const [generationError, setGenerationError] = useState<string | null>(null);
  const generationId = useRef(0);

  const dateOptions = useMemo(
    () =>
      [...new Set(
        (schedules ?? [])
          .filter((schedule) => schedule.status === "PUBLISHED")
          .map((schedule) => getScheduleDateKey(schedule.businessDate))
      )].sort(),
    [schedules]
  );

  useEffect(() => {
    if (!dateOptions.includes(selectedDate)) {
      setSelectedDate(dateOptions[0] ?? "");
      setPreviewUrl(null);
      setPosterBlob(null);
    }
  }, [dateOptions, selectedDate]);

  useEffect(
    () => () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    },
    [previewUrl]
  );

  useEffect(
    () => () => {
      generationId.current += 1;
    },
    []
  );

  const clearPreview = () => {
    setPreviewUrl(null);
    setPosterBlob(null);
    setGenerationError(null);
  };

  const generatePreview = async (dateKey = selectedDate) => {
    if (!dateKey) return;
    const requestId = ++generationId.current;
    setIsGenerating(true);
    setGenerationError(null);
    try {
      const result = await renderScheduleTvPoster(schedules ?? [], dateKey);
      if (requestId !== generationId.current) return;
      setPreviewUrl(URL.createObjectURL(result.blob));
      setPosterBlob(result.blob);
    } catch (error) {
      if (requestId !== generationId.current) return;
      console.error("Failed to generate TV schedule poster:", error);
      const message = error instanceof Error
        ? error.message
        : t("schedules.tvPosterLoadFailed");
      setGenerationError(message);
      toastError(message);
    } finally {
      if (requestId === generationId.current) setIsGenerating(false);
    }
  };

  const openPreview = () => {
    if (!dateOptions.length) return;
    const initialDate = dateOptions.includes(selectedDate)
      ? selectedDate
      : dateOptions[0];
    setSelectedDate(initialDate);
    clearPreview();
    setIsOpen(true);
    void generatePreview(initialDate);
  };

  const handleDateChange = (dateKey: string) => {
    generationId.current += 1;
    setIsGenerating(false);
    setSelectedDate(dateKey);
    clearPreview();
  };

  const handleDownload = () => {
    if (!posterBlob || !previewUrl) return;
    const link = document.createElement("a");
    link.href = previewUrl;
    link.download = `planet-cinema-tv-${selectedDate}.png`;
    link.click();
    toastSuccess(t("schedules.posterDownloaded"));
  };

  const handleClose = () => {
    generationId.current += 1;
    setIsGenerating(false);
    setIsOpen(false);
    clearPreview();
  };

  return (
    <>
      <Button
        type="button"
        variant="secondary"
        onClick={openPreview}
        disabled={!dateOptions.length}
        className="flex items-center gap-2 border-zinc-200 dark:border-zinc-800 text-zinc-700 dark:text-zinc-300 text-xs font-medium px-3.5 py-2 rounded-xl transition-all"
        title={dateOptions.length ? undefined : t("schedules.posterNoDates")}
      >
        <Tv className="h-3.5 w-3.5" />
        {t("schedules.generateTvPoster")}
      </Button>

      <Modal
        isOpen={isOpen}
        onClose={handleClose}
        title={t("schedules.tvPosterPreviewTitle")}
        size="xl"
      >
        <div className="space-y-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <label className="flex flex-col gap-1.5 text-sm font-medium text-zinc-700 dark:text-zinc-300">
              {t("schedules.posterDate")}
              <select
                value={selectedDate}
                onChange={(event) => handleDateChange(event.target.value)}
                className="rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 outline-none focus:border-zinc-400 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
              >
                {dateOptions.map((date) => (
                  <option key={date} value={date}>
                    {new Intl.DateTimeFormat("id-ID", {
                      timeZone: "Asia/Makassar",
                      dateStyle: "full",
                    }).format(new Date(`${date}T12:00:00+08:00`))}
                  </option>
                ))}
              </select>
            </label>
            <div className="flex gap-2">
              <Button
                type="button"
                variant="secondary"
                onClick={() => void generatePreview()}
                isLoading={isGenerating}
                disabled={!selectedDate}
                className="gap-2 text-xs"
              >
                <RefreshCw className="h-3.5 w-3.5" />
                {previewUrl
                  ? t("schedules.posterRefresh")
                  : t("schedules.posterGenerate")}
              </Button>
              <Button
                type="button"
                onClick={handleDownload}
                disabled={!posterBlob || isGenerating}
                className="gap-2 text-xs"
              >
                <Download className="h-3.5 w-3.5" />
                {t("schedules.posterDownload")}
              </Button>
            </div>
          </div>

          <div className="flex min-h-64 items-center justify-center rounded-2xl bg-zinc-100 p-3 dark:bg-zinc-950">
            {isGenerating ? (
              <div
                role="status"
                className="flex flex-col items-center gap-3 text-sm text-zinc-500 dark:text-zinc-400"
              >
                <span className="h-7 w-7 animate-spin rounded-full border-2 border-zinc-500 border-t-transparent" />
                {t("schedules.posterLoading")}
              </div>
            ) : previewUrl ? (
              <img
                src={previewUrl}
                alt={t("schedules.tvPosterPreviewTitle")}
                className="max-h-[58vh] max-w-full rounded-lg object-contain shadow-xl"
              />
            ) : (
              <p className="text-center text-sm text-zinc-500 dark:text-zinc-400">
                {generationError || t("schedules.posterGenerate")}
              </p>
            )}
          </div>

          {generationError && (
            <p role="alert" className="text-sm text-rose-600 dark:text-rose-400">
              {generationError}
            </p>
          )}
          <div className="flex justify-end border-t border-zinc-100 pt-3 dark:border-zinc-800">
            <Button type="button" variant="secondary" onClick={handleClose}>
              {t("common.close")}
            </Button>
          </div>
        </div>
      </Modal>
    </>
  );
}
