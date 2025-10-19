/**
 * Quran Language Configuration
 * Defines supported languages for Quran translations
 */

export const SUPPORTED_QURAN_LANGUAGES = ['en', 'sk'] as const;
export type QuranLanguage = typeof SUPPORTED_QURAN_LANGUAGES[number];

export interface LanguageInfo {
  code: QuranLanguage;
  name: string;
  nativeName: string;
  flag: string;
  direction: 'ltr' | 'rtl';
}

export const LANGUAGE_INFO: Record<QuranLanguage, LanguageInfo> = {
  en: {
    code: 'en',
    name: 'English',
    nativeName: 'English',
    flag: '🇬🇧',
    direction: 'ltr'
  },
  sk: {
    code: 'sk',
    name: 'Slovak',
    nativeName: 'Slovenčina',
    flag: '🇸🇰',
    direction: 'ltr'
  }
};

/**
 * Validates if a language code is supported
 */
export function isValidQuranLanguage(lang: string): lang is QuranLanguage {
  return SUPPORTED_QURAN_LANGUAGES.includes(lang as QuranLanguage);
}

/**
 * Gets language from URL search params or browser, with fallback to English
 */
export function getQuranLanguage(searchParams: URLSearchParams): QuranLanguage {
  const urlLang = searchParams.get('lang');
  if (urlLang && isValidQuranLanguage(urlLang)) {
    return urlLang;
  }
  return 'en'; // Default to English
}

/**
 * Gets browser language preference (client-side only)
 */
export function getBrowserLanguage(): QuranLanguage {
  if (typeof window === 'undefined') {
    return 'en';
  }
  
  const browserLang = navigator.language.split('-')[0];
  return isValidQuranLanguage(browserLang) ? browserLang : 'en';
}

/**
 * Gets language display name with flag
 */
export function getLanguageDisplayName(lang: QuranLanguage, showFlag = true): string {
  const info = LANGUAGE_INFO[lang];
  return showFlag ? `${info.flag} ${info.nativeName}` : info.nativeName;
}
