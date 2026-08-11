import { expect, test } from "../fixtures";
import { ChatPage } from "../pages/chat";

test.describe("chat activity with reasoning", () => {
  let chatPage: ChatPage;

  test.beforeEach(async ({ curieContext }) => {
    chatPage = new ChatPage(curieContext.page);
    await chatPage.createNewChat();
  });

  test("Curie can send message and generate response without seeing reasoning", async () => {
    await chatPage.sendUserMessage("Why is the sky blue?");
    await chatPage.isGenerationComplete();

    const assistantMessage = await chatPage.getRecentAssistantMessage();
    expect(assistantMessage.content).toBe("It's just blue duh!");

    expect(assistantMessage.reasoning).toBeNull();
  });

  test("reasoning tokens are never rendered", async ({ curieContext }) => {
    await chatPage.sendUserMessage("Why is the sky blue?");
    await chatPage.isGenerationComplete();

    const assistantMessage = await chatPage.getRecentAssistantMessage();
    await expect(
      assistantMessage.element.getByTestId("message-reasoning")
    ).toHaveCount(0);

    await expect(curieContext.page.locator("body")).not.toContainText(
      "rayleigh scattering"
    );
  });

  test("Curie can edit message and resubmit", async () => {
    await chatPage.sendUserMessage("Why is the sky blue?");
    await chatPage.isGenerationComplete();

    const userMessage = await chatPage.getRecentUserMessage();

    await userMessage.edit("Why is grass green?");
    await chatPage.isGenerationComplete();

    const updatedAssistantMessage = await chatPage.getRecentAssistantMessage();

    expect(updatedAssistantMessage.content).toBe("It's just green duh!");

    expect(updatedAssistantMessage.reasoning).toBeNull();
  });
});
