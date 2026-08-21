import React from "react";
import { Search, ChevronLeft, ChevronRight } from "lucide-react";
import { Spinner } from "./spinner";
import { EmptyState } from "./empty-state";

// --- Search Input Component ---
interface SearchInputProps extends React.ComponentPropsWithoutRef<"input"> {
  onSearchChange: (value: string) => void;
}

export function SearchInput({ onSearchChange, className = "", ...props }: SearchInputProps) {
  return (
    <div className={`relative w-full max-w-sm ${className}`}>
      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
      <input
        type="text"
        onChange={(e) => onSearchChange(e.target.value)}
        className="w-full pl-9 pr-4 py-2 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl text-sm placeholder-zinc-400 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 dark:focus:border-indigo-400 transition-all"
        {...props}
      />
    </div>
  );
}

// --- Pagination Component ---
interface PaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}

export function Pagination({ currentPage, totalPages, onPageChange }: PaginationProps) {
  if (totalPages <= 1) return null;

  return (
    <div className="flex items-center justify-between py-4 border-t border-zinc-100 dark:border-zinc-800">
      <div className="text-sm text-zinc-500 dark:text-zinc-400">
        Page <span className="font-semibold text-zinc-700 dark:text-zinc-300">{currentPage}</span> of{" "}
        <span className="font-semibold text-zinc-700 dark:text-zinc-300">{totalPages}</span>
      </div>
      <div className="flex gap-2">
        <button
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage === 1}
          className="p-1.5 border border-zinc-200 dark:border-zinc-800 rounded-lg hover:bg-zinc-50 dark:hover:bg-zinc-800/50 disabled:opacity-40 disabled:pointer-events-none transition-colors"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>
        <button
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage === totalPages}
          className="p-1.5 border border-zinc-200 dark:border-zinc-800 rounded-lg hover:bg-zinc-50 dark:hover:bg-zinc-800/50 disabled:opacity-40 disabled:pointer-events-none transition-colors"
        >
          <ChevronRight className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
}

// --- Generic Data Table Component ---
interface Column<T> {
  key: string;
  header: string;
  render?: (item: T) => React.ReactNode;
}

interface DataTableProps<T> {
  columns: Column<T>[];
  data: T[];
  isLoading?: boolean;
  searchPlaceholder?: string;
  onSearch?: (value: string) => void;
  // Optional pagination props
  pagination?: {
    currentPage: number;
    totalPages: number;
    onPageChange: (page: number) => void;
  };
}

export function DataTable<T extends { id: string | number }>({
  columns,
  data,
  isLoading = false,
  searchPlaceholder = "Search...",
  onSearch,
  pagination,
}: DataTableProps<T>) {
  return (
    <div className="flex flex-col gap-4 w-full">
      {/* Top Controls */}
      {onSearch && (
        <div className="flex items-center justify-between gap-4">
          <SearchInput onSearchChange={onSearch} placeholder={searchPlaceholder} />
        </div>
      )}

      {/* Table Container */}
      <div className="w-full border border-zinc-200 dark:border-zinc-800 rounded-2xl overflow-hidden bg-white dark:bg-zinc-950">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-sm">
            <thead>
              <tr className="bg-zinc-50 dark:bg-zinc-900 border-b border-zinc-150 dark:border-zinc-800">
                {columns.map((col) => (
                  <th
                    key={col.key}
                    className="px-6 py-4 font-semibold text-zinc-600 dark:text-zinc-400 select-none"
                  >
                    {col.header}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
              {isLoading ? (
                <tr>
                  <td colSpan={columns.length} className="px-6 py-16 text-center">
                    <div className="flex flex-col items-center gap-3">
                      <Spinner className="w-8 h-8" />
                      <span className="text-zinc-500 dark:text-zinc-400">Loading records...</span>
                    </div>
                  </td>
                </tr>
              ) : data.length === 0 ? (
                <tr>
                  <td colSpan={columns.length} className="px-6 py-8">
                    <EmptyState />
                  </td>
                </tr>
              ) : (
                data.map((item) => (
                  <tr
                    key={item.id}
                    className="hover:bg-zinc-50/50 dark:hover:bg-zinc-900/30 transition-colors"
                  >
                    {columns.map((col) => (
                      <td
                        key={col.key}
                        className="px-6 py-4 text-zinc-700 dark:text-zinc-300 font-medium"
                      >
                        {col.render ? col.render(item) : (item as any)[col.key]}
                      </td>
                    ))}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pagination */}
      {pagination && !isLoading && data.length > 0 && (
        <Pagination
          currentPage={pagination.currentPage}
          totalPages={pagination.totalPages}
          onPageChange={pagination.onPageChange}
        />
      )}
    </div>
  );
}
