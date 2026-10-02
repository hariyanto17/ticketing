"use client";

import React from "react";
import { useTranslation } from "@/lib/i18n";

interface PromotionsFilterBarProps {
  filterType: string;
  setFilterType: (val: string) => void;
  setPage: (page: number) => void;
}

export function PromotionsFilterBar({
  filterType,
  setFilterType,
  setPage,
}: PromotionsFilterBarProps) {
  const { t } = useTranslation();

  return (
    <div className="flex flex-wrap items-center justify-between gap-4">
      <div className="flex items-center gap-3">
        <select
          value={filterType}
          onChange={(e) => {
            setFilterType(e.target.value);
            setPage(1);
          }}
          className="px-3.5 py-2 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl text-sm font-medium text-zinc-800 dark:text-zinc-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
        >
          <option value="">{t("promotions.allTypes") || "Semua Tipe"}</option>
          <option value="BUY_X_GET_Y">{t("promotions.typeBogo") || "Buy 1 Get 1 (BOGO)"}</option>
          <option value="PERCENTAGE">{t("promotions.typePercentage") || "Potongan Persen (%)"}</option>
        </select>
      </div>
    </div>
  );
}
