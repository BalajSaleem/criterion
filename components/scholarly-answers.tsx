"use client";

import { ExternalLinkIcon, LibraryIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { cn } from "@/lib/utils";

type ScholarlyAnswer = {
  title: string;
  question: string;
  answer: string;
  topic: string;
  url: string;
  source: string;
  supervisor: string;
  relevance: string;
};

type ScholarlyAnswersOutput =
  | { success: true; answers: ScholarlyAnswer[] }
  | { success: false; message: string };

function AnswerCard({ answer }: { answer: ScholarlyAnswer }) {
  const t = useTranslations("muslim");
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="rounded-lg border border-border/60 bg-background p-3">
      <a
        className="font-medium text-sm hover:underline"
        href={answer.url}
        rel="noopener noreferrer"
        target="_blank"
      >
        {answer.title}
      </a>
      <div className="mt-1 text-muted-foreground text-xs">{answer.topic}</div>
      <p
        className={cn(
          "mt-2 text-sm leading-relaxed",
          !expanded && "line-clamp-4"
        )}
      >
        {answer.answer}
      </p>
      <div className="mt-2 flex items-center justify-between gap-2 text-xs">
        <button
          className="text-muted-foreground hover:text-foreground"
          onClick={() => setExpanded((v) => !v)}
          type="button"
        >
          {expanded ? "Show less" : "Show more"}
        </button>
        <a
          className="inline-flex items-center gap-1 text-teal-700 hover:underline dark:text-teal-300"
          href={answer.url}
          rel="noopener noreferrer"
          target="_blank"
        >
          {t("readAnswer")}
          <ExternalLinkIcon className="size-3" />
        </a>
      </div>
    </div>
  );
}

export function ScholarlyAnswers({ output }: { output: ScholarlyAnswersOutput }) {
  const t = useTranslations("muslim");

  if (!output.success || output.answers.length === 0) {
    return (
      <div className="rounded-lg border border-teal-200 bg-teal-50 p-4 text-sm text-teal-800 dark:border-teal-800 dark:bg-teal-950/30 dark:text-teal-200">
        {output.success ? "No closely matching scholarly answer found." : output.message}
      </div>
    );
  }

  const [first] = output.answers;

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 p-1 text-muted-foreground text-sm">
        <LibraryIcon className="size-4 shrink-0" />
        <span className="min-w-0 truncate">{t("scholarly")}</span>
      </div>
      {output.answers.map((answer) => (
        <AnswerCard answer={answer} key={answer.url} />
      ))}
      <p className="px-1 text-muted-foreground text-xs">
        {t("scholarlyNote", { source: first.source, supervisor: first.supervisor })}
      </p>
    </div>
  );
}
