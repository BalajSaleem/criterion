export const SUPPORTED_QURAN_LANGUAGES = ["en", "sk"] as const;
export type QuranLanguage = (typeof SUPPORTED_QURAN_LANGUAGES)[number];

export const LANGUAGE_NAMES: Record<
  QuranLanguage,
  { native: string; english: string; flag: string; translator?: string }
> = {
  en: { native: "English", english: "English", flag: "🇬🇧" },
  sk: { native: "Slovenčina", english: "Slovak", flag: "🇸🇰", translator: "Al-Sbenaty" },
};

export function isValidQuranLanguage(lang: unknown): lang is QuranLanguage {
  return (
    typeof lang === "string" &&
    SUPPORTED_QURAN_LANGUAGES.includes(lang as QuranLanguage)
  );
}

export function getQuranLanguageFromParam(
  param: string | string[] | undefined
): QuranLanguage {
  if (typeof param === "string" && isValidQuranLanguage(param)) {
    return param;
  }
  return "en"; // Default to English
}
