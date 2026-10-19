"use client";

import { useTranslations } from "next-intl";
import { useChatMode } from "@/hooks/use-chat-mode";
import type { ChatMode } from "@/lib/ai/modes";
import { cn } from "@/lib/utils";

const MODES: ChatMode[] = ["seeker", "muslim"];

export function ModeToggle({ className }: { className?: string }) {
  const { mode, setMode } = useChatMode();
  const t = useTranslations("modes");

  return (
    <div
      aria-label={t("label")}
      className={cn(
        "inline-flex items-center rounded-full border border-border bg-muted/40 p-0.5 text-xs",
        className
      )}
      data-testid="mode-toggle"
      role="radiogroup"
    >
      {MODES.map((m) => (
        <button
          aria-checked={mode === m}
          className={cn(
            "rounded-full px-3 py-1 font-medium transition-colors",
            mode === m
              ? "bg-background text-foreground shadow-xs"
              : "text-muted-foreground hover:text-foreground"
          )}
          key={m}
          onClick={() => setMode(m)}
          role="radio"
          type="button"
        >
          {t(m)}
        </button>
      ))}
    </div>
  );
}
