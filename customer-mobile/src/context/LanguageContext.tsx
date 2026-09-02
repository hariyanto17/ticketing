import React, { createContext, useContext, useState, useEffect } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Locale, defaultLocale, translations } from "../locales";

interface LanguageContextType {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  toggleLocale: () => void;
  t: (path: string, fallback?: string) => string;
  formatCurrency: (amount: number) => string;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

const LANGUAGE_STORAGE_KEY = "planet_cinema_language";

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [locale, setLocaleState] = useState<Locale>(defaultLocale); // Default Indonesian

  useEffect(() => {
    AsyncStorage.getItem(LANGUAGE_STORAGE_KEY).then((stored) => {
      if (stored === "id" || stored === "en") {
        setLocaleState(stored);
      }
    });
  }, []);

  const setLocale = (newLocale: Locale) => {
    setLocaleState(newLocale);
    AsyncStorage.setItem(LANGUAGE_STORAGE_KEY, newLocale);
  };

  const toggleLocale = () => {
    const next = locale === "id" ? "en" : "id";
    setLocale(next);
  };

  const t = (path: string, fallback?: string): string => {
    const dict = translations[locale] as any;
    const segments = path.split(".");
    let current = dict;

    for (const segment of segments) {
      if (current && typeof current === "object" && segment in current) {
        current = current[segment];
      } else {
        return fallback || path;
      }
    }

    return typeof current === "string" ? current : fallback || path;
  };

  const formatCurrency = (amount: number): string => {
    return `Rp ${amount.toLocaleString("id-ID")}`;
  };

  return (
    <LanguageContext.Provider
      value={{
        locale,
        setLocale,
        toggleLocale,
        t,
        formatCurrency,
      }}
    >
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error("useLanguage must be used within a LanguageProvider");
  }
  return context;
};
