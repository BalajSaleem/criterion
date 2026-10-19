import { cookies } from "next/headers";
import { notFound, redirect } from "next/navigation";

import { auth } from "@/app/(auth)/auth";
import { Chat } from "@/components/chat";
import { CHAT_MODE_COOKIE, isChatMode } from "@/lib/ai/modes";
import { DEFAULT_CHAT_MODEL } from "@/lib/ai/models";
import { getChatById, getMessagesByChatId } from "@/lib/db/queries";
import { convertToUIMessages } from "@/lib/utils";
import { createPageMetadata } from "@/lib/seo/metadata";

export const metadata = createPageMetadata({
  title: "Chat - Criterion",
  description: "Ask questions about Islam, the Quran, and Hadith. Get authentic answers from Islamic sources with an AI-powered guide.",
  path: "/chat",
  keywords: [
    "Islamic chat",
    "ask about Islam",
    "Quran questions",
    "Hadith questions",
    "Islamic AI assistant",
  ],
  noIndex: true, // Don't index individual chat pages
});

export default async function Page(props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const { id } = params;
  const chat = await getChatById({ id });

  if (!chat) {
    notFound();
  }

  const session = await auth();

  if (!session) {
    redirect("/api/auth/guest");
  }

  if (chat.visibility === "private") {
    if (!session.user) {
      return notFound();
    }

    if (session.user.id !== chat.userId) {
      return notFound();
    }
  }

  const messagesFromDb = await getMessagesByChatId({
    id,
  });

  const uiMessages = convertToUIMessages(messagesFromDb);

  const cookieStore = await cookies();
  const chatModelFromCookie = cookieStore.get("chat-model");
  const modeFromCookie = cookieStore.get(CHAT_MODE_COOKIE)?.value;

  return (
    <Chat
      autoResume={true}
      id={chat.id}
      initialChatModel={chatModelFromCookie?.value ?? DEFAULT_CHAT_MODEL}
      initialLastContext={chat.lastContext ?? undefined}
      initialMessages={uiMessages}
      initialMode={isChatMode(modeFromCookie) ? modeFromCookie : undefined}
      initialVisibilityType={chat.visibility}
      isReadonly={session?.user?.id !== chat.userId}
    />
  );
}
