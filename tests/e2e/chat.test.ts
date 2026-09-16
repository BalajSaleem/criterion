import { expect, test } from "../fixtures";
import { ChatPage } from "../pages/chat";

test.describe("Chat activity", () => {
  let chatPage: ChatPage;

  test.beforeEach(async ({ page }) => {
    chatPage = new ChatPage(page);
    await chatPage.createNewChat();
  });

  test("Send a user message and receive response", async () => {
    await chatPage.sendUserMessage("Why is grass green?");
    await chatPage.isGenerationComplete();

    const assistantMessage = await chatPage.getRecentAssistantMessage();
    expect(assistantMessage.content).toContain("It's just green duh!");
  });

  test("Redirect to /chat/:id after submitting message", async () => {
    await chatPage.sendUserMessage("Why is grass green?");
    await chatPage.isGenerationComplete();

    const assistantMessage = await chatPage.getRecentAssistantMessage();
    expect(assistantMessage.content).toContain("It's just green duh!");
    await chatPage.hasChatIdInUrl();
  });

  test("Send a user message from suggestion", async () => {
    await chatPage.sendUserMessageFromSuggestion();
    await chatPage.isGenerationComplete();

    const assistantMessage = await chatPage.getRecentAssistantMessage();
    expect(assistantMessage.content).toContain(
      "With Next.js, you can ship fast!"
    );
  });

  test("Toggle between send/stop button based on activity", async () => {
    await expect(chatPage.sendButton).toBeVisible();
    await expect(chatPage.sendButton).toBeDisabled();

    await chatPage.sendUserMessage("Why is grass green?");

    await expect(chatPage.sendButton).not.toBeVisible();
    await expect(chatPage.stopButton).toBeVisible();

    await chatPage.isGenerationComplete();

    await expect(chatPage.stopButton).not.toBeVisible();
    await expect(chatPage.sendButton).toBeVisible();
  });

  test("Stop generation during submission", async () => {
    await chatPage.sendUserMessage("Why is grass green?");
    await expect(chatPage.stopButton).toBeVisible();
    await chatPage.stopButton.click();
    await expect(chatPage.sendButton).toBeVisible();
  });

  test("Edit user message and resubmit", async () => {
    await chatPage.sendUserMessage("Why is grass green?");
    await chatPage.isGenerationComplete();

    const assistantMessage = await chatPage.getRecentAssistantMessage();
    expect(assistantMessage.content).toContain("It's just green duh!");

    const userMessage = await chatPage.getRecentUserMessage();
    await userMessage.edit("Why is the sky blue?");

    await chatPage.isGenerationComplete();

    const updatedAssistantMessage = await chatPage.getRecentAssistantMessage();
    expect(updatedAssistantMessage.content).toContain("It's just blue duh!");
  });

  test("Hide suggested actions after sending message", async () => {
    await chatPage.isElementVisible("suggested-actions");
    await chatPage.sendUserMessageFromSuggestion();
    await chatPage.isElementNotVisible("suggested-actions");
  });

  test("Upload file and send image attachment with message", async () => {
    await chatPage.addImageAttachment();

    await chatPage.isElementVisible("attachments-preview");
    await chatPage.isElementVisible("input-attachment-loader");
    await chatPage.isElementNotVisible("input-attachment-loader");

    await chatPage.sendUserMessage("Who painted this?");

    const userMessage = await chatPage.getRecentUserMessage();
    expect(userMessage.attachments).toHaveLength(1);

    await chatPage.isGenerationComplete();

    const assistantMessage = await chatPage.getRecentAssistantMessage();
    expect(assistantMessage.content).toBe("This painting is by Monet!");
  });

  test("Call weather tool", async () => {
    await chatPage.sendUserMessage("What's the weather in sf?");
    await chatPage.isGenerationComplete();

    const assistantMessage = await chatPage.getRecentAssistantMessage();

    expect(assistantMessage.content).toBe(
      "The current temperature in San Francisco is 17°C."
    );
  });

  test("Upvote message", async () => {
    await chatPage.sendUserMessage("Why is the sky blue?");
    await chatPage.isGenerationComplete();

    const assistantMessage = await chatPage.getRecentAssistantMessage();
    await assistantMessage.upvote();
    await chatPage.isVoteComplete();
  });

  test("Downvote message", async () => {
    await chatPage.sendUserMessage("Why is the sky blue?");
    await chatPage.isGenerationComplete();

    const assistantMessage = await chatPage.getRecentAssistantMessage();
    await assistantMessage.downvote();
    await chatPage.isVoteComplete();
  });

  test("Update vote", async () => {
    await chatPage.sendUserMessage("Why is the sky blue?");
    await chatPage.isGenerationComplete();

    const assistantMessage = await chatPage.getRecentAssistantMessage();
    await assistantMessage.upvote();
    await chatPage.isVoteComplete();

    await assistantMessage.downvote();
    await chatPage.isVoteComplete();
  });

  test("Downvote opens the reason panel and accepts a reason", async () => {
    await chatPage.sendUserMessage("Why is the sky blue?");
    await chatPage.isGenerationComplete();

    const assistantMessage = await chatPage.getRecentAssistantMessage();

    if (!assistantMessage) {
      throw new Error("No assistant message found");
    }

    // The thumb is recorded straight away, before any reason is given.
    await assistantMessage.downvote();
    await chatPage.isVoteComplete();

    await expect(assistantMessage.reasonPanel).toBeVisible();

    await assistantMessage.selectDownvoteReason("inaccurate-citation");
    await assistantMessage.fillDownvoteComment(
      "The verse cited does not say this."
    );
    await assistantMessage.submitDownvoteReason();
    await chatPage.isVoteComplete();

    await expect(assistantMessage.reasonPanel).not.toBeVisible();
  });

  test("Upvote does not open the reason panel", async () => {
    await chatPage.sendUserMessage("Why is the sky blue?");
    await chatPage.isGenerationComplete();

    const assistantMessage = await chatPage.getRecentAssistantMessage();

    if (!assistantMessage) {
      throw new Error("No assistant message found");
    }
    await assistantMessage.upvote();
    await chatPage.isVoteComplete();

    await expect(assistantMessage.reasonPanel).not.toBeVisible();
  });

  test("Feedback prompt appears once the conversation is substantive", async ({
    page,
  }) => {
    const feedbackPrompt = page.getByTestId("feedback-prompt");

    await chatPage.sendUserMessage("Why is the sky blue?");
    await chatPage.isGenerationComplete();

    // One exchange is below the threshold.
    await expect(feedbackPrompt).not.toBeVisible();

    await chatPage.sendUserMessage("Why is the sky blue?");
    await chatPage.isGenerationComplete();
    await chatPage.sendUserMessage("Why is the sky blue?");
    await chatPage.isGenerationComplete();

    await expect(feedbackPrompt).toBeVisible();

    await page.getByTestId("feedback-rating-4").click();
    await page
      .getByTestId("feedback-prompt-comment")
      .fill("Helpful, but I would like Hindi support.");
    await page.getByTestId("feedback-prompt-submit").click();
    await chatPage.isVoteComplete();

    await expect(feedbackPrompt).not.toBeVisible();
  });

  test("Feedback prompt stays dismissed", async ({ page }) => {
    const feedbackPrompt = page.getByTestId("feedback-prompt");

    for (let exchange = 0; exchange < 3; exchange++) {
      await chatPage.sendUserMessage("Why is the sky blue?");
      await chatPage.isGenerationComplete();
    }

    await expect(feedbackPrompt).toBeVisible();
    await page.getByTestId("feedback-prompt-dismiss").click();
    await expect(feedbackPrompt).not.toBeVisible();

    await page.reload();
    await expect(feedbackPrompt).not.toBeVisible();
  });

  test("Create message from url query", async ({ page }) => {
    await page.goto("/?query=Why is the sky blue?");

    await chatPage.isGenerationComplete();

    const userMessage = await chatPage.getRecentUserMessage();
    expect(userMessage.content).toBe("Why is the sky blue?");

    const assistantMessage = await chatPage.getRecentAssistantMessage();
    expect(assistantMessage.content).toContain("It's just blue duh!");
  });

  test("auto-scrolls to bottom after submitting new messages", async () => {
    test.fixme();
    await chatPage.sendMultipleMessages(5, (i) => `filling message #${i}`);
    await chatPage.waitForScrollToBottom();
  });

  test("scroll button appears when user scrolls up, hides on click", async () => {
    test.fixme();
    await chatPage.sendMultipleMessages(5, (i) => `filling message #${i}`);
    await expect(chatPage.scrollToBottomButton).not.toBeVisible();

    await chatPage.scrollToTop();
    await expect(chatPage.scrollToBottomButton).toBeVisible();

    await chatPage.scrollToBottomButton.click();
    await chatPage.waitForScrollToBottom();
    await expect(chatPage.scrollToBottomButton).not.toBeVisible();
  });
});
