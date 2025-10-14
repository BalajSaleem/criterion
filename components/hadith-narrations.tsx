"use client";

import { ScrollTextIcon, SparklesIcon } from "lucide-react";
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
import { cn } from "@/lib/utils";

type HadithData = {
  rank: number;
  reference: string;
  collection: string;
  english: string;
  arabic: string;
  grade: string;
  narrator: string;
  book: string;
  chapter: string;
  relevance: string;
  matchType: string;
  sourceUrl: string;
};

type HadithNarrationsOutput =
  | {
      success: true;
      totalHadiths: number;
      collectionsSearched: string[];
      gradeFilter: string;
      hadiths: HadithData[];
    }
  | {
      success: false;
      message: string;
    };

export type HadithNarrationsProps = ComponentProps<"div"> & {
  output: HadithNarrationsOutput;
};

export const HadithNarrations = ({
  className,
  output,
  ...props
}: HadithNarrationsProps) => {
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
        <p className="text-sm">
          {output.message || "No relevant hadiths found."}
        </p>
      </div>
    );
  }

  if (!output.hadiths || output.hadiths.length === 0) {
    return (
      <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-amber-800 dark:border-amber-800 dark:bg-amber-950/30 dark:text-amber-200">
        <p className="text-sm">No relevant hadiths found.</p>
      </div>
    );
  }

  return (
    <div className={cn("space-y-3", className)} {...props}>
      {/* Summary header */}
      <div className="flex items-center gap-2 p-1 text-muted-foreground text-sm">
        <ScrollTextIcon className="size-4 shrink-0" />
        <span className="min-w-0 truncate">
          Found {output.hadiths.length} hadith
          {output.hadiths.length !== 1 ? "s" : ""} from{" "}
          {output.collectionsSearched.join(", ")}
        </span>
      </div>

      {/* Carousel for hadiths */}
      <Carousel className="w-full" setApi={setApi}>
        <CarouselContent className="items-start">
          {output.hadiths.map((hadith, index) => (
            <CarouselItem className="flex" key={`${hadith.reference}-${index}`}>
              <HadithCard hadith={hadith} />
            </CarouselItem>
          ))}
        </CarouselContent>
        <div className="mt-2 flex items-center justify-center gap-2">
          <CarouselPrevious className="static translate-y-0" />
          <span className="text-muted-foreground text-sm">
            {current + 1} of {output.hadiths.length}
          </span>
          <CarouselNext className="static translate-y-0" />
        </div>
      </Carousel>
    </div>
  );
};

const HadithCard = ({ hadith }: { hadith: HadithData }) => {
  const [showNarrator, setShowNarrator] = useState(false);

  // Grade badge color
  const gradeColors = {
    Sahih: "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300",
    Hasan: "bg-yellow-100 text-yellow-800 dark:bg-yellow-950/50 dark:text-yellow-300",
    "Da'if": "bg-orange-100 text-orange-800 dark:bg-orange-950/50 dark:text-orange-300",
    Unknown: "bg-gray-100 text-gray-800 dark:bg-gray-950/50 dark:text-gray-300",
  };

  const gradeColor =
    gradeColors[hadith.grade as keyof typeof gradeColors] ||
    gradeColors.Unknown;

  return (
    <div
      className={cn(
        "flex w-full flex-col overflow-hidden rounded-lg border border-amber-200 bg-gradient-to-br from-amber-50/50 to-orange-50/30 p-3 transition-all sm:p-4 dark:border-amber-800/50 dark:from-amber-950/20 dark:to-orange-950/10"
      )}
    >
      {/* Header with collection, reference, and grade */}
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <div className="flex min-w-0 items-center gap-2 font-semibold text-sm">
          <SparklesIcon className="size-3.5 shrink-0 text-amber-600 dark:text-amber-400" />
          <span className="truncate">{hadith.collection}</span>
        </div>
        <span className={cn("rounded-full px-2 py-0.5 text-xs font-medium", gradeColor)}>
          {hadith.grade}
        </span>
      </div>

      <div className="mb-2 text-muted-foreground text-xs">
        {hadith.reference}
      </div>

      {/* Arabic text */}
      {hadith.arabic && (
        <div className="mb-4 text-right" dir="rtl">
          <p className="break-words font-arabic text-foreground text-xl leading-loose">
            {hadith.arabic}
          </p>
        </div>
      )}

      {/* English translation */}
      <div className="mb-3 flex-1">
        <p className="break-words text-foreground leading-relaxed">
          {hadith.english}
        </p>
      </div>

      {/* Metadata: Book and Chapter */}
      {(hadith.book !== "Not specified" || hadith.chapter !== "Not specified") && (
        <div className="mb-3 space-y-1 rounded-md border border-amber-200/50 bg-amber-50/30 p-2 text-sm dark:border-amber-800/30 dark:bg-amber-950/10">
          {hadith.book !== "Not specified" && (
            <div className="text-muted-foreground">
              <span className="font-medium">Book:</span> {hadith.book}
            </div>
          )}
          {hadith.chapter !== "Not specified" && (
            <div className="text-muted-foreground">
              <span className="font-medium">Chapter:</span> {hadith.chapter}
            </div>
          )}
        </div>
      )}

      {/* Narrator chain (collapsible) */}
      {hadith.narrator && hadith.narrator !== "Not specified" && (
        <div className="mb-3">
          <button
            className="flex w-full items-center justify-between rounded-md border border-amber-200/50 bg-amber-50/30 p-2 text-left text-sm transition-colors hover:bg-amber-100/40 dark:border-amber-800/30 dark:bg-amber-950/10 dark:hover:bg-amber-900/20"
            onClick={() => setShowNarrator(!showNarrator)}
            type="button"
          >
            <span className="font-medium text-muted-foreground">
              Narrator Chain
            </span>
            <span className="text-muted-foreground text-xs">
              {showNarrator ? "Hide" : "Show"}
            </span>
          </button>
          {showNarrator && (
            <div className="mt-2 rounded-md border border-amber-200/50 bg-amber-50/30 p-2 text-muted-foreground text-sm dark:border-amber-800/30 dark:bg-amber-950/10">
              {hadith.narrator}
            </div>
          )}
        </div>
      )}

      {/* Source link */}
      {hadith.sourceUrl && (
        <div className="mt-auto flex items-center justify-center gap-2 rounded-md border border-amber-200 bg-amber-50/50 px-3 py-2 dark:border-amber-800/50 dark:bg-amber-950/20">
          <ScrollTextIcon className="size-3.5 shrink-0 text-amber-600 dark:text-amber-400" />
          <a
            className="text-amber-700 text-sm hover:underline dark:text-amber-300"
            href={hadith.sourceUrl}
            rel="noopener noreferrer"
            target="_blank"
          >
            View on Sunnah.com
          </a>
        </div>
      )}
    </div>
  );
};
