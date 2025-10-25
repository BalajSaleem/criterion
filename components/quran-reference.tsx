"use client";

import { BookmarkIcon, BookOpenIcon, LayersIcon } from "lucide-react";
import type { ComponentProps } from "react";
import { useEffect, useState } from "react";
import {
  Carousel,
  type CarouselApi,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

type VerseData = {
  ayahNumber: number;
  textArabic: string;
  textEnglish: string;
  isTarget: boolean;
  isContext: boolean;
};

type ReferenceResult = {
  requestedReference: string;
  reference: string;
  surahNumber: number;
  surahNameArabic: string;
  surahNameEnglish: string;
  verses: VerseData[];
  metadata: {
    surahTransliteration?: string;
    surahTranslation?: string;
    surahType?: "Meccan" | "Medinan";
    totalVersesInSurah?: number;
    verseCount: number;
    hasContext: boolean;
    isRange: boolean;
  };
};

type QuranReferenceOutput =
  | {
      success: true;
      totalRequested: number;
      successfulFetches: number;
      failedFetches: number;
      results: ReferenceResult[];
      errors?: Array<{ reference: string; error: string }>;
    }
  | {
      success: false;
      error?: string;
      errors?: Array<{ reference: string; error: string }>;
      message?: string;
    };

export type QuranReferenceProps = ComponentProps<"div"> & {
  output: QuranReferenceOutput;
};

export const QuranReference = ({
  className,
  output,
  ...props
}: QuranReferenceProps) => {
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
      <div className="space-y-2">
        <div className="rounded-lg border border-rose-200 bg-rose-50 p-4 text-rose-800 dark:border-rose-800 dark:bg-rose-950/30 dark:text-rose-200">
          <p className="text-sm">
            {output.error || output.message || "Failed to fetch verse reference."}
          </p>
        </div>
        {output.errors && output.errors.length > 0 && (
          <div className="space-y-1">
            {output.errors.map((err, idx) => (
              <div
                key={idx}
                className="rounded border border-rose-200 bg-rose-50/50 px-3 py-2 dark:border-rose-800/50 dark:bg-rose-950/20"
              >
                <p className="text-rose-700 text-xs dark:text-rose-300">
                  <span className="font-medium">{err.reference}:</span> {err.error}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  if (!output.results || output.results.length === 0) {
    return (
      <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-amber-800 dark:border-amber-800 dark:bg-amber-950/30 dark:text-amber-200">
        <p className="text-sm">No verses found.</p>
      </div>
    );
  }

  return (
    <div className={cn("space-y-3", className)} {...props}>
      {/* Summary header */}
      <div className="flex items-center gap-2 p-1 text-muted-foreground text-sm">
        <BookmarkIcon className="size-4 shrink-0" />
        <span className="min-w-0 truncate">
          Retrieved {output.successfulFetches} reference
          {output.successfulFetches !== 1 ? "s" : ""}
          {output.failedFetches > 0 && (
            <span className="text-rose-600 dark:text-rose-400">
              {" "}
              ({output.failedFetches} failed)
            </span>
          )}
        </span>
      </div>

      {/* Errors if any */}
      {output.errors && output.errors.length > 0 && (
        <div className="space-y-1">
          {output.errors.map((err, idx) => (
            <div
              key={idx}
              className="rounded border border-rose-200 bg-rose-50/50 px-3 py-2 dark:border-rose-800/50 dark:bg-rose-950/20"
            >
              <p className="text-rose-700 text-xs dark:text-rose-300">
                <span className="font-medium">{err.reference}:</span> {err.error}
              </p>
            </div>
          ))}
        </div>
      )}

      {/* Carousel for references */}
      <Carousel className="w-full" setApi={setApi}>
        <CarouselContent className="items-start">
          {output.results.map((result, index) => (
            <CarouselItem
              className="flex"
              key={`${result.requestedReference}-${index}`}
            >
              <ReferenceCard result={result} />
            </CarouselItem>
          ))}
        </CarouselContent>
        {output.results.length > 1 && (
          <div className="mt-2 flex items-center justify-center gap-2">
            <CarouselPrevious className="static translate-y-0" />
            <span className="text-muted-foreground text-sm">
              {current + 1} of {output.results.length}
            </span>
            <CarouselNext className="static translate-y-0" />
          </div>
        )}
      </Carousel>
    </div>
  );
};

const ReferenceCard = ({ result }: { result: ReferenceResult }) => {
  const targetVerses = result.verses.filter((v) => v.isTarget);
  const contextBefore = result.verses.filter(
    (v) => v.isContext && v.ayahNumber < targetVerses[0]?.ayahNumber
  );
  const contextAfter = result.verses.filter(
    (v) =>
      v.isContext &&
      v.ayahNumber > targetVerses[targetVerses.length - 1]?.ayahNumber
  );

  // Build Quran.com URL
  const firstAyah = result.verses[0]?.ayahNumber;
  const lastAyah = result.verses[result.verses.length - 1]?.ayahNumber;
  const quranComUrl =
    firstAyah === lastAyah
      ? `https://quran.com/${result.surahNumber}/${firstAyah}`
      : `https://quran.com/${result.surahNumber}/${firstAyah}-${lastAyah}`;

  return (
    <div
      className={cn(
        "flex w-full flex-col overflow-hidden rounded-lg border border-blue-200 bg-gradient-to-br from-blue-50/50 to-indigo-50/30 p-3 transition-all sm:p-4 dark:border-blue-800/50 dark:from-blue-950/20 dark:to-indigo-950/10"
      )}
    >
      {/* Header with reference and badges */}
      <div className="mb-3 space-y-2">
        <div className="flex min-w-0 items-center gap-2 font-semibold text-sm">
          <BookmarkIcon className="size-3.5 shrink-0 text-blue-600 dark:text-blue-400" />
          <span className="truncate">{result.reference}</span>
          <span className="shrink-0 text-muted-foreground">
            ({result.surahNameArabic})
          </span>
        </div>
        <div className="flex flex-wrap items-center gap-1.5">
          {result.metadata.surahType && (
            <Badge
              variant="outline"
              className="border-blue-200 bg-blue-50 text-blue-700 text-xs dark:border-blue-800 dark:bg-blue-950/50 dark:text-blue-300"
            >
              {result.metadata.surahType}
            </Badge>
          )}
          {result.metadata.isRange && (
            <Badge
              variant="outline"
              className="border-purple-200 bg-purple-50 text-purple-700 text-xs dark:border-purple-800 dark:bg-purple-950/50 dark:text-purple-300"
            >
              {targetVerses.length} verse{targetVerses.length !== 1 ? "s" : ""}
            </Badge>
          )}
          {result.metadata.hasContext && (
            <Badge
              variant="outline"
              className="border-slate-200 bg-slate-50 text-slate-700 text-xs dark:border-slate-800 dark:bg-slate-950/50 dark:text-slate-300"
            >
              <LayersIcon className="mr-1 size-3" />
              with context
            </Badge>
          )}
        </div>
      </div>

      {/* Context before (if any) */}
      {contextBefore.length > 0 && (
        <div className="mb-3 space-y-2 rounded-md border border-slate-200 bg-slate-50/50 p-2.5 dark:border-slate-800/50 dark:bg-slate-950/20">
          <p className="text-muted-foreground text-xs font-medium uppercase tracking-wide">
            Context Before
          </p>
          {contextBefore.map((verse) => (
            <div key={verse.ayahNumber} className="space-y-1">
              <p className="text-muted-foreground text-xs">
                Verse {result.surahNumber}:{verse.ayahNumber}
              </p>
              <p className="break-words text-foreground/70 text-sm leading-relaxed">
                {verse.textEnglish}
              </p>
            </div>
          ))}
        </div>
      )}

      {/* Target verses */}
      <div className="space-y-3">
        {targetVerses.map((verse, idx) => (
          <div
            key={verse.ayahNumber}
            className={cn(
              "space-y-2 rounded-md",
              targetVerses.length > 5 && "border-l-2 border-blue-300 pl-3 dark:border-blue-700"
            )}
          >
            {/* Verse number - compact for ranges */}
            {targetVerses.length > 1 && (
              <div className="flex items-center gap-2">
                <span className="font-medium text-blue-600 text-xs dark:text-blue-400">
                  {result.surahNumber}:{verse.ayahNumber}
                </span>
                {targetVerses.length > 5 && idx === 0 && (
                  <span className="text-muted-foreground text-xs">
                    ({targetVerses.length} verses)
                  </span>
                )}
              </div>
            )}

            {/* For single verse or first 3 in range: show Arabic + English */}
            {(targetVerses.length <= 3 || idx < 2 || idx === targetVerses.length - 1) && (
              <>
                {/* Arabic text - smaller for ranges */}
                <div className="text-right" dir="rtl">
                  <p
                    className={cn(
                      "break-words font-arabic text-foreground leading-loose",
                      targetVerses.length > 3 ? "text-base" : "text-xl"
                    )}
                  >
                    {verse.textArabic}
                  </p>
                </div>

                {/* English text */}
                <div className="flex-1">
                  <p
                    className={cn(
                      "break-words text-foreground leading-relaxed",
                      targetVerses.length > 3 ? "text-sm" : "text-base"
                    )}
                  >
                    {verse.textEnglish}
                  </p>
                </div>
              </>
            )}

            {/* For ranges with 4+ verses: show only English for middle verses */}
            {targetVerses.length > 3 && idx >= 2 && idx < targetVerses.length - 1 && (
              <div className="flex-1">
                <p className="break-words text-foreground/80 text-sm leading-relaxed">
                  {verse.textEnglish}
                </p>
              </div>
            )}
          </div>
        ))}

        {/* Collapsed indicator for very long ranges */}
        {targetVerses.length > 10 && (
          <div className="flex items-center justify-center py-2">
            <span className="text-muted-foreground text-xs italic">
              Showing first 2 and last verse with Arabic • Full passage at Quran.com
            </span>
          </div>
        )}
      </div>

      {/* Context after (if any) */}
      {contextAfter.length > 0 && (
        <div className="mt-3 space-y-2 rounded-md border border-slate-200 bg-slate-50/50 p-2.5 dark:border-slate-800/50 dark:bg-slate-950/20">
          <p className="text-muted-foreground text-xs font-medium uppercase tracking-wide">
            Context After
          </p>
          {contextAfter.map((verse) => (
            <div key={verse.ayahNumber} className="space-y-1">
              <p className="text-muted-foreground text-xs">
                Verse {result.surahNumber}:{verse.ayahNumber}
              </p>
              <p className="break-words text-foreground/70 text-sm leading-relaxed">
                {verse.textEnglish}
              </p>
            </div>
          ))}
        </div>
      )}

      {/* Quran.com link */}
      <div className="mt-4 flex items-center justify-center gap-2 rounded-md border border-blue-200 bg-blue-50/50 px-3 py-2 dark:border-blue-800/50 dark:bg-blue-950/20">
        <BookOpenIcon className="size-3.5 shrink-0 text-blue-600 dark:text-blue-400" />
        <a
          className="text-blue-700 text-sm hover:underline dark:text-blue-300"
          href={quranComUrl}
          rel="noopener noreferrer"
          target="_blank"
        >
          View on Quran.com
        </a>
      </div>
    </div>
  );
};
