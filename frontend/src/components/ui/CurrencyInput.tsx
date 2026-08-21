import React, { useState, useEffect, useRef } from "react";

interface CurrencyInputProps {
  value?: number | null;
  onChange: (value: number | null) => void;
  label?: string;
  placeholder?: string;
  error?: string;
  disabled?: boolean;
  required?: boolean;
  min?: number;
  max?: number;
  className?: string;
}

const formatRupiah = (val: number | null | undefined): string => {
  if (val === null || val === undefined || isNaN(val)) return "";
  return new Intl.NumberFormat("id-ID", { maximumFractionDigits: 0 }).format(val);
};

export const CurrencyInput: React.FC<CurrencyInputProps> = ({
  value,
  onChange,
  label,
  placeholder = "0",
  error,
  disabled = false,
  required = false,
  min,
  max,
  className = "",
}) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const [displayValue, setDisplayValue] = useState("");

  // Sync state with parent component value
  useEffect(() => {
    setDisplayValue(formatRupiah(value));
  }, [value]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    // Strip non-digits
    const rawDigits = e.target.value.replace(/\D/g, "");
    
    // Convert to number
    let numValue = rawDigits === "" ? null : parseInt(rawDigits, 10);

    // Apply min/max bounds if provided
    if (numValue !== null) {
      if (min !== undefined && numValue < min) numValue = min;
      if (max !== undefined && numValue > max) numValue = max;
    }

    // Keep cursor location variables
    const cursor = e.target.selectionStart;
    const oldValLength = e.target.value.length;

    // Trigger parent change callback
    onChange(numValue);

    // Reposition cursor after rendering formatting changes
    setTimeout(() => {
      if (inputRef.current && cursor !== null) {
        const newValLength = inputRef.current.value.length;
        const newCursor = cursor + (newValLength - oldValLength);
        inputRef.current.setSelectionRange(newCursor, newCursor);
      }
    }, 0);
  };

  return (
    <div className={`flex flex-col gap-1 w-full ${className}`}>
      {label && (
        <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
          {label} {required && <span className="text-rose-500">*</span>}
        </label>
      )}

      <div
        className={`flex items-center w-full bg-white dark:bg-zinc-900 border ${
          error
            ? "border-rose-500 focus-within:ring-rose-500/20"
            : "border-zinc-200 dark:border-zinc-800 focus-within:ring-indigo-500/20 focus-within:border-indigo-500 dark:focus-within:border-indigo-400"
        } rounded-xl overflow-hidden transition-all focus-within:ring-2`}
      >
        <span className="px-3 py-2 bg-zinc-50 dark:bg-zinc-800/40 text-zinc-500 dark:text-zinc-400 border-r border-zinc-200 dark:border-zinc-800 text-sm font-medium select-none">
          Rp
        </span>
        <input
          ref={inputRef}
          type="text"
          inputMode="numeric"
          disabled={disabled}
          placeholder={placeholder}
          value={displayValue}
          onChange={handleInputChange}
          className="w-full px-3 py-2 bg-transparent text-sm placeholder-zinc-400 text-zinc-900 dark:text-zinc-100 focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed"
        />
      </div>

      {error && <span className="text-xs text-rose-500 mt-0.5">{error}</span>}
    </div>
  );
};
