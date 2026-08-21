"use client";

import React from "react";
import Link from "next/link";
import { Film } from "lucide-react";
import { useTranslation } from "@/lib/i18n";

export default function NotFound() {
  const { t } = useTranslation();
  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 flex flex-col items-center justify-center p-6 text-center font-sans">
      <div className="space-y-6 max-w-md">
        <div className="w-16 h-16 bg-indigo-50 dark:bg-indigo-950/30 text-indigo-650 dark:text-indigo-400 rounded-2xl flex items-center justify-center mx-auto shadow-sm">
          <Film className="w-8 h-8" />
        </div>
        
        <div className="space-y-2">
          <h1 className="text-4xl font-black text-zinc-900 dark:text-zinc-50 tracking-tight">{t("errors.notFound")}</h1>
          <p className="text-sm text-zinc-500 leading-relaxed">
            {t("errors.pageNotFound")}
          </p>
        </div>

        <div className="flex gap-4 justify-center">
          <Link
            href="/"
            className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-all shadow-sm cursor-pointer"
          >
            {t("home.backHome")}
          </Link>
        </div>
      </div>
    </div>
  );
}
