import React from "react";
import { Armchair, QrCode, Ticket } from "lucide-react";

interface HomeFeaturesSectionProps {
  t: (key: string) => string;
}

export const HomeFeaturesSection: React.FC<HomeFeaturesSectionProps> = ({ t }) => {
  return (
    <section className="pt-12 border-t border-zinc-200 dark:border-zinc-800 space-y-8">
      <div className="text-center max-w-2xl mx-auto space-y-2">
        <span className="text-xs font-black uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
          Planet Cinema Experience
        </span>
        <h2 className="text-2xl sm:text-3xl font-black tracking-tight text-zinc-900 dark:text-zinc-50">
          {t("home.features.title")}
        </h2>
        <p className="text-sm text-zinc-500 dark:text-zinc-400">
          {t("home.features.subtitle")}
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="p-6 bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800 rounded-3xl shadow-sm space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 border border-indigo-200/80 dark:border-indigo-800/60 flex items-center justify-center">
            <Armchair className="w-6 h-6" />
          </div>
          <h3 className="text-lg font-bold text-zinc-900 dark:text-zinc-50">
            {t("home.features.feature1Title")}
          </h3>
          <p className="text-sm text-zinc-500 dark:text-zinc-400 leading-relaxed">
            {t("home.features.feature1Desc")}
          </p>
        </div>

        <div className="p-6 bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800 rounded-3xl shadow-sm space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 border border-emerald-200/80 dark:border-emerald-800/60 flex items-center justify-center">
            <QrCode className="w-6 h-6" />
          </div>
          <h3 className="text-lg font-bold text-zinc-900 dark:text-zinc-50">
            {t("home.features.feature2Title")}
          </h3>
          <p className="text-sm text-zinc-500 dark:text-zinc-400 leading-relaxed">
            {t("home.features.feature2Desc")}
          </p>
        </div>

        <div className="p-6 bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800 rounded-3xl shadow-sm space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 border border-amber-200/80 dark:border-amber-800/60 flex items-center justify-center">
            <Ticket className="w-6 h-6" />
          </div>
          <h3 className="text-lg font-bold text-zinc-900 dark:text-zinc-50">
            {t("home.features.feature3Title")}
          </h3>
          <p className="text-sm text-zinc-500 dark:text-zinc-400 leading-relaxed">
            {t("home.features.feature3Desc")}
          </p>
        </div>
      </div>
    </section>
  );
};
