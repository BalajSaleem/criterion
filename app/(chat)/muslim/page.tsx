import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { Chat } from "@/components/chat";
import { DEFAULT_CHAT_MODEL } from "@/lib/ai/models";
import { isBot } from "@/lib/bot-detection";
import { createPageMetadata } from "@/lib/seo/metadata";
import { generateUUID } from "@/lib/utils";
import { auth } from "../../(auth)/auth";

export const metadata = createPageMetadata({
  title: "Criterion for Muslims - Go Deeper Into Your Deen",
  description:
    "Ask about salah, fasting, zakah, family, finance and your iman. Answers grounded in the Quran, authentic Hadith, classical tafsir (Ibn Kathir, Al-Mukhtasar) and scholars' fatwas, sticking to the agreed-upon path.",
  path: "/muslim",
  keywords: [
    "Islamic rulings",
    "fiqh questions",
    "tafsir Ibn Kathir",
    "fatwa",
    "Muslim questions",
    "learn your deen",
  ],
});

export default async function Page() {
  const userAgent = (await headers()).get("user-agent") || "";
  const cookieStore = await cookies();

  if (!isBot(userAgent)) {
    const session = await auth();
    if (!session) redirect("/api/auth/guest");
  }

  const modelId = cookieStore.get("chat-model")?.value || DEFAULT_CHAT_MODEL;
  const id = generateUUID();

  return (
    <Chat
      autoResume={false}
      id={id}
      initialChatModel={modelId}
      initialMessages={[]}
      initialMode="muslim"
      initialVisibilityType="private"
      isReadonly={false}
      key={id}
      persistInitialMode
    />
  );
}
