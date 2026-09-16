"use client";

import { motion } from "framer-motion";
import { StarIcon, XIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { toast } from "sonner";
import { useIsClient, useLocalStorage } from "usehooks-ts";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { MAX_COMMENT_LENGTH, RATING_MAX, submitFeedback } from "@/lib/feedback";
import { cn } from "@/lib/utils";

const RATINGS = Array.from({ length: RATING_MAX }, (_, index) => index + 1);

export function FeedbackPrompt({
  chatId,
  messageId,
}: {
  chatId: string;
  /** Last assistant message, which the conversation rating anchors to. */
  messageId: string;
}) {
  const t = useTranslations("feedback");
  // `initializeWithValue: false` keeps the first client render matching the
  // server's, which reading localStorage in a state initializer would break.
  const [isDismissed, setIsDismissed] = useLocalStorage(
    `criterion-feedback-${chatId}`,
    false,
    { initializeWithValue: false }
  );
  const isClient = useIsClient();
  const [rating, setRating] = useState<number | null>(null);
  const [hoveredRating, setHoveredRating] = useState<number | null>(null);
  const [comment, setComment] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isClient || isDismissed) {
    return null;
  }

  const dismiss = () => setIsDismissed(true);

  const handleSubmit = () => {
    const trimmedComment = comment.trim();

    if (rating === null && trimmedComment.length === 0) {
      toast.error(t("promptEmpty"));
      return;
    }

    setIsSubmitting(true);

    submitFeedback({
      chatId,
      messageId,
      scope: "conversation",
      ...(rating === null ? {} : { rating }),
      ...(trimmedComment ? { comment: trimmedComment } : {}),
    })
      .then(() => {
        setIsDismissed(true);
        toast.success(t("promptThanks"));
      })
      .catch(() => toast.error(t("submitFailed")))
      .finally(() => setIsSubmitting(false));
  };

  const activeRating = hoveredRating ?? rating ?? 0;

  return (
    <motion.div
      animate={{ opacity: 1, y: 0 }}
      className="mx-auto w-full max-w-3xl px-2 md:px-4"
      data-testid="feedback-prompt"
      initial={{ opacity: 0, y: 8 }}
      transition={{ duration: 0.3 }}
    >
      <div className="rounded-xl border bg-muted/40 p-4">
        <div className="flex items-start justify-between gap-2">
          <div>
            <p className="font-medium text-sm">{t("promptTitle")}</p>
            <p className="mt-0.5 text-muted-foreground text-xs">
              {t("promptSubtitle")}
            </p>
          </div>
          <Button
            aria-label={t("dismiss")}
            className="-mt-1 -mr-1 size-7 shrink-0 p-0 text-muted-foreground"
            data-testid="feedback-prompt-dismiss"
            onClick={dismiss}
            size="sm"
            type="button"
            variant="ghost"
          >
            <XIcon className="size-4" />
          </Button>
        </div>

        <div className="mt-3 flex items-center gap-1">
          {RATINGS.map((value) => (
            <button
              aria-label={t("ratingLabel", { rating: value })}
              aria-pressed={rating === value}
              className="rounded p-0.5 transition-transform hover:scale-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              data-testid={`feedback-rating-${value}`}
              key={value}
              onBlur={() => setHoveredRating(null)}
              onClick={() =>
                setRating((current) => (current === value ? null : value))
              }
              onFocus={() => setHoveredRating(value)}
              onMouseEnter={() => setHoveredRating(value)}
              onMouseLeave={() => setHoveredRating(null)}
              type="button"
            >
              <StarIcon
                className={cn(
                  "size-6 transition-colors",
                  value <= activeRating
                    ? "fill-amber-400 text-amber-400"
                    : "text-muted-foreground/40"
                )}
              />
            </button>
          ))}
        </div>

        <Textarea
          className="mt-3 min-h-[70px] resize-none bg-background text-sm"
          data-testid="feedback-prompt-comment"
          maxLength={MAX_COMMENT_LENGTH}
          onChange={(event) => setComment(event.target.value)}
          placeholder={t("promptPlaceholder")}
          value={comment}
        />

        <div className="mt-3 flex items-center justify-end gap-2">
          <Button onClick={dismiss} size="sm" type="button" variant="ghost">
            {t("notNow")}
          </Button>
          <Button
            data-testid="feedback-prompt-submit"
            disabled={isSubmitting}
            onClick={handleSubmit}
            size="sm"
            type="button"
          >
            {t("send")}
          </Button>
        </div>
      </div>
    </motion.div>
  );
}
