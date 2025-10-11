"use client";

import { BookOpenIcon, SparklesIcon } from "lucide-react";
import type { ComponentProps } from "react";
import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
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
      <div className="flex items-center justify-between gap-2 text-sm text-muted-foreground">
        <div className="flex items-center gap-2">
          <BookOpenIcon className="size-4 shrink-0" />
          <span className="min-w-0 truncate">
            Found {totalVerseCount} total verse{totalVerseCount !== 1 ? "s" : ""} 
            {output.topThreeWithContext > 0 && (
              <span className="text-emerald-600 dark:text-emerald-400">
                {" "}({output.topThreeWithContext} with context)
              </span>
            )}
          </span>
        </div>
        {output.verses.length > 3 && (
          <span className="shrink-0 text-xs">
            Showing top 3 of {output.verses.length}
          </span>
        )}
      </div>

      {/* Carousel for verses */}
      <Carousel className="w-full" setApi={setApi}>
        <CarouselContent>
          {output.verses.slice(0, 3).map((verse, index) => (
            <CarouselItem key={`${verse.reference}-${index}`}>
              <VerseCard
                showContext={true}
                verse={verse}
              />
            </CarouselItem>
          ))}
        </CarouselContent>
        <div className="mt-2 flex items-center justify-center gap-2">
          <CarouselPrevious className="static translate-y-0" />
          <span className="text-muted-foreground text-sm">
            {current + 1} of 3
          </span>
          <CarouselNext className="static translate-y-0" />
        </div>
      </Carousel>
    </div>
  );
};

const VerseCard = ({
  verse,
  showContext,
}: {
  verse: VerseData;
  showContext: boolean;
}) => {
  const quranComUrl = `https://quran.com/${verse.reference.split(" ")[1]?.replace(":", "/")}`;

  return (
    <div
      className={cn(
        "overflow-hidden rounded-lg border bg-gradient-to-br p-3 transition-all sm:p-4",
        verse.rank <= 3
          ? "border-emerald-200 from-emerald-50/50 to-teal-50/30 dark:border-emerald-800/50 dark:from-emerald-950/20 dark:to-teal-950/10"
          : "border-border from-background to-muted/20"
      )}
    >
      {/* Header with reference and relevance */}
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <a
          className="group flex min-w-0 items-center gap-2 font-semibold text-sm transition-colors hover:text-emerald-600 dark:hover:text-emerald-400"
          href={quranComUrl}
          rel="noopener noreferrer"
          target="_blank"
        >
          <SparklesIcon className="size-3.5 shrink-0 text-emerald-600 transition-transform group-hover:scale-110 dark:text-emerald-400" />
          <span className="truncate">{verse.reference}</span>
          <span className="shrink-0 text-muted-foreground">({verse.surahArabic})</span>
        </a>

        <div className="flex shrink-0 items-center gap-2">
          {verse.rank <= 3 && (
            <Badge
              className="bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300"
              variant="secondary"
            >
              Top {verse.rank}
            </Badge>
          )}
          <Badge
            className="bg-muted text-muted-foreground"
            variant="secondary"
          >
            {verse.relevance} match
          </Badge>
        </div>
      </div>

      {/* Context before (if available) */}
      {showContext && verse.hasContext && verse.contextBefore && (
        <div className="mb-3 rounded-md border-l-2 border-muted bg-muted/30 py-2 pl-3 pr-2 overflow-hidden">
          <p className="mb-1 font-medium text-muted-foreground text-xs uppercase">
            Context Before
          </p>
          <div className="space-y-1.5 text-sm text-muted-foreground">
            {verse.contextBefore.split("\n").map((line, i) => (
              <p key={i} className="leading-relaxed break-words">
                {line}
              </p>
            ))}
          </div>
        </div>
      )}

      {/* Main verse - Arabic */}
      <div className="mb-3 text-right" dir="rtl">
        <p className="font-arabic leading-loose text-foreground text-lg break-words">
          {verse.arabic}
        </p>
      </div>

      {/* Main verse - English */}
      <div className="mb-2">
        <p className="leading-relaxed text-foreground text-sm break-words">
          {verse.english}
        </p>
      </div>

      {/* Context after (if available) */}
      {showContext && verse.hasContext && verse.contextAfter && (
        <div className="mt-3 rounded-md border-l-2 border-muted bg-muted/30 py-2 pl-3 pr-2 overflow-hidden">
          <p className="mb-1 font-medium text-muted-foreground text-xs uppercase">
            Context After
          </p>
          <div className="space-y-1.5 text-sm text-muted-foreground">
            {verse.contextAfter.split("\n").map((line, i) => (
              <p key={i} className="leading-relaxed break-words">
                {line}
              </p>
            ))}
          </div>
        </div>
      )}

      {/* Passage range (if context available) */}
      {showContext && verse.hasContext && verse.passageRange && (
        <div className="mt-3 text-center">
          <p className="text-muted-foreground text-xs">
            Full passage: {verse.passageRange}
          </p>
        </div>
      )}
    </div>
  );
};
