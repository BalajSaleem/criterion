"use client";

import equal from "fast-deep-equal";
import { useTranslations } from "next-intl";
import { memo, useState } from "react";
import { toast } from "sonner";
import { useSWRConfig } from "swr";
import { useCopyToClipboard } from "usehooks-ts";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  FEEDBACK_REASONS,
  type FeedbackReason,
  type Vote,
} from "@/lib/db/schema";
import { MAX_COMMENT_LENGTH } from "@/lib/feedback";
import type { ChatMessage } from "@/lib/types";
import { cn } from "@/lib/utils";
import { Action, Actions } from "./elements/actions";
import { CopyIcon, PencilEditIcon, ThumbDownIcon, ThumbUpIcon } from "./icons";

/** Stands in for the server-generated row id until the cache is revalidated. */
const OPTIMISTIC_VOTE_ID = "00000000-0000-0000-0000-000000000000";

type VoteBody = {
  chatId: string;
  messageId: string;
  type: "up" | "down";
  reason?: FeedbackReason;
  comment?: string;
};

export function PureMessageActions({
  chatId,
  message,
  vote,
  isLoading,
  setMode,
}: {
  chatId: string;
  message: ChatMessage;
  vote: Vote | undefined;
  isLoading: boolean;
  setMode?: (mode: "view" | "edit") => void;
}) {
  const t = useTranslations("feedback");
  const { mutate } = useSWRConfig();
  const [_, copyToClipboard] = useCopyToClipboard();
  const [isReasonPanelOpen, setIsReasonPanelOpen] = useState(false);
  const [selectedReason, setSelectedReason] = useState<FeedbackReason | null>(
    null
  );
  const [comment, setComment] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (isLoading) {
    return null;
  }

  const textFromParts = message.parts
    ?.filter((part) => part.type === "text")
    .map((part) => part.text)
    .join("\n")
    .trim();

  const handleCopy = async () => {
    if (!textFromParts) {
      toast.error(t("copyEmpty"));
      return;
    }

    await copyToClipboard(textFromParts);
    toast.success(t("copied"));
  };

  /**
   * Only `isUpvoted` drives the rendered thumbs, so the placeholder fills the
   * remaining columns with what the server will have written rather than
   * pretending to know the generated id.
   */
  const applyOptimisticVote = (
    isUpvoted: boolean,
    reason: FeedbackReason | null = null,
    submittedComment: string | null = null
  ) => {
    mutate<Vote[]>(
      `/api/vote?chatId=${chatId}`,
      (currentVotes) => {
        if (!currentVotes) {
          return [];
        }

        const votesWithoutCurrent = currentVotes.filter(
          (currentVote) => currentVote.messageId !== message.id
        );

        const optimisticVote: Vote = {
          id: vote?.id ?? OPTIMISTIC_VOTE_ID,
          chatId,
          messageId: message.id,
          isUpvoted,
          scope: "message",
          rating: null,
          reason,
          comment: submittedComment,
          sources: vote?.sources ?? null,
          createdAt: vote?.createdAt ?? new Date(),
          updatedAt: new Date(),
        };

        return [...votesWithoutCurrent, optimisticVote];
      },
      { revalidate: false }
    );
  };

  const sendVote = (body: VoteBody) =>
    fetch("/api/vote", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }).then((response) => {
      if (!response.ok) {
        throw new Error("Failed to submit feedback");
      }
      return response;
    });

  const handleUpvote = () => {
    // Upvotes stay a single click — friction here would cost the cheap signal.
    setIsReasonPanelOpen(false);

    toast.promise(sendVote({ chatId, messageId: message.id, type: "up" }), {
      loading: t("submitting"),
      success: () => {
        applyOptimisticVote(true);
        return t("upvoteThanks");
      },
      error: t("submitFailed"),
    });
  };

  const handleDownvote = () => {
    // Record the thumb immediately, then invite a reason. The downvote counts
    // even if the panel is dismissed without one.
    setIsReasonPanelOpen(true);

    sendVote({ chatId, messageId: message.id, type: "down" })
      .then(() => applyOptimisticVote(false))
      .catch(() => toast.error(t("submitFailed")));
  };

  const handleReasonSubmit = () => {
    if (isSubmitting) {
      return;
    }

    setIsSubmitting(true);

    const trimmedComment = comment.trim();

    sendVote({
      chatId,
      messageId: message.id,
      type: "down",
      ...(selectedReason ? { reason: selectedReason } : {}),
      ...(trimmedComment ? { comment: trimmedComment } : {}),
    })
      .then(() => {
        applyOptimisticVote(false, selectedReason, trimmedComment || null);
        setIsReasonPanelOpen(false);
        setSelectedReason(null);
        setComment("");
        toast.success(t("downvoteThanks"));
      })
      .catch(() => toast.error(t("submitFailed")))
      .finally(() => setIsSubmitting(false));
  };

  // User messages get edit (on hover) and copy actions
  if (message.role === "user") {
    return (
      <Actions className="-mr-0.5 justify-end">
        <div className="relative">
          {setMode && (
            <Action
              className="-left-10 absolute top-0 opacity-0 transition-opacity group-hover/message:opacity-100"
              onClick={() => setMode("edit")}
              tooltip="Edit"
            >
              <PencilEditIcon />
            </Action>
          )}
          <Action onClick={handleCopy} tooltip="Copy">
            <CopyIcon />
          </Action>
        </div>
      </Actions>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      <Actions className="-ml-0.5">
        <Action onClick={handleCopy} tooltip="Copy">
          <CopyIcon />
        </Action>

        <Action
          data-testid="message-upvote"
          disabled={vote?.isUpvoted === true}
          onClick={handleUpvote}
          tooltip={t("upvoteTooltip")}
        >
          <ThumbUpIcon />
        </Action>

        <Action
          data-testid="message-downvote"
          onClick={handleDownvote}
          tooltip={t("downvoteTooltip")}
        >
          <ThumbDownIcon />
        </Action>
      </Actions>

      {isReasonPanelOpen && (
        <div
          className="rounded-lg border bg-muted/40 p-3 text-sm"
          data-testid="downvote-reason-panel"
        >
          <div className="flex items-start justify-between gap-2">
            <p className="font-medium">{t("reasonTitle")}</p>
            <Button
              aria-label={t("dismiss")}
              className="-mt-1 -mr-1 size-7 shrink-0 p-0 text-muted-foreground"
              onClick={() => setIsReasonPanelOpen(false)}
              size="sm"
              type="button"
              variant="ghost"
            >
              &times;
            </Button>
          </div>

          <div className="mt-2 flex flex-wrap gap-1.5">
            {FEEDBACK_REASONS.map((reason) => (
              <button
                aria-pressed={selectedReason === reason}
                className={cn(
                  "rounded-full border px-2.5 py-1 text-xs transition-colors",
                  selectedReason === reason
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-input bg-background hover:bg-accent"
                )}
                data-testid={`downvote-reason-${reason}`}
                key={reason}
                onClick={() =>
                  setSelectedReason((current) =>
                    current === reason ? null : reason
                  )
                }
                type="button"
              >
                {t(`reasons.${reason}`)}
              </button>
            ))}
          </div>

          <Textarea
            className="mt-2 min-h-[60px] resize-none bg-background text-sm"
            data-testid="downvote-comment"
            maxLength={MAX_COMMENT_LENGTH}
            onChange={(event) => setComment(event.target.value)}
            placeholder={t("reasonPlaceholder")}
            value={comment}
          />

          <div className="mt-2 flex justify-end">
            <Button
              data-testid="downvote-submit"
              disabled={isSubmitting}
              onClick={handleReasonSubmit}
              size="sm"
              type="button"
            >
              {t("send")}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

export const MessageActions = memo(
  PureMessageActions,
  (prevProps, nextProps) => {
    if (!equal(prevProps.vote, nextProps.vote)) {
      return false;
    }
    if (prevProps.isLoading !== nextProps.isLoading) {
      return false;
    }

    return true;
  }
);
