"use client";

import { BookOpenIcon, SparklesIcon } from "lucide-react";
import type { ComponentProps } from "react";
import { useEffect, useState } from "react";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
  type CarouselApi,
} from "@/components/ui/carousel";
import { cn } from "@/lib/utils";

type VerseData = {
  reference: string;
  surahArabic: string;
  arabic: string;
  english: string;
  relevance: string;
  rank: number;
  hasContext?: boolean;
  passageRange?: string;
  contextBefore?: string | null;
  contextAfter?: string | null;
};

type QuranVersesOutput =
  | {
      success: true;
      totalVerses: number;
      topThreeWithContext: number;
      verses: VerseData[];
    }
  | {
      success: false;
      message: string;
    };

export type QuranVersesProps = ComponentProps<"div"> & {
  output: QuranVersesOutput;
};

export const QuranVerses = ({
  className,
  output,
  ...props
}: QuranVersesProps) => {
  const [api, setApi] = useState<CarouselApi>();
  const [current, setCurrent] = useState(0);

  useEffect(() => {
    if (!api) {
      return;
    }

    setCurrent(api.selectedScrollSnap());

    api.on("select", () => {
      setCurrent(api.selectedScrollSnap());
    });
  }, [api]);

  if (!output.success) {
    return (
      <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-amber-800 dark:border-amber-800 dark:bg-amber-950/30 dark:text-amber-200">
        <p className="text-sm">{output.message || "No relevant verses found."}</p>
      </div>
    );
  }

  if (!output.verses || output.verses.length === 0) {
    return (
      <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-amber-800 dark:border-amber-800 dark:bg-amber-950/30 dark:text-amber-200">
        <p className="text-sm">No relevant verses found.</p>
      </div>
    );
  }

  // Calculate total verses including context
  // Top 3 verses each have 1 main + up to 5 before + up to 5 after (11 max each)
  // Remaining verses are just the main verse (1 each)
  const topThreeVersesWithContext = output.verses.slice(0, 3);
  const remainingVerses = output.verses.slice(3);
  
  let totalVerseCount = 0;
  
  // Count verses with context (top 3)
  topThreeVersesWithContext.forEach((verse) => {
    if (verse.hasContext) {
      const beforeCount = verse.contextBefore ? verse.contextBefore.split("\n").length : 0;
      const afterCount = verse.contextAfter ? verse.contextAfter.split("\n").length : 0;
      totalVerseCount += 1 + beforeCount + afterCount; // main verse + context
    } else {
      totalVerseCount += 1; // just the main verse
    }
  });
  
  // Count remaining verses (no context)
  totalVerseCount += remainingVerses.length;

  return (
    <div className={cn("space-y-3", className)} {...props}>
      {/* Summary header */}
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <BookOpenIcon className="size-4 shrink-0" />
        <span className="min-w-0 truncate">
          Found {output.verses.length} verse{output.verses.length !== 1 ? "s" : ""}
        </span>
      </div>

      {/* Carousel for verses */}
      <Carousel className="w-full" setApi={setApi}>
        <CarouselContent className="items-start">
          {output.verses.map((verse, index) => (
            <CarouselItem key={`${verse.reference}-${index}`} className="flex">
              <VerseCard verse={verse} />
            </CarouselItem>
          ))}
        </CarouselContent>
        <div className="mt-2 flex items-center justify-center gap-2">
          <CarouselPrevious className="static translate-y-0" />
          <span className="text-muted-foreground text-sm">
            {current + 1} of {output.verses.length}
          </span>
          <CarouselNext className="static translate-y-0" />
        </div>
      </Carousel>
    </div>
  );
};

const VerseCard = ({ verse }: { verse: VerseData }) => {
  // Determine the appropriate Quran.com link
  const quranComUrl = verse.hasContext && verse.passageRange
    ? `https://quran.com/${verse.passageRange.split(" ")[1]?.split("-")[0]?.replace(":", "/")}`
    : `https://quran.com/${verse.reference.split(" ")[1]?.replace(":", "/")}`;

  return (
    <div
      className={cn(
        "flex w-full flex-col overflow-hidden rounded-lg border border-emerald-200 bg-gradient-to-br from-emerald-50/50 to-teal-50/30 p-3 transition-all dark:border-emerald-800/50 dark:from-emerald-950/20 dark:to-teal-950/10 sm:p-4"
      )}
    >
      {/* Header with reference */}
      <div className="mb-3">
        <div className="flex min-w-0 items-center gap-2 font-semibold text-sm">
          <SparklesIcon className="size-3.5 shrink-0 text-emerald-600 dark:text-emerald-400" />
          <span className="truncate">{verse.reference}</span>
          <span className="shrink-0 text-muted-foreground">({verse.surahArabic})</span>
        </div>
      </div>

      {/* Main verse - Arabic */}
      <div className="mb-4 text-right" dir="rtl">
        <p className="font-arabic leading-loose text-foreground text-xl break-words">
          {verse.arabic}
        </p>
      </div>

      {/* Main verse - English */}
      <div className="mb-3 flex-1">
        <p className="leading-relaxed text-foreground break-words">
          {verse.english}
        </p>
      </div>

      {/* Quran.com link */}
      <div className="mt-auto flex items-center justify-center gap-2 rounded-md border border-emerald-200 bg-emerald-50/50 px-3 py-2 dark:border-emerald-800/50 dark:bg-emerald-950/20">
        <BookOpenIcon className="size-3.5 shrink-0 text-emerald-600 dark:text-emerald-400" />
        <a
          href={quranComUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="text-emerald-700 text-sm hover:underline dark:text-emerald-300"
        >
          {verse.hasContext && verse.passageRange 
            ? `View passage: ${verse.passageRange}`
            : `View verse: ${verse.reference}`
          }
        </a>
      </div>
    </div>
  );
};
