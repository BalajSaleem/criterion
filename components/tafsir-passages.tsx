"use client";

import { BookOpenTextIcon, ExternalLinkIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { cn } from "@/lib/utils";

type TafsirPassage = {
  source: string;
  name: string;
  author: string;
  verse: string;
  text: string;
  truncated: boolean;
  url: string;
};

type TafsirOutput =
  | {
      success: true;
      reference: string;
      surahName: string;
      tafsirs: TafsirPassage[];
    }
  | { success: false; error?: string };

function PassageCard({ passage }: { passage: TafsirPassage }) {
  const t = useTranslations("muslim");
  const [expanded, setExpanded] = useState(false);
  const isLong = passage.text.length > 600;

  return (
    <div className="rounded-lg border border-border/60 bg-background p-3">
      <div className="mb-2 flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
        <div className="min-w-0">
          <span className="font-medium text-sm">{passage.name}</span>
          <span className="ml-2 text-muted-foreground text-xs">{passage.author}</span>
        </div>
        <span className="rounded bg-violet-100 px-1.5 py-0.5 font-mono text-[11px] text-violet-800 dark:bg-violet-950/50 dark:text-violet-300">
          {passage.verse}
        </span>
      </div>
      <p
        className={cn(
          "whitespace-pre-line text-sm leading-relaxed",
          !expanded && isLong && "line-clamp-6"
        )}
      >
        {passage.text}
      </p>
      <div className="mt-2 flex items-center justify-between gap-2 text-xs">
        {isLong ? (
          <button
            className="text-muted-foreground hover:text-foreground"
            onClick={() => setExpanded((v) => !v)}
            type="button"
          >
            {expanded ? "Show less" : "Show more"}
          </button>
        ) : (
          <span />
        )}
        <a
          className="inline-flex items-center gap-1 text-violet-700 hover:underline dark:text-violet-300"
          href={passage.url}
          rel="noopener noreferrer"
          target="_blank"
        >
          {t("readFull")}
          <ExternalLinkIcon className="size-3" />
        </a>
      </div>
    </div>
  );
}

export function TafsirPassages({ output }: { output: TafsirOutput }) {
  const t = useTranslations("muslim");

  if (!output.success) {
    return (
      <div className="rounded-lg border border-violet-200 bg-violet-50 p-4 text-sm text-violet-800 dark:border-violet-800 dark:bg-violet-950/30 dark:text-violet-200">
        {output.error || "No tafsir found."}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 p-1 text-muted-foreground text-sm">
        <BookOpenTextIcon className="size-4 shrink-0" />
        <span className="min-w-0 truncate">
          {t("tafsir")} · {output.surahName} {output.reference}
        </span>
      </div>
      {output.tafsirs.map((passage) => (
        <PassageCard key={`${passage.source}-${passage.verse}`} passage={passage} />
      ))}
    </div>
  );
}
