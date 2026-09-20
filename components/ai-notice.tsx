"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { useIsClient, useLocalStorage } from "usehooks-ts";
import { Button } from "@/components/ui/button";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { cn } from "@/lib/utils";
import { SparklesIcon } from "./icons";

/**
 * Marks every answer as machine-generated, and says how to weigh it.
 *
 * Three layers in one component: a line that is always on screen, the panel it
 * opens, and that panel opening by itself on a first visit. The panel stands in
 * for the transient first-visit toast — a disclaimer that disappears after
 * seven seconds is not a disclaimer a reader can return to.
 */
const ACKNOWLEDGED_KEY = "criterion-ai-notice-v1";

export function AiNotice({ className }: { className?: string }) {
  const t = useTranslations("disclosure");
  // `initializeWithValue: false` keeps the first client render matching the
  // server's, which reading localStorage in a state initializer would break.
  const [isAcknowledged, setIsAcknowledged] = useLocalStorage(
    ACKNOWLEDGED_KEY,
    false,
    { initializeWithValue: false }
  );
  const isClient = useIsClient();
  // Null until the reader touches the line: until then the panel follows the
  // first-visit rule, afterwards it follows them.
  const [openedByUser, setOpenedByUser] = useState<boolean | null>(null);

  const isOpen = openedByUser ?? (isClient && !isAcknowledged);

  const handleOpenChange = (nextOpen: boolean) => {
    setOpenedByUser(nextOpen);

    if (!nextOpen) {
      setIsAcknowledged(true);
    }
  };

  return (
    <Collapsible
      className={cn("mx-auto w-full max-w-3xl px-2 md:px-4", className)}
      data-testid="ai-notice"
      onOpenChange={handleOpenChange}
      open={isOpen}
    >
      <CollapsibleContent className="data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:slide-out-to-bottom-2 data-[state=open]:slide-in-from-bottom-2 data-[state=closed]:animate-out data-[state=open]:animate-in">
        <div
          className="mb-2 rounded-xl border bg-muted/40 p-3 text-start md:p-4"
          data-testid="ai-notice-panel"
        >
          <p className="font-medium text-sm">{t("panelTitle")}</p>

          <ul className="mt-2 space-y-2 text-muted-foreground text-xs leading-relaxed md:text-[13px]">
            <li>
              <span className="font-medium text-foreground">
                {t("generatedTitle")}
              </span>{" "}
              {t("generatedBody")}
            </li>
            <li>
              <span className="font-medium text-foreground">
                {t("sourcesTitle")}
              </span>{" "}
              {t("sourcesBody")}
            </li>
            <li>
              <span className="font-medium text-foreground">
                {t("scholarsTitle")}
              </span>{" "}
              {t("scholarsBody")}
            </li>
          </ul>

          <div className="mt-3 flex items-center justify-between gap-2">
            <div className="flex items-center gap-3 text-muted-foreground text-xs">
              <Link
                className="underline-offset-2 hover:text-foreground hover:underline"
                href="/how-it-works"
              >
                {t("howItWorks")}
              </Link>
              <Link
                className="underline-offset-2 hover:text-foreground hover:underline"
                href="/faq"
              >
                {t("faq")}
              </Link>
            </div>
            <Button
              className="h-7 px-2 text-xs"
              data-testid="ai-notice-acknowledge"
              onClick={() => handleOpenChange(false)}
              size="sm"
              type="button"
              variant="ghost"
            >
              {t("acknowledge")}
            </Button>
          </div>
        </div>
      </CollapsibleContent>

      <CollapsibleTrigger
        aria-label={t("triggerLabel")}
        className="flex w-full items-center justify-center gap-1.5 rounded-md py-0.5 text-[11px] text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        data-testid="ai-notice-trigger"
      >
        <span aria-hidden="true" className="opacity-70">
          <SparklesIcon size={10} />
        </span>
        <span>{t("inlineNotice")}</span>
        <span className="underline decoration-dotted underline-offset-2">
          {t("inlineAction")}
        </span>
      </CollapsibleTrigger>
    </Collapsible>
  );
}
