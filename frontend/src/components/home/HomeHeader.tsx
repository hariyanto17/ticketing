import React from "react";
import Link from "next/link";
import { ShieldCheck } from "lucide-react";
import { ThemeToggle } from "@/components/ui/ThemeToggle";
import { LanguageToggle } from "@/components/ui/LanguageToggle";

interface HomeHeaderProps {
  t: (key: string) => string;
}

export const HomeHeader: React.FC<HomeHeaderProps> = ({ t }) => {
  return (
    <header className="sticky top-0 z-40 w-full bg-white/85 dark:bg-zinc-900/85 backdrop-blur-md border-b border-zinc-200/80 dark:border-zinc-800 transition-colors">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 h-18 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2">
          <img
            src="/PLANET-CINEMA-LOGO-2-COLOR.png"
            alt="Planet Cinema"
            className="h-9 sm:h-10 w-auto object-contain"
          />
        </Link>

        <div className="flex items-center gap-3">
          <LanguageToggle />
          <ThemeToggle />
          <Link
            href="/login"
            className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-sm"
          >
            <ShieldCheck className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">{t("home.staffLogin")}</span>
          </Link>
        </div>
      </div>
    </header>
  );
};
