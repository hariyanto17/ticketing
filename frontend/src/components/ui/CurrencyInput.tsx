import React, { useState, useEffect, useRef } from "react";

interface CurrencyInputProps {
  id?: string;
  name?: string;
  value?: number | string | null;
  onChange: (value: number) => void;
  label?: string;
  placeholder?: string;
  error?: string;
  disabled?: boolean;
  required?: boolean;
  min?: number;
  max?: number;
  className?: string;
  inputClassName?: string;
}

const formatRupiah = (val: number | string | null | undefined): string => {
  if (val === null || val === undefined || val === "" || val === 0) return "";
  const num = typeof val === "string" ? parseInt(val.replace(/\D/g, ""), 10) : val;
  if (isNaN(num) || num === 0) return "";
  return new Intl.NumberFormat("id-ID", { maximumFractionDigits: 0 }).format(num);
};

export const CurrencyInput: React.FC<CurrencyInputProps> = ({
  id,
  name,
  value,
  onChange,
  label,
  placeholder = "100.000",
  error,
  disabled = false,
  required = false,
  min,
  max,
  className = "",
  inputClassName = "",
}) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const [displayValue, setDisplayValue] = useState("");

  useEffect(() => {
    setDisplayValue(formatRupiah(value));
  }, [value]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawDigits = e.target.value.replace(/\D/g, "");
    let numValue = rawDigits === "" ? 0 : parseInt(rawDigits, 10);

    if (min !== undefined && numValue < min) numValue = min;
    if (max !== undefined && numValue > max) numValue = max;

    const cursor = e.target.selectionStart;
    const oldValLength = e.target.value.length;

    onChange(numValue);

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
        <label className="text-xs font-bold text-zinc-600 dark:text-zinc-400 uppercase tracking-wider">
          {label} {required && <span className="text-rose-500">*</span>}
        </label>
      )}

      <div
        className={`flex items-center w-full bg-zinc-50 dark:bg-zinc-950 border ${
          error
            ? "border-rose-500 focus-within:ring-rose-500/20"
            : "border-zinc-200 dark:border-zinc-800 focus-within:ring-indigo-500/20 focus-within:border-indigo-500 dark:focus-within:border-indigo-400"
        } rounded-xl overflow-hidden transition-all focus-within:ring-2`}
      >
        <span className="px-3.5 py-2.5 bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 font-bold border-r border-zinc-200 dark:border-zinc-800 text-sm select-none">
          Rp
        </span>
        <input
          ref={inputRef}
          id={id}
          name={name}
          type="text"
          inputMode="numeric"
          disabled={disabled}
          placeholder={placeholder}
          value={displayValue}
          onChange={handleInputChange}
          className={`w-full px-3 py-2.5 bg-transparent font-bold text-zinc-900 dark:text-zinc-50 placeholder-zinc-400 focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed ${inputClassName}`}
        />
      </div>

      {error && <span className="text-xs text-rose-500 mt-0.5">{error}</span>}
    </div>
  );
};
