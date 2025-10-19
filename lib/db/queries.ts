import "server-only";

import {
  and,
  asc,
  count,
  desc,
  eq,
  gt,
  gte,
  inArray,
  lt,
  lte,
  type SQL,
} from "drizzle-orm";
import type { VisibilityType } from "@/components/visibility-selector";
import { ChatSDKError } from "../errors";
import type { AppUsage } from "../usage";
import { generateUUID } from "../utils";
import { db } from "./index";
import {
  type Chat,
  chat,
  type DBMessage,
  document,
  message,
  type Suggestion,
  stream,
  suggestion,
  type User,
  user,
  vote,
} from "./schema";
import { generateHashedPassword } from "./utils";

// Optionally, if not using email/pass login, you can
// use the Drizzle adapter for Auth.js / NextAuth
// https://authjs.dev/reference/adapter/drizzle

export async function getUser(email: string): Promise<User[]> {
  try {
    return await db.select().from(user).where(eq(user.email, email));
  } catch (_error) {
    throw new ChatSDKError(
      "bad_request:database",
      "Failed to get user by email"
    );
  }
}

export async function createUser(email: string, password: string) {
  const hashedPassword = generateHashedPassword(password);

  try {
    return await db.insert(user).values({ email, password: hashedPassword });
  } catch (_error) {
    throw new ChatSDKError("bad_request:database", "Failed to create user");
  }
}

export async function createGuestUser() {
  const email = `guest-${Date.now()}`;
  const password = generateHashedPassword(generateUUID());

  try {
    return await db.insert(user).values({ email, password }).returning({
      id: user.id,
      email: user.email,
    });
  } catch (_error) {
    throw new ChatSDKError(
      "bad_request:database",
      "Failed to create guest user"
    );
  }
}

export async function saveChat({
  id,
  userId,
  title,
  visibility,
}: {
  id: string;
  userId: string;
  title: string;
  visibility: VisibilityType;
}) {
  try {
    return await db.insert(chat).values({
      id,
      createdAt: new Date(),
      userId,
      title,
      visibility,
    });
  } catch (_error) {
    throw new ChatSDKError("bad_request:database", "Failed to save chat");
  }
}

export async function deleteChatById({ id }: { id: string }) {
  try {
    await db.delete(vote).where(eq(vote.chatId, id));
    await db.delete(message).where(eq(message.chatId, id));
    await db.delete(stream).where(eq(stream.chatId, id));

    const [chatsDeleted] = await db
      .delete(chat)
      .where(eq(chat.id, id))
      .returning();
    return chatsDeleted;
  } catch (_error) {
    throw new ChatSDKError(
      "bad_request:database",
      "Failed to delete chat by id"
    );
  }
}

export async function getChatsByUserId({
  id,
  limit,
  startingAfter,
  endingBefore,
}: {
  id: string;
  limit: number;
  startingAfter: string | null;
  endingBefore: string | null;
}) {
  try {
    const extendedLimit = limit + 1;

    const query = (whereCondition?: SQL<any>) =>
      db
        .select()
        .from(chat)
        .where(
          whereCondition
            ? and(whereCondition, eq(chat.userId, id))
            : eq(chat.userId, id)
        )
        .orderBy(desc(chat.createdAt))
        .limit(extendedLimit);

    let filteredChats: Chat[] = [];

    if (startingAfter) {
      const [selectedChat] = await db
        .select()
        .from(chat)
        .where(eq(chat.id, startingAfter))
        .limit(1);

      if (!selectedChat) {
        throw new ChatSDKError(
          "not_found:database",
          `Chat with id ${startingAfter} not found`
        );
      }

      filteredChats = await query(gt(chat.createdAt, selectedChat.createdAt));
    } else if (endingBefore) {
      const [selectedChat] = await db
        .select()
        .from(chat)
        .where(eq(chat.id, endingBefore))
        .limit(1);

      if (!selectedChat) {
        throw new ChatSDKError(
          "not_found:database",
          `Chat with id ${endingBefore} not found`
        );
      }

      filteredChats = await query(lt(chat.createdAt, selectedChat.createdAt));
    } else {
      filteredChats = await query();
    }

    const hasMore = filteredChats.length > limit;

    return {
      chats: hasMore ? filteredChats.slice(0, limit) : filteredChats,
      hasMore,
    };
  } catch (_error) {
    throw new ChatSDKError(
      "bad_request:database",
      "Failed to get chats by user id"
    );
  }
}

export async function getChatById({ id }: { id: string }) {
  try {
    const [selectedChat] = await db.select().from(chat).where(eq(chat.id, id));
    if (!selectedChat) {
      return null;
    }

    return selectedChat;
  } catch (_error) {
    throw new ChatSDKError("bad_request:database", "Failed to get chat by id");
  }
}

export async function saveMessages({ messages }: { messages: DBMessage[] }) {
  try {
    return await db.insert(message).values(messages);
  } catch (_error) {
    throw new ChatSDKError("bad_request:database", "Failed to save messages");
  }
}

export async function getMessagesByChatId({ id }: { id: string }) {
  try {
    return await db
      .select()
      .from(message)
      .where(eq(message.chatId, id))
      .orderBy(asc(message.createdAt));
  } catch (_error) {
    throw new ChatSDKError(
      "bad_request:database",
      "Failed to get messages by chat id"
    );
  }
}

export async function voteMessage({
  chatId,
  messageId,
  type,
}: {
  chatId: string;
  messageId: string;
  type: "up" | "down";
}) {
  try {
    const [existingVote] = await db
      .select()
      .from(vote)
      .where(and(eq(vote.messageId, messageId)));

    if (existingVote) {
      return await db
        .update(vote)
        .set({ isUpvoted: type === "up" })
        .where(and(eq(vote.messageId, messageId), eq(vote.chatId, chatId)));
    }
    return await db.insert(vote).values({
      chatId,
      messageId,
      isUpvoted: type === "up",
    });
  } catch (_error) {
    throw new ChatSDKError("bad_request:database", "Failed to vote message");
  }
}

export async function getVotesByChatId({ id }: { id: string }) {
  try {
    return await db.select().from(vote).where(eq(vote.chatId, id));
  } catch (_error) {
    throw new ChatSDKError(
      "bad_request:database",
      "Failed to get votes by chat id"
    );
  }
}

export async function saveDocument({
  id,
  title,
  kind,
  content,
  userId,
}: {
  id: string;
  title: string;
  kind: "text" | "code" | "image" | "sheet";
  content: string;
  userId: string;
}) {
  try {
    return await db
      .insert(document)
      .values({
        id,
        title,
        kind,
        content,
        userId,
        createdAt: new Date(),
      })
      .returning();
  } catch (_error) {
    throw new ChatSDKError("bad_request:database", "Failed to save document");
  }
}

export async function getDocumentsById({ id }: { id: string }) {
  try {
    const documents = await db
      .select()
      .from(document)
      .where(eq(document.id, id))
      .orderBy(asc(document.createdAt));

    return documents;
  } catch (_error) {
    throw new ChatSDKError(
      "bad_request:database",
      "Failed to get documents by id"
    );
  }
}

export async function getDocumentById({ id }: { id: string }) {
  try {
    const [selectedDocument] = await db
      .select()
      .from(document)
      .where(eq(document.id, id))
      .orderBy(desc(document.createdAt));

    return selectedDocument;
  } catch (_error) {
    throw new ChatSDKError(
      "bad_request:database",
      "Failed to get document by id"
    );
  }
}

export async function deleteDocumentsByIdAfterTimestamp({
  id,
  timestamp,
}: {
  id: string;
  timestamp: Date;
}) {
  try {
    await db
      .delete(suggestion)
      .where(
        and(
          eq(suggestion.documentId, id),
          gt(suggestion.documentCreatedAt, timestamp)
        )
      );

    return await db
      .delete(document)
      .where(and(eq(document.id, id), gt(document.createdAt, timestamp)))
      .returning();
  } catch (_error) {
    throw new ChatSDKError(
      "bad_request:database",
      "Failed to delete documents by id after timestamp"
    );
  }
}

export async function saveSuggestions({
  suggestions,
}: {
  suggestions: Suggestion[];
}) {
  try {
    return await db.insert(suggestion).values(suggestions);
  } catch (_error) {
    throw new ChatSDKError(
      "bad_request:database",
      "Failed to save suggestions"
    );
  }
}

export async function getSuggestionsByDocumentId({
  documentId,
}: {
  documentId: string;
}) {
  try {
    return await db
      .select()
      .from(suggestion)
      .where(and(eq(suggestion.documentId, documentId)));
  } catch (_error) {
    throw new ChatSDKError(
      "bad_request:database",
      "Failed to get suggestions by document id"
    );
  }
}

export async function getMessageById({ id }: { id: string }) {
  try {
    return await db.select().from(message).where(eq(message.id, id));
  } catch (_error) {
    throw new ChatSDKError(
      "bad_request:database",
      "Failed to get message by id"
    );
  }
}

export async function deleteMessagesByChatIdAfterTimestamp({
  chatId,
  timestamp,
}: {
  chatId: string;
  timestamp: Date;
}) {
  try {
    const messagesToDelete = await db
      .select({ id: message.id })
      .from(message)
      .where(
        and(eq(message.chatId, chatId), gte(message.createdAt, timestamp))
      );

    const messageIds = messagesToDelete.map(
      (currentMessage) => currentMessage.id
    );

    if (messageIds.length > 0) {
      await db
        .delete(vote)
        .where(
          and(eq(vote.chatId, chatId), inArray(vote.messageId, messageIds))
        );

      return await db
        .delete(message)
        .where(
          and(eq(message.chatId, chatId), inArray(message.id, messageIds))
        );
    }
  } catch (_error) {
    throw new ChatSDKError(
      "bad_request:database",
      "Failed to delete messages by chat id after timestamp"
    );
  }
}

export async function updateChatVisiblityById({
  chatId,
  visibility,
}: {
  chatId: string;
  visibility: "private" | "public";
}) {
  try {
    return await db.update(chat).set({ visibility }).where(eq(chat.id, chatId));
  } catch (_error) {
    throw new ChatSDKError(
      "bad_request:database",
      "Failed to update chat visibility by id"
    );
  }
}

export async function updateChatTitleById({
  chatId,
  title,
}: {
  chatId: string;
  title: string;
}) {
  try {
    return await db.update(chat).set({ title }).where(eq(chat.id, chatId));
  } catch (_error) {
    throw new ChatSDKError(
      "bad_request:database",
      "Failed to update chat title by id"
    );
  }
}

export async function updateChatLastContextById({
  chatId,
  context,
}: {
  chatId: string;
  // Store merged server-enriched usage object
  context: AppUsage;
}) {
  try {
    return await db
      .update(chat)
      .set({ lastContext: context })
      .where(eq(chat.id, chatId));
  } catch (error) {
    console.warn("Failed to update lastContext for chat", chatId, error);
    return;
  }
}

export async function getMessageCountByUserId({
  id,
  differenceInHours,
}: {
  id: string;
  differenceInHours: number;
}) {
  try {
    const twentyFourHoursAgo = new Date(
      Date.now() - differenceInHours * 60 * 60 * 1000
    );

    const [stats] = await db
      .select({ count: count(message.id) })
      .from(message)
      .innerJoin(chat, eq(message.chatId, chat.id))
      .where(
        and(
          eq(chat.userId, id),
          gte(message.createdAt, twentyFourHoursAgo),
          eq(message.role, "user")
        )
      )
      .execute();

    return stats?.count ?? 0;
  } catch (_error) {
    throw new ChatSDKError(
      "bad_request:database",
      "Failed to get message count by user id"
    );
  }
}

export async function createStreamId({
  streamId,
  chatId,
}: {
  streamId: string;
  chatId: string;
}) {
  try {
    await db
      .insert(stream)
      .values({ id: streamId, chatId, createdAt: new Date() });
  } catch (_error) {
    throw new ChatSDKError(
      "bad_request:database",
      "Failed to create stream id"
    );
  }
}

export async function getStreamIdsByChatId({ chatId }: { chatId: string }) {
  try {
    const streamIds = await db
      .select({ id: stream.id })
      .from(stream)
      .where(eq(stream.chatId, chatId))
      .orderBy(asc(stream.createdAt))
      .execute();

    return streamIds.map(({ id }) => id);
  } catch (_error) {
    throw new ChatSDKError(
      "bad_request:database",
      "Failed to get stream ids by chat id"
    );
  }
}

// =======================
// Quran Queries
// =======================

export async function getVersesBySurah({
  surahNumber,
  language = "en",
}: {
  surahNumber: number;
  language?: string;
}) {
  try {
    const { quranVerse, quranTranslation } = await import("./schema");

    // Fast path: English (no JOIN)
    if (language === "en") {
      const verses = await db
        .select()
        .from(quranVerse)
        .where(eq(quranVerse.surahNumber, surahNumber))
        .orderBy(asc(quranVerse.ayahNumber))
        .execute();

      return verses.map((v) => ({
        ...v,
        translation: v.textEnglish,
        surahNameTranslated: v.surahNameEnglish,
        translatorName: null,
      }));
    }

    // Other languages: JOIN with translations
    const verses = await db
      .select({
        id: quranVerse.id,
        surahNumber: quranVerse.surahNumber,
        ayahNumber: quranVerse.ayahNumber,
        surahNameArabic: quranVerse.surahNameArabic,
        surahNameEnglish: quranVerse.surahNameEnglish,
        textArabic: quranVerse.textArabic,
        textEnglish: quranVerse.textEnglish,
        createdAt: quranVerse.createdAt,
        translation: quranTranslation.text,
        surahNameTranslated: quranTranslation.surahNameTranslated,
        surahNameTransliterated: quranTranslation.surahNameTransliterated,
        translatorName: quranTranslation.translatorName,
      })
      .from(quranVerse)
      .leftJoin(
        quranTranslation,
        and(
          eq(quranTranslation.verseId, quranVerse.id),
          eq(quranTranslation.language, language),
          eq(quranTranslation.isDefault, true)
        )
      )
      .where(eq(quranVerse.surahNumber, surahNumber))
      .orderBy(asc(quranVerse.ayahNumber))
      .execute();

    // Fallback to English if translation not found
    return verses.map((v) => ({
      ...v,
      translation: v.translation || v.textEnglish,
      surahNameTranslated: v.surahNameTranslated || v.surahNameEnglish,
    }));
  } catch (error) {
    console.error("Failed to get verses by surah:", error);
    throw new ChatSDKError(
      "bad_request:database",
      "Failed to get verses by surah"
    );
  }
}

export async function getVerseWithContext({
  surahNumber,
  ayahNumber,
  contextWindow = 5,
  language = "en",
}: {
  surahNumber: number;
  ayahNumber: number;
  contextWindow?: number;
  language?: string;
}) {
  try {
    const { quranVerse, quranTranslation } = await import("./schema");

    // Fast path: English (no JOIN)
    if (language === "en") {
      // Get the target verse
      const [targetVerse] = await db
        .select()
        .from(quranVerse)
        .where(
          and(
            eq(quranVerse.surahNumber, surahNumber),
            eq(quranVerse.ayahNumber, ayahNumber)
          )
        )
        .limit(1)
        .execute();

      if (!targetVerse) {
        return null;
      }

      // Get context before
      const contextBefore = await db
        .select()
        .from(quranVerse)
        .where(
          and(
            eq(quranVerse.surahNumber, surahNumber),
            gte(quranVerse.ayahNumber, ayahNumber - contextWindow),
            lt(quranVerse.ayahNumber, ayahNumber)
          )
        )
        .orderBy(asc(quranVerse.ayahNumber))
        .execute();

      // Get context after
      const contextAfter = await db
        .select()
        .from(quranVerse)
        .where(
          and(
            eq(quranVerse.surahNumber, surahNumber),
            gt(quranVerse.ayahNumber, ayahNumber),
            lte(quranVerse.ayahNumber, ayahNumber + contextWindow)
          )
        )
        .orderBy(asc(quranVerse.ayahNumber))
        .execute();

      return {
        target: {
          ...targetVerse,
          translation: targetVerse.textEnglish,
          surahNameTranslated: targetVerse.surahNameEnglish,
          translatorName: null,
        },
        contextBefore: contextBefore.map((v) => ({
          ...v,
          translation: v.textEnglish,
          surahNameTranslated: v.surahNameEnglish,
          translatorName: null,
        })),
        contextAfter: contextAfter.map((v) => ({
          ...v,
          translation: v.textEnglish,
          surahNameTranslated: v.surahNameEnglish,
          translatorName: null,
        })),
      };
    }

    // Other languages: JOIN with translations
    const [targetVerse] = await db
      .select({
        id: quranVerse.id,
        surahNumber: quranVerse.surahNumber,
        ayahNumber: quranVerse.ayahNumber,
        surahNameArabic: quranVerse.surahNameArabic,
        surahNameEnglish: quranVerse.surahNameEnglish,
        textArabic: quranVerse.textArabic,
        textEnglish: quranVerse.textEnglish,
        createdAt: quranVerse.createdAt,
        translation: quranTranslation.text,
        surahNameTranslated: quranTranslation.surahNameTranslated,
        surahNameTransliterated: quranTranslation.surahNameTransliterated,
        translatorName: quranTranslation.translatorName,
      })
      .from(quranVerse)
      .leftJoin(
        quranTranslation,
        and(
          eq(quranTranslation.verseId, quranVerse.id),
          eq(quranTranslation.language, language),
          eq(quranTranslation.isDefault, true)
        )
      )
      .where(
        and(
          eq(quranVerse.surahNumber, surahNumber),
          eq(quranVerse.ayahNumber, ayahNumber)
        )
      )
      .limit(1)
      .execute();

    if (!targetVerse) {
      return null;
    }

    // Get context before
    const contextBefore = await db
      .select({
        id: quranVerse.id,
        surahNumber: quranVerse.surahNumber,
        ayahNumber: quranVerse.ayahNumber,
        surahNameArabic: quranVerse.surahNameArabic,
        surahNameEnglish: quranVerse.surahNameEnglish,
        textArabic: quranVerse.textArabic,
        textEnglish: quranVerse.textEnglish,
        createdAt: quranVerse.createdAt,
        translation: quranTranslation.text,
        surahNameTranslated: quranTranslation.surahNameTranslated,
        surahNameTransliterated: quranTranslation.surahNameTransliterated,
        translatorName: quranTranslation.translatorName,
      })
      .from(quranVerse)
      .leftJoin(
        quranTranslation,
        and(
          eq(quranTranslation.verseId, quranVerse.id),
          eq(quranTranslation.language, language),
          eq(quranTranslation.isDefault, true)
        )
      )
      .where(
        and(
          eq(quranVerse.surahNumber, surahNumber),
          gte(quranVerse.ayahNumber, ayahNumber - contextWindow),
          lt(quranVerse.ayahNumber, ayahNumber)
        )
      )
      .orderBy(asc(quranVerse.ayahNumber))
      .execute();

    // Get context after
    const contextAfter = await db
      .select({
        id: quranVerse.id,
        surahNumber: quranVerse.surahNumber,
        ayahNumber: quranVerse.ayahNumber,
        surahNameArabic: quranVerse.surahNameArabic,
        surahNameEnglish: quranVerse.surahNameEnglish,
        textArabic: quranVerse.textArabic,
        textEnglish: quranVerse.textEnglish,
        createdAt: quranVerse.createdAt,
        translation: quranTranslation.text,
        surahNameTranslated: quranTranslation.surahNameTranslated,
        surahNameTransliterated: quranTranslation.surahNameTransliterated,
        translatorName: quranTranslation.translatorName,
      })
      .from(quranVerse)
      .leftJoin(
        quranTranslation,
        and(
          eq(quranTranslation.verseId, quranVerse.id),
          eq(quranTranslation.language, language),
          eq(quranTranslation.isDefault, true)
        )
      )
      .where(
        and(
          eq(quranVerse.surahNumber, surahNumber),
          gt(quranVerse.ayahNumber, ayahNumber),
          lte(quranVerse.ayahNumber, ayahNumber + contextWindow)
        )
      )
      .orderBy(asc(quranVerse.ayahNumber))
      .execute();

    return {
      target: {
        ...targetVerse,
        translation: targetVerse.translation || targetVerse.textEnglish,
        surahNameTranslated:
          targetVerse.surahNameTranslated || targetVerse.surahNameEnglish,
      },
      contextBefore: contextBefore.map((v) => ({
        ...v,
        translation: v.translation || v.textEnglish,
        surahNameTranslated: v.surahNameTranslated || v.surahNameEnglish,
      })),
      contextAfter: contextAfter.map((v) => ({
        ...v,
        translation: v.translation || v.textEnglish,
        surahNameTranslated: v.surahNameTranslated || v.surahNameEnglish,
      })),
    };
  } catch (error) {
    console.error("Failed to get verse with context:", error);
    throw new ChatSDKError(
      "bad_request:database",
      "Failed to get verse with context"
    );
  }
}

export async function getVerseBySurahAndAyah({
  surahNumber,
  ayahNumber,
  language = "en",
}: {
  surahNumber: number;
  ayahNumber: number;
  language?: string;
}) {
  try {
    const { quranVerse, quranTranslation } = await import("./schema");

    // Fast path: English (no JOIN)
    if (language === "en") {
      const [verse] = await db
        .select()
        .from(quranVerse)
        .where(
          and(
            eq(quranVerse.surahNumber, surahNumber),
            eq(quranVerse.ayahNumber, ayahNumber)
          )
        )
        .limit(1)
        .execute();

      if (!verse) {
        return null;
      }

      return {
        ...verse,
        translation: verse.textEnglish,
        surahNameTranslated: verse.surahNameEnglish,
        translatorName: null,
      };
    }

    // Other languages: JOIN with translations
    const [verse] = await db
      .select({
        id: quranVerse.id,
        surahNumber: quranVerse.surahNumber,
        ayahNumber: quranVerse.ayahNumber,
        surahNameArabic: quranVerse.surahNameArabic,
        surahNameEnglish: quranVerse.surahNameEnglish,
        textArabic: quranVerse.textArabic,
        textEnglish: quranVerse.textEnglish,
        createdAt: quranVerse.createdAt,
        translation: quranTranslation.text,
        surahNameTranslated: quranTranslation.surahNameTranslated,
        surahNameTransliterated: quranTranslation.surahNameTransliterated,
        translatorName: quranTranslation.translatorName,
      })
      .from(quranVerse)
      .leftJoin(
        quranTranslation,
        and(
          eq(quranTranslation.verseId, quranVerse.id),
          eq(quranTranslation.language, language),
          eq(quranTranslation.isDefault, true)
        )
      )
      .where(
        and(
          eq(quranVerse.surahNumber, surahNumber),
          eq(quranVerse.ayahNumber, ayahNumber)
        )
      )
      .limit(1)
      .execute();

    if (!verse) {
      return null;
    }

    return {
      ...verse,
      translation: verse.translation || verse.textEnglish,
      surahNameTranslated: verse.surahNameTranslated || verse.surahNameEnglish,
    };
  } catch (error) {
    console.error("Failed to get verse by surah and ayah:", error);
    throw new ChatSDKError(
      "bad_request:database",
      "Failed to get verse by surah and ayah"
    );
  }
}
