"use client";

import React from "react";
import { ArrowUpRight, ArrowDownRight, ThumbsUp, Eye, TrendingUp, TrendingDown, Minus } from "lucide-react";
import { useTranslation } from "@/lib/i18n";

interface RecommendationProps {
  action?: string;
  label?: string;
  reason?: string;
}

export const RecommendationBadge: React.FC<{ recommendation?: RecommendationProps }> = ({ recommendation }) => {
  const { t } = useTranslation();
  if (!recommendation) return null;

  const action = recommendation.action;
  let translatedLabel = recommendation.label;
  if (action === "INCREASE") translatedLabel = t("analytics.recIncrease");
  else if (action === "REDUCE") translatedLabel = t("analytics.recReduce");
  else if (action === "MAINTAIN") translatedLabel = t("analytics.recMaintain");
  else if (action === "MONITOR") translatedLabel = t("analytics.recMonitor");

  switch (action) {
    case "INCREASE":
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-xs font-bold bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800">
          <ArrowUpRight className="w-3.5 h-3.5" />
          {translatedLabel}
        </span>
      );
    case "REDUCE":
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-xs font-bold bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-400 border border-rose-200 dark:border-rose-800">
          <ArrowDownRight className="w-3.5 h-3.5" />
          {translatedLabel}
        </span>
      );
    case "MAINTAIN":
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-xs font-bold bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-400 border border-blue-200 dark:border-blue-800">
          <ThumbsUp className="w-3.5 h-3.5" />
          {translatedLabel}
        </span>
      );
    default:
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-xs font-bold bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-800">
          <Eye className="w-3.5 h-3.5" />
          {translatedLabel}
        </span>
      );
  }
};

interface MomentumProps {
  direction?: string;
  label?: string;
  growthPercentage?: number;
}

export const MomentumBadge: React.FC<{ momentum?: MomentumProps }> = ({ momentum }) => {
  const { t } = useTranslation();
  if (!momentum || momentum.direction === "NONE" || !momentum.direction) {
    return (
      <span className="inline-flex items-center gap-1 text-xs text-zinc-400">
        <Minus className="w-3.5 h-3.5" />
        {t("analytics.momNone")}
      </span>
    );
  }

  const growth = momentum.growthPercentage || 0;
  const isPos = growth > 0;
  const sign = isPos ? "+" : "";

  let translatedLabel = momentum.label;
  if (momentum.direction === "UP") translatedLabel = t("analytics.momUp");
  else if (momentum.direction === "SLIGHT_UP") translatedLabel = t("analytics.momSlightUp");
  else if (momentum.direction === "STABLE") translatedLabel = t("analytics.momStable");
  else if (momentum.direction === "SLIGHT_DOWN") translatedLabel = t("analytics.momSlightDown");
  else if (momentum.direction === "DOWN") translatedLabel = t("analytics.momDown");

  if (momentum.direction === "UP" || momentum.direction === "SLIGHT_UP") {
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/60">
        <TrendingUp className="w-3.5 h-3.5" />
        {sign}
        {growth}% {translatedLabel}
      </span>
    );
  }
  if (momentum.direction === "DOWN" || momentum.direction === "SLIGHT_DOWN") {
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-800/60">
        <TrendingDown className="w-3.5 h-3.5" />
        {sign}
        {growth}% {translatedLabel}
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 border border-zinc-200 dark:border-zinc-700">
      <Minus className="w-3.5 h-3.5" />
      {sign}
      {growth}% {translatedLabel}
    </span>
  );
};

interface HealthScoreProps {
  score: number;
  status: string;
  label: string;
}

export const HealthScoreBadge: React.FC<{ healthScore?: HealthScoreProps }> = ({ healthScore }) => {
  const { t } = useTranslation();
  if (!healthScore) return null;

  let colorClass = "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300";
  let translatedStatus = healthScore.label;

  if (healthScore.status === "STRONG") {
    colorClass = "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800";
    translatedStatus = t("analytics.hsStrong");
  } else if (healthScore.status === "NORMAL") {
    colorClass = "bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-950/40 dark:text-indigo-300 dark:border-indigo-800";
    translatedStatus = t("analytics.hsNormal");
  } else if (healthScore.status === "WEAK") {
    colorClass = "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800";
    translatedStatus = t("analytics.hsWeak");
  } else {
    colorClass = "bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800";
    translatedStatus = t("analytics.hsCritical");
  }

  return (
    <div className="flex items-center gap-1.5">
      <span className={`px-2 py-0.5 rounded-lg text-xs font-extrabold border ${colorClass}`}>
        {healthScore.score}
      </span>
      <span className="text-[11px] font-medium text-zinc-400">{translatedStatus}</span>
    </div>
  );
};
