"use client";

import React, { useState } from "react";
import {
  X,
  Smartphone,
  Sparkles,
  Armchair,
  QrCode,
  Ticket,
  CheckCircle2,
  ExternalLink,
} from "lucide-react";
import { useTranslation } from "@/lib/i18n";

interface AppDownloadModalProps {
  isOpen: boolean;
  onClose: () => void;
  movieTitle?: string;
  showtime?: string;
  studioName?: string;
}

export const AppDownloadModal: React.FC<AppDownloadModalProps> = ({
  isOpen,
  onClose,
  movieTitle,
  showtime,
  studioName,
}) => {
  const { t } = useTranslation();
  const [copiedNotice, setCopiedNotice] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleStoreClick = (storeName: string) => {
    setCopiedNotice(`${storeName} - ${t("appDownload.notice")}`);
    setTimeout(() => setCopiedNotice(null), 4000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-200">
      <div
        className="relative w-full max-w-lg bg-white dark:bg-zinc-900 rounded-3xl border border-zinc-200 dark:border-zinc-800 shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header accent bar */}
        <div className="h-2 w-full bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500" />

        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 rounded-full text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="p-6 sm:p-8 space-y-6">
          {/* Main App Icon & Heading */}
          <div className="flex flex-col items-center text-center space-y-3">
            <div className="relative">
              <div className="w-16 h-16 rounded-2xl bg-indigo-600 shadow-lg shadow-indigo-500/30 flex items-center justify-center text-white border-2 border-white/20">
                <Smartphone className="w-8 h-8" />
              </div>
              <div className="absolute -bottom-1 -right-1 p-1 bg-amber-500 rounded-full text-white shadow-xs">
                <Sparkles className="w-3.5 h-3.5" />
              </div>
            </div>

            <div className="space-y-1">
              <h3 className="text-xl sm:text-2xl font-black tracking-tight text-zinc-900 dark:text-zinc-50">
                {t("appDownload.modalTitle")}
              </h3>
              <p className="text-xs sm:text-sm text-zinc-500 dark:text-zinc-400 max-w-sm mx-auto leading-relaxed">
                {t("appDownload.modalSubtitle")}
              </p>
            </div>
          </div>

          {/* Selected Showtime Context Preview (if available) */}
          {movieTitle && (
            <div className="p-3.5 bg-indigo-50/70 dark:bg-indigo-950/40 border border-indigo-150 dark:border-indigo-900/60 rounded-2xl flex items-center justify-between text-xs">
              <div className="space-y-0.5">
                <span className="font-bold text-indigo-950 dark:text-indigo-200 block line-clamp-1">
                  {movieTitle}
                </span>
                <span className="text-indigo-700 dark:text-indigo-300/80 text-[11px]">
                  {studioName ? `${studioName} • ` : ""}
                  {showtime || ""}
                </span>
              </div>
              <span className="px-2.5 py-1 bg-indigo-600 text-white font-bold text-[10px] rounded-lg shadow-xs uppercase tracking-wider shrink-0">
                Pesan di App
              </span>
            </div>
          )}

          {/* App Store & Play Store Download Buttons */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Google Play Button */}
            <button
              onClick={() => handleStoreClick("Google Play Store")}
              type="button"
              className="group relative p-3.5 bg-zinc-900 hover:bg-zinc-800 text-white dark:bg-zinc-800 dark:hover:bg-zinc-750 border border-zinc-700 rounded-2xl flex items-center gap-3 transition-all shadow-md active:scale-95 cursor-pointer text-left overflow-hidden"
            >
              {/* Play Store SVG Icon */}
              <svg className="w-7 h-7 shrink-0" viewBox="0 0 24 24" fill="none">
                <path
                  d="M3.609 1.814L13.792 12 3.61 22.186A2.215 2.215 0 013 20.612V3.388c0-.606.236-1.168.609-1.574z"
                  fill="#00D3FF"
                />
                <path
                  d="M17.186 8.606l-3.394 3.394 3.394 3.394 3.824-2.193a2.03 2.03 0 000-3.602l-3.824-2.193z"
                  fill="#FFCE00"
                />
                <path
                  d="M13.792 12L3.609 1.814a2.213 2.213 0 011.025-.327 2.22 2.22 0 011.455.513l11.1 6.368-3.397 3.632z"
                  fill="#00F076"
                />
                <path
                  d="M13.792 12l3.397 3.632-11.1 6.368a2.22 2.22 0 01-1.455.513 2.213 2.213 0 01-1.025-.327L13.792 12z"
                  fill="#FF3A44"
                />
              </svg>
              <div className="flex-1 min-w-0">
                <span className="block text-[9px] uppercase tracking-wider text-zinc-400 font-semibold leading-tight">
                  {t("appDownload.playStoreSub")}
                </span>
                <span className="block text-sm font-black text-white leading-tight">
                  {t("appDownload.getOnPlayStore")}
                </span>
              </div>
              <span className="px-1.5 py-0.5 bg-amber-500/20 text-amber-400 border border-amber-500/40 text-[9px] font-bold rounded-md">
                {t("appDownload.comingSoonBadge")}
              </span>
            </button>

            {/* Apple App Store Button */}
            <button
              onClick={() => handleStoreClick("Apple App Store")}
              type="button"
              className="group relative p-3.5 bg-zinc-900 hover:bg-zinc-800 text-white dark:bg-zinc-800 dark:hover:bg-zinc-750 border border-zinc-700 rounded-2xl flex items-center gap-3 transition-all shadow-md active:scale-95 cursor-pointer text-left overflow-hidden"
            >
              {/* Apple SVG Icon */}
              <svg className="w-7 h-7 shrink-0 fill-current" viewBox="0 0 24 24">
                <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M15.97 6.85c.66-.8 1.1-1.92.98-3.04-1.05.04-2.31.7-3.07 1.59-.58.68-1.09 1.78-.95 2.86 1.17.09 2.38-.6 3.04-1.41z" />
              </svg>
              <div className="flex-1 min-w-0">
                <span className="block text-[9px] uppercase tracking-wider text-zinc-400 font-semibold leading-tight">
                  {t("appDownload.appStoreSub")}
                </span>
                <span className="block text-sm font-black text-white leading-tight">
                  {t("appDownload.downloadOnAppStore")}
                </span>
              </div>
              <span className="px-1.5 py-0.5 bg-amber-500/20 text-amber-400 border border-amber-500/40 text-[9px] font-bold rounded-md">
                {t("appDownload.comingSoonBadge")}
              </span>
            </button>
          </div>

          {/* Interactive Notice Toast */}
          {copiedNotice && (
            <div className="p-3 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/80 rounded-2xl text-xs text-amber-800 dark:text-amber-300 font-medium flex items-center gap-2 animate-in fade-in duration-150">
              <Sparkles className="w-4 h-4 shrink-0 text-amber-600 dark:text-amber-400" />
              <span>{copiedNotice}</span>
            </div>
          )}

          {/* Key Advantages Checklist */}
          <div className="space-y-2.5 pt-2 border-t border-zinc-150 dark:border-zinc-800 text-xs text-zinc-600 dark:text-zinc-300">
            <div className="flex items-center gap-2.5">
              <div className="w-5 h-5 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
                <CheckCircle2 className="w-3.5 h-3.5" />
              </div>
              <span>{t("appDownload.feature1")}</span>
            </div>
            <div className="flex items-center gap-2.5">
              <div className="w-5 h-5 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
                <CheckCircle2 className="w-3.5 h-3.5" />
              </div>
              <span>{t("appDownload.feature2")}</span>
            </div>
            <div className="flex items-center gap-2.5">
              <div className="w-5 h-5 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
                <CheckCircle2 className="w-3.5 h-3.5" />
              </div>
              <span>{t("appDownload.feature3")}</span>
            </div>
          </div>

          {/* Close Action */}
          <div className="pt-2">
            <button
              onClick={onClose}
              type="button"
              className="w-full py-3 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-200 font-bold text-xs rounded-2xl transition cursor-pointer"
            >
              {t("appDownload.close")}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
