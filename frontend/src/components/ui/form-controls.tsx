import React, { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { ChevronDown, Search, X } from "lucide-react";

interface InputProps extends React.ComponentPropsWithRef<"input"> {
  label?: string;
  error?: string;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, className = "", ...props }, ref) => {
    return (
      <div className="flex flex-col gap-1 w-full">
        {label && (
          <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
            {label}
          </label>
        )}
        <input
          ref={ref}
          className={`w-full px-3 py-2 bg-white dark:bg-zinc-900 border ${
            error
              ? "border-rose-500 focus:ring-rose-500/20"
              : "border-zinc-200 dark:border-zinc-800 focus:ring-indigo-500/20"
          } rounded-xl text-sm placeholder-zinc-400 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:border-indigo-500 dark:focus:border-indigo-400 transition-all ${className}`}
          {...props}
        />
        {error && (
          <span className="text-xs text-rose-500 mt-0.5">{error}</span>
        )}
      </div>
    );
  }
);
Input.displayName = "Input";

interface SelectProps extends React.ComponentPropsWithRef<"select"> {
  label?: string;
  error?: string;
  options: { value: string; label: string }[];
}

export const Select = React.forwardRef<HTMLSelectElement, SelectProps>(
  ({ label, error, options, className = "", ...props }, ref) => {
    return (
      <div className="flex flex-col gap-1 w-full">
        {label && (
          <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
            {label}
          </label>
        )}
        <select
          ref={ref}
          className={`w-full px-3 py-2 bg-white dark:bg-zinc-900 border ${
            error
              ? "border-rose-500 focus:ring-rose-500/20"
              : "border-zinc-200 dark:border-zinc-800 focus:ring-indigo-500/20"
          } rounded-xl text-sm text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:border-indigo-500 dark:focus:border-indigo-400 transition-all ${className}`}
          {...props}
        >
          {options.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
        {error && (
          <span className="text-xs text-rose-500 mt-0.5">{error}</span>
        )}
      </div>
    );
  }
);
Select.displayName = "Select";

export interface SearchableSelectOption {
  value: string;
  label: string;
  searchText?: string;
  disabled?: boolean;
}

interface SearchableSelectProps {
  label?: string;
  error?: string;
  value?: string;
  onChange?: (value: string) => void;
  options: SearchableSelectOption[];
  placeholder?: string;
  searchPlaceholder?: string;
  disabled?: boolean;
  clearable?: boolean;
  isLoading?: boolean;
  className?: string;
}

export const SearchableSelect = React.forwardRef<HTMLDivElement, SearchableSelectProps>(
  (
    {
      label,
      error,
      value = "",
      onChange,
      options,
      placeholder = "Select option",
      searchPlaceholder = "Search...",
      disabled = false,
      clearable = true,
      isLoading = false,
      className = "",
    },
    ref
  ) => {
    const [isOpen, setIsOpen] = useState(false);
    const [searchQuery, setSearchQuery] = useState("");
    const [activeIndex, setActiveIndex] = useState(-1);
    const [coords, setCoords] = useState({ top: 0, left: 0, width: 0 });

    const triggerRef = useRef<HTMLButtonElement>(null);
    const searchInputRef = useRef<HTMLInputElement>(null);

    const selectedOption = options.find((option) => option.value === value);

    const filteredOptions = options.filter((option) => {
      if (option.disabled) return false;
      if (!searchQuery.trim()) return true;

      const query = searchQuery.toLowerCase();
      const labelMatch = option.label.toLowerCase().includes(query);
      const searchTextMatch = option.searchText?.toLowerCase().includes(query) ?? false;
      return labelMatch || searchTextMatch;
    });

    useEffect(() => {
      if (!isOpen) {
        setSearchQuery("");
        setActiveIndex(-1);
        return;
      }

      const updatePosition = () => {
        const rect = triggerRef.current?.getBoundingClientRect();
        if (!rect) return;

        const menuWidth = Math.max(rect.width, 260);
        const menuHeight = 280;

        let left = rect.left;
        if (left + menuWidth > window.innerWidth - 16) {
          left = Math.max(16, window.innerWidth - menuWidth - 16);
        }

        let top = rect.bottom + 8;
        if (top + menuHeight > window.innerHeight - 16) {
          top = rect.top - menuHeight - 8;
        }

        setCoords({
          top: Math.max(16, top + window.scrollY),
          left: Math.max(16, left + window.scrollX),
          width: rect.width,
        });
      };

      updatePosition();
      window.addEventListener("resize", updatePosition);
      window.addEventListener("scroll", updatePosition, true);

      return () => {
        window.removeEventListener("resize", updatePosition);
        window.removeEventListener("scroll", updatePosition, true);
      };
    }, [isOpen]);

    useEffect(() => {
      if (isOpen) {
        const timer = window.setTimeout(() => searchInputRef.current?.focus(), 50);
        return () => window.clearTimeout(timer);
      }
    }, [isOpen]);

    useEffect(() => {
      const handleClickOutside = (event: MouseEvent) => {
        const target = event.target as Node;
        if (!triggerRef.current?.contains(target)) {
          const portalTarget = document.getElementById("searchable-select-portal");
          if (!portalTarget?.contains(target)) {
            setIsOpen(false);
          }
        }
      };

      if (isOpen) {
        document.addEventListener("mousedown", handleClickOutside);
      }

      return () => {
        document.removeEventListener("mousedown", handleClickOutside);
      };
    }, [isOpen]);

    const handleSelect = (nextValue: string) => {
      onChange?.(nextValue);
      setIsOpen(false);
      setSearchQuery("");
      setActiveIndex(-1);
    };

    const handleClear = (event: React.MouseEvent) => {
      event.stopPropagation();
      onChange?.("");
      setIsOpen(false);
    };

    const handleKeyDown = (event: React.KeyboardEvent<HTMLButtonElement | HTMLInputElement>) => {
      if (disabled) return;

      if (!isOpen) {
        if (event.key === "Enter" || event.key === "ArrowDown" || event.key === "ArrowUp") {
          event.preventDefault();
          setIsOpen(true);
        }
        return;
      }

      switch (event.key) {
        case "Escape":
          event.preventDefault();
          setIsOpen(false);
          break;
        case "ArrowDown":
          event.preventDefault();
          setActiveIndex((prev) => (prev + 1 < filteredOptions.length ? prev + 1 : 0));
          break;
        case "ArrowUp":
          event.preventDefault();
          setActiveIndex((prev) => (prev - 1 >= 0 ? prev - 1 : filteredOptions.length - 1));
          break;
        case "Enter": {
          event.preventDefault();
          if (activeIndex >= 0 && activeIndex < filteredOptions.length) {
            handleSelect(filteredOptions[activeIndex].value);
          } else if (filteredOptions.length === 1) {
            handleSelect(filteredOptions[0].value);
          }
          break;
        }
        case "Tab":
          setIsOpen(false);
          break;
        default:
          break;
      }
    };

    const dropdown = isOpen
      ? createPortal(
          <div
            id="searchable-select-portal"
            className="fixed z-[100] rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 shadow-2xl"
            style={{ top: coords.top, left: coords.left, width: coords.width }}
          >
            <div className="flex items-center gap-2 border-b border-zinc-200 dark:border-zinc-800 px-3 py-2">
              <Search className="h-4 w-4 text-zinc-400" />
              <input
                ref={searchInputRef}
                type="text"
                value={searchQuery}
                onChange={(event) => {
                  setSearchQuery(event.target.value);
                  setActiveIndex(-1);
                }}
                onKeyDown={handleKeyDown}
                placeholder={searchPlaceholder}
                className="w-full border-0 bg-transparent text-sm text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 focus:outline-none"
              />
            </div>

            <ul className="max-h-60 overflow-y-auto py-1">
              {isLoading ? (
                <li className="px-3 py-2 text-sm text-zinc-500 italic">Loading...</li>
              ) : options.length === 0 ? (
                <li className="px-3 py-2 text-sm text-zinc-500 italic">No options available</li>
              ) : filteredOptions.length === 0 ? (
                <li className="px-3 py-2 text-sm text-zinc-500 italic">No match found</li>
              ) : (
                filteredOptions.map((option, index) => {
                  const isSelected = option.value === value;
                  const isActive = index === activeIndex;

                  return (
                    <li
                      key={option.value}
                      role="option"
                      aria-selected={isSelected}
                      onClick={() => handleSelect(option.value)}
                      className={`cursor-pointer select-none px-3 py-2 text-sm transition-colors ${
                        isSelected
                          ? "bg-indigo-50 text-indigo-700 dark:bg-indigo-950/40 dark:text-indigo-300"
                          : isActive
                            ? "bg-zinc-100 text-zinc-900 dark:bg-zinc-800 dark:text-zinc-100"
                            : "text-zinc-700 hover:bg-zinc-100 dark:text-zinc-200 dark:hover:bg-zinc-800"
                      }`}
                    >
                      {option.label}
                    </li>
                  );
                })
              )}
            </ul>
          </div>,
          document.body
        )
      : null;

    return (
      <div ref={ref} className={`flex w-full flex-col gap-1 ${className}`}>
        {label && (
          <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">{label}</label>
        )}

        <div className="relative w-full">
          <button
            ref={triggerRef}
            type="button"
            disabled={disabled}
            onClick={() => !disabled && setIsOpen((current) => !current)}
            onKeyDown={handleKeyDown}
            aria-expanded={isOpen}
            aria-haspopup="listbox"
            className={`flex w-full items-center justify-between rounded-xl border bg-white px-3 py-2 text-left text-sm transition-all focus:outline-none focus:ring-2 ${
              error
                ? "border-rose-500 focus:ring-rose-500/20"
                : "border-zinc-200 dark:border-zinc-800 focus:ring-indigo-500/20 dark:bg-zinc-900"
            } ${disabled ? "cursor-not-allowed opacity-60" : "cursor-pointer"}`}
          >
            <span className={selectedOption ? "text-zinc-900 dark:text-zinc-100" : "text-zinc-400"}>
              {selectedOption ? selectedOption.label : placeholder}
            </span>

            <div className="flex items-center gap-2">
              {clearable && selectedOption && !disabled && (
                <span
                  onClick={handleClear}
                  className="flex h-5 w-5 items-center justify-center rounded-md text-zinc-400 transition-colors hover:bg-zinc-100 hover:text-zinc-700 dark:hover:bg-zinc-800 dark:hover:text-zinc-200"
                  aria-label="Clear selection"
                  role="button"
                >
                  <X className="h-3.5 w-3.5" />
                </span>
              )}

              <ChevronDown className={`h-4 w-4 text-zinc-400 transition-transform ${isOpen ? "rotate-180" : ""}`} />
            </div>
          </button>
        </div>

        {error && <span className="text-xs text-rose-500 mt-0.5">{error}</span>}

        {dropdown}
      </div>
    );
  }
);
SearchableSelect.displayName = "SearchableSelect";

interface ButtonProps extends React.ComponentPropsWithRef<"button"> {
  variant?: "primary" | "secondary" | "danger" | "ghost";
  isLoading?: boolean;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = "primary", isLoading, className = "", children, ...props }, ref) => {
    const baseStyle =
      "inline-flex items-center justify-center px-4 py-2 text-sm font-medium rounded-xl transition-all focus:outline-none disabled:opacity-50 disabled:pointer-events-none cursor-pointer";
    const variants = {
      primary: "bg-indigo-600 hover:bg-indigo-700 text-white shadow-xs",
      secondary:
        "border border-zinc-200 dark:border-zinc-800 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800/50",
      danger: "bg-rose-600 hover:bg-rose-700 text-white shadow-xs",
      ghost: "text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800",
    };

    return (
      <button
        ref={ref}
        className={`${baseStyle} ${variants[variant]} ${className}`}
        disabled={isLoading || props.disabled}
        {...props}
      >
        {isLoading ? "Loading..." : children}
      </button>
    );
  }
);
Button.displayName = "Button";
