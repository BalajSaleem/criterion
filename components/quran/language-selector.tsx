"use client";

import { useEffect } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { LANGUAGE_NAMES, type QuranLanguage } from "@/lib/quran-language";

const LANGUAGE_STORAGE_KEY = "quran-preferred-language";

interface LanguageSelectorProps {
  currentLanguage?: QuranLanguage;
  className?: string;
}

export function LanguageSelector({
  currentLanguage = "en",
  className,
}: LanguageSelectorProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // Apply stored language preference on mount if no URL param exists
  useEffect(() => {
    if (!searchParams.has("lang")) {
      const stored = localStorage.getItem(LANGUAGE_STORAGE_KEY) as QuranLanguage | null;
      if (stored && stored !== "en") {
        const params = new URLSearchParams(searchParams);
        params.set("lang", stored);
        const queryString = params.toString();
        const newUrl = queryString ? `${pathname}?${queryString}` : pathname;
        router.replace(newUrl, { scroll: false });
      }
    }
  }, []); // Only run on mount

  const handleLanguageChange = (language: QuranLanguage) => {
    const params = new URLSearchParams(searchParams);

    // Save preference to localStorage
    localStorage.setItem(LANGUAGE_STORAGE_KEY, language);

    // Default to English, so remove param if English is selected
    if (language === "en") {
      params.delete("lang");
    } else {
      params.set("lang", language);
    }

    // Preserve other params (like context)
    const queryString = params.toString();
    const newUrl = queryString ? `${pathname}?${queryString}` : pathname;

    router.replace(newUrl);
  };

  return (
    <Select value={currentLanguage} onValueChange={handleLanguageChange}>
      <SelectTrigger className={className}>
        <SelectValue>
          <span className="flex items-center gap-2">
            <span>{LANGUAGE_NAMES[currentLanguage].flag}</span>
            <span>{LANGUAGE_NAMES[currentLanguage].native}</span>
          </span>
        </SelectValue>
      </SelectTrigger>
      <SelectContent>
        {Object.entries(LANGUAGE_NAMES).map(([code, { flag, native, translator }]) => (
          <SelectItem key={code} value={code}>
            <span className="flex items-center gap-2">
              <span>{flag}</span>
              <span>{native}</span>
              {translator && (
                <span className="text-xs text-muted-foreground">· {translator}</span>
              )}
            </span>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
