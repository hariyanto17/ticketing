import id from "./id";
import en from "./en";

export type Locale = "id" | "en";
export const defaultLocale: Locale = "id";

export const translations = {
  id,
  en,
};

export type TranslationDictionary = typeof id;
