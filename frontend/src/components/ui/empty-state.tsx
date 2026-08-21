import React from "react";
import { Info } from "lucide-react";

interface EmptyStateProps {
  title?: string;
  message?: string;
  icon?: React.ReactNode;
}

export function EmptyState({
  title = "No data found",
  message = "Try adjusting your search filters or adding a new record.",
  icon = <Info className="w-12 h-12 text-zinc-400" />,
}: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-12 px-4 border border-dashed border-zinc-200 dark:border-zinc-800 rounded-2xl bg-zinc-50/50 dark:bg-zinc-950/20 text-center">
      <div className="mb-4">{icon}</div>
      <h3 className="text-lg font-semibold text-zinc-800 dark:text-zinc-200 mb-1">
        {title}
      </h3>
      <p className="text-zinc-500 dark:text-zinc-400 max-w-sm text-sm">
        {message}
      </p>
    </div>
  );
}
