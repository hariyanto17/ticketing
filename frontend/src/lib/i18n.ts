"use client";

import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import { defaultLocale, getLocaleLabel, localeOptions, locales, type Locale, type TranslationDictionary } from "@/locales";

const STORAGE_KEY = "language";

interface LanguageContextType {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  t: (key: string, paramsOrFallback?: Record<string, any> | string, fallback?: string) => string;
  formatDate: (value: string | Date, options?: Intl.DateTimeFormatOptions) => string;
  formatNumber: (value: number, options?: Intl.NumberFormatOptions) => string;
  formatCurrency: (value: number, options?: Intl.NumberFormatOptions) => string;
  localeLabel: string;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

function getNestedValue(obj: Record<string, any>, key: string): string | undefined {
  const segments = key.split(".");
  let current: any = obj;

  for (const segment of segments) {
    if (current == null || typeof current !== "object" || !(segment in current)) {
      return undefined;
    }
    current = current[segment];
  }

  return typeof current === "string" ? current : undefined;
}

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>(defaultLocale);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const savedLocale = window.localStorage.getItem(STORAGE_KEY) as Locale | null;
    if (savedLocale === "id" || savedLocale === "en") {
      setLocaleState(savedLocale);
      return;
    }

    setLocaleState(defaultLocale);
  }, []);

  useEffect(() => {
    if (typeof window !== "undefined") {
      window.localStorage.setItem(STORAGE_KEY, locale);
      document.documentElement.lang = locale;
    }
  }, [locale]);

  const setLocale = (nextLocale: Locale) => {
    setLocaleState(nextLocale);
    if (typeof window !== "undefined") {
      window.localStorage.setItem(STORAGE_KEY, nextLocale);
    }
  };

  const t = (key: string, paramsOrFallback?: Record<string, any> | string, fallback?: string) => {
    const dictionary = locales[locale] as TranslationDictionary;
    let value = getNestedValue(dictionary as any, key);
    if (!value) {
      if (typeof paramsOrFallback === "string") return paramsOrFallback;
      return fallback ?? key;
    }
    if (paramsOrFallback && typeof paramsOrFallback === "object") {
      Object.entries(paramsOrFallback).forEach(([k, v]) => {
        value = (value as string).replace(new RegExp(`\\{${k}\\}`, "g"), String(v));
      });
    }
    return value;
  };

  const formatDate = (value: string | Date, options?: Intl.DateTimeFormatOptions) => {
    const dateValue = value instanceof Date ? value : new Date(value);
    if (isNaN(dateValue.getTime())) return String(value);
    if (!options) {
      return formatDateDMY(dateValue);
    }
    return new Intl.DateTimeFormat(locale === "id" ? "id-ID" : "en-US", options).format(dateValue);
  };

  const formatNumber = (value: number, options?: Intl.NumberFormatOptions) =>
    new Intl.NumberFormat(locale === "id" ? "id-ID" : "en-US", options).format(value);

  const formatCurrency = (value: number, options?: Intl.NumberFormatOptions) =>
    new Intl.NumberFormat(locale === "id" ? "id-ID" : "en-US", {
      style: "currency",
      currency: "IDR",
      ...options,
    }).format(value);

  const localeLabel = useMemo(() => getLocaleLabel(locale), [locale]);

  return React.createElement(
    LanguageContext.Provider,
    {
      value: { locale, setLocale, t, formatDate, formatNumber, formatCurrency, localeLabel },
    },
    children
  );
}

export function useTranslation() {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error("useTranslation must be used within a LanguageProvider");
  }
  return context;
}

export function formatDateDMY(value: string | Date | null | undefined): string {
  if (!value) return "-";
  const dateValue = value instanceof Date ? value : new Date(value);
  if (isNaN(dateValue.getTime())) return String(value);
  const day = String(dateValue.getDate()).padStart(2, "0");
  const month = String(dateValue.getMonth() + 1).padStart(2, "0");
  const year = dateValue.getFullYear();
  return `${day}/${month}/${year}`;
}

export function formatDateTimeDMY(value: string | Date | null | undefined): string {
  if (!value) return "-";
  const dateValue = value instanceof Date ? value : new Date(value);
  if (isNaN(dateValue.getTime())) return String(value);
  const day = String(dateValue.getDate()).padStart(2, "0");
  const month = String(dateValue.getMonth() + 1).padStart(2, "0");
  const year = dateValue.getFullYear();
  const hours = String(dateValue.getHours()).padStart(2, "0");
  const minutes = String(dateValue.getMinutes()).padStart(2, "0");
  return `${day}/${month}/${year} ${hours}:${minutes}`;
}

export { localeOptions, defaultLocale, type Locale };
