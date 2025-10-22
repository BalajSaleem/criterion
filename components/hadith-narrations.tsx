"use client";

import { ScrollTextIcon } from "lucide-react";
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
import { HadithCard, type HadithCardData } from "@/components/hadith/hadith-card";
import { cn } from "@/lib/utils";

type HadithData = HadithCardData;

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
      <div className="rounded-lg border border-sky-200 bg-sky-50 p-4 text-sky-800 dark:border-sky-800 dark:bg-sky-950/30 dark:text-sky-200">
        <p className="text-sm">
          {output.message || "No relevant hadiths found."}
        </p>
      </div>
    );
  }

  if (!output.hadiths || output.hadiths.length === 0) {
    return (
      <div className="rounded-lg border border-sky-200 bg-sky-50 p-4 text-sky-800 dark:border-sky-800 dark:bg-sky-950/30 dark:text-sky-200">
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
