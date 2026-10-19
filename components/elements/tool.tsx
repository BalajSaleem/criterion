"use client";

import type { ToolUIPart } from "ai";
import {
  AlertCircle,
  BookOpenText,
  BookText,
  Bookmark,
  Check,
  ChevronDown,
  Library,
  Loader2,
  ScrollText,
} from "lucide-react";
import type { ComponentProps, ReactNode } from "react";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { cn } from "@/lib/utils";

export type ToolProps = ComponentProps<typeof Collapsible>;

export const Tool = ({ className, ...props }: ToolProps) => (
  <Collapsible
    className={cn(
      "not-prose mb-3 w-full min-w-0 overflow-hidden rounded-lg border border-border/50 bg-muted/20",
      className
    )}
    {...props}
  />
);

export type ToolHeaderProps = {
  type: ToolUIPart["type"];
  state: ToolUIPart["state"];
  className?: string;
};

const getToolIcon = (type: ToolUIPart["type"]) => {
  const icons: Record<string, { icon: React.ReactNode; colorClass: string }> = {
    "tool-queryQuran": {
      icon: <BookText className="size-3.5" />,
      colorClass: "text-emerald-600 dark:text-emerald-400",
    },
    "tool-queryHadith": {
      icon: <ScrollText className="size-3.5" />,
      colorClass: "text-sky-600 dark:text-sky-400",
    },
    "tool-getQuranByReference": {
      icon: <Bookmark className="size-3.5" />,
      colorClass: "text-amber-600 dark:text-amber-400",
    },
    "tool-getTafsir": {
      icon: <BookOpenText className="size-3.5" />,
      colorClass: "text-violet-600 dark:text-violet-400",
    },
    "tool-searchScholarlyAnswers": {
      icon: <Library className="size-3.5" />,
      colorClass: "text-teal-600 dark:text-teal-400",
    },
  };

  return icons[type] || { icon: <BookText className="size-3.5" />, colorClass: "text-muted-foreground" };
};

const getToolDisplayMessage = (type: ToolUIPart["type"], state: ToolUIPart["state"]) => {
  const messages: Record<string, Record<ToolUIPart["state"], string>> = {
    "tool-queryQuran": {
      "input-streaming": "Preparing to search the Divine Scripture...",
      "input-available": "Searching the Divine Scripture...",
      "approval-requested": "Approval requested for Quran search",
      "approval-responded": "Approval received for Quran search",
      "output-available": "Found verses from the Divine Scripture",
      "output-error": "Encountered an error while searching",
      "output-denied": "Quran search was denied",
    },
    "tool-queryHadith": {
      "input-streaming": "Preparing to search Prophetic Teachings...",
      "input-available": "Searching Prophetic Teachings...",
      "approval-requested": "Approval requested for Hadith search",
      "approval-responded": "Approval received for Hadith search",
      "output-available": "Found Prophetic Teachings",
      "output-error": "Encountered an error while searching",
      "output-denied": "Hadith search was denied",
    },
    "tool-getQuranByReference": {
      "input-streaming": "Preparing verse lookup...",
      "input-available": "Looking up verse reference...",
      "approval-requested": "Approval requested for verse lookup",
      "approval-responded": "Approval received for verse lookup",
      "output-available": "Found verse reference",
      "output-error": "Failed to get verse reference",
      "output-denied": "Verse lookup was denied",
    },
    "tool-getTafsir": {
      "input-streaming": "Preparing to consult the tafsir...",
      "input-available": "Consulting the classical tafsir...",
      "approval-requested": "Approval requested for tafsir lookup",
      "approval-responded": "Approval received for tafsir lookup",
      "output-available": "Found the scholars' explanation of the verse",
      "output-error": "Failed to get tafsir",
      "output-denied": "Tafsir lookup was denied",
    },
    "tool-searchScholarlyAnswers": {
      "input-streaming": "Preparing to search scholars' answers...",
      "input-available": "Searching scholars' answers...",
      "approval-requested": "Approval requested for scholarly search",
      "approval-responded": "Approval received for scholarly search",
      "output-available": "Found answers from scholars",
      "output-error": "Encountered an error while searching",
      "output-denied": "Scholarly search was denied",
    },
  };

  return messages[type]?.[state] || type;
};

const getStatusIcon = (state: ToolUIPart["state"]) => {
  const icons: Record<ToolUIPart["state"], React.ReactNode> = {
    "input-streaming": <Loader2 className="size-3 animate-spin text-muted-foreground" />,
    "input-available": <Loader2 className="size-3 animate-spin text-muted-foreground" />,
    "approval-requested": <AlertCircle className="size-3 text-amber-600 dark:text-amber-500" />,
    "approval-responded": <Check className="size-3 text-blue-600 dark:text-blue-500" />,
    "output-available": <Check className="size-3 text-green-600 dark:text-green-500" />,
    "output-error": <AlertCircle className="size-3 text-red-600 dark:text-red-500" />,
    "output-denied": <AlertCircle className="size-3 text-red-600 dark:text-red-500" />,
  };

  return icons[state];
};

export const ToolHeader = ({
  className,
  type,
  state,
  ...props
}: ToolHeaderProps) => {
  const { icon, colorClass } = getToolIcon(type);
  
  return (
    <CollapsibleTrigger
      className={cn(
        "group flex w-full min-w-0 items-center justify-between gap-2 px-3 py-2 transition-colors hover:bg-muted/50",
        className
      )}
      {...props}
    >
      <div className="flex min-w-0 flex-1 items-center gap-2">
        <span className={cn("shrink-0", colorClass)}>
          {icon}
        </span>
        <span className="truncate text-sm text-muted-foreground">
          {getToolDisplayMessage(type, state)}
        </span>
      </div>
      <div className="flex shrink-0 items-center gap-2">
        {getStatusIcon(state)}
        <ChevronDown className="size-3.5 text-muted-foreground transition-transform group-data-[state=open]:rotate-180" />
      </div>
    </CollapsibleTrigger>
  );
};

export type ToolContentProps = ComponentProps<typeof CollapsibleContent>;

export const ToolContent = ({ className, ...props }: ToolContentProps) => (
  <CollapsibleContent
    className={cn(
      "border-t border-border/50 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:slide-out-to-top-2 data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:slide-in-from-top-2",
      className
    )}
    {...props}
  />
);

export type ToolInputProps = ComponentProps<"div"> & {
  input: ToolUIPart["input"];
};

// Hidden - users don't need to see technical parameters
export const ToolInput = ({ className, input, ...props }: ToolInputProps) => null;

export type ToolOutputProps = ComponentProps<"div"> & {
  output: ReactNode;
  errorText: ToolUIPart["errorText"];
};

export const ToolOutput = ({
  className,
  output,
  errorText,
  ...props
}: ToolOutputProps) => {
  if (!(output || errorText)) {
    return null;
  }

  return (
    <div className={cn("overflow-hidden p-3", className)} {...props}>
      {errorText ? (
        <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
          {errorText}
        </div>
      ) : (
        <div className="min-w-0">
          {output}
        </div>
      )}
    </div>
  );
};
