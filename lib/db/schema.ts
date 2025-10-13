import type { InferSelectModel } from "drizzle-orm";
import {
  boolean,
  foreignKey,
  index,
  integer,
  json,
  jsonb,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uuid,
  varchar,
  vector,
} from "drizzle-orm/pg-core";
import type { AppUsage } from "../usage";

export const user = pgTable("User", {
  id: uuid("id").primaryKey().notNull().defaultRandom(),
  email: varchar("email", { length: 64 }).notNull(),
  password: varchar("password", { length: 64 }),
});

export type User = InferSelectModel<typeof user>;

export const chat = pgTable("Chat", {
  id: uuid("id").primaryKey().notNull().defaultRandom(),
  createdAt: timestamp("createdAt").notNull(),
  title: text("title").notNull(),
  userId: uuid("userId")
    .notNull()
    .references(() => user.id),
  visibility: varchar("visibility", { enum: ["public", "private"] })
    .notNull()
    .default("private"),
  lastContext: jsonb("lastContext").$type<AppUsage | null>(),
});

export type Chat = InferSelectModel<typeof chat>;

// DEPRECATED: The following schema is deprecated and will be removed in the future.
// Read the migration guide at https://chat-sdk.dev/docs/migration-guides/message-parts
export const messageDeprecated = pgTable("Message", {
  id: uuid("id").primaryKey().notNull().defaultRandom(),
  chatId: uuid("chatId")
    .notNull()
    .references(() => chat.id),
  role: varchar("role").notNull(),
  content: json("content").notNull(),
  createdAt: timestamp("createdAt").notNull(),
});

export type MessageDeprecated = InferSelectModel<typeof messageDeprecated>;

export const message = pgTable("Message_v2", {
  id: uuid("id").primaryKey().notNull().defaultRandom(),
  chatId: uuid("chatId")
    .notNull()
    .references(() => chat.id),
  role: varchar("role").notNull(),
  parts: json("parts").notNull(),
  attachments: json("attachments").notNull(),
  createdAt: timestamp("createdAt").notNull(),
});

export type DBMessage = InferSelectModel<typeof message>;

// DEPRECATED: The following schema is deprecated and will be removed in the future.
// Read the migration guide at https://chat-sdk.dev/docs/migration-guides/message-parts
export const voteDeprecated = pgTable(
  "Vote",
  {
    chatId: uuid("chatId")
      .notNull()
      .references(() => chat.id),
    messageId: uuid("messageId")
      .notNull()
      .references(() => messageDeprecated.id),
    isUpvoted: boolean("isUpvoted").notNull(),
  },
  (table) => {
    return {
      pk: primaryKey({ columns: [table.chatId, table.messageId] }),
    };
  }
);

export type VoteDeprecated = InferSelectModel<typeof voteDeprecated>;

export const vote = pgTable(
  "Vote_v2",
  {
    chatId: uuid("chatId")
      .notNull()
      .references(() => chat.id),
    messageId: uuid("messageId")
      .notNull()
      .references(() => message.id),
    isUpvoted: boolean("isUpvoted").notNull(),
  },
  (table) => {
    return {
      pk: primaryKey({ columns: [table.chatId, table.messageId] }),
    };
  }
);

export type Vote = InferSelectModel<typeof vote>;

export const document = pgTable(
  "Document",
  {
    id: uuid("id").notNull().defaultRandom(),
    createdAt: timestamp("createdAt").notNull(),
    title: text("title").notNull(),
    content: text("content"),
    kind: varchar("text", { enum: ["text", "code", "image", "sheet"] })
      .notNull()
      .default("text"),
    userId: uuid("userId")
      .notNull()
      .references(() => user.id),
  },
  (table) => {
    return {
      pk: primaryKey({ columns: [table.id, table.createdAt] }),
    };
  }
);

export type Document = InferSelectModel<typeof document>;

export const suggestion = pgTable(
  "Suggestion",
  {
    id: uuid("id").notNull().defaultRandom(),
    documentId: uuid("documentId").notNull(),
    documentCreatedAt: timestamp("documentCreatedAt").notNull(),
    originalText: text("originalText").notNull(),
    suggestedText: text("suggestedText").notNull(),
    description: text("description"),
    isResolved: boolean("isResolved").notNull().default(false),
    userId: uuid("userId")
      .notNull()
      .references(() => user.id),
    createdAt: timestamp("createdAt").notNull(),
  },
  (table) => ({
    pk: primaryKey({ columns: [table.id] }),
    documentRef: foreignKey({
      columns: [table.documentId, table.documentCreatedAt],
      foreignColumns: [document.id, document.createdAt],
    }),
  })
);

export type Suggestion = InferSelectModel<typeof suggestion>;

export const stream = pgTable(
  "Stream",
  {
    id: uuid("id").notNull().defaultRandom(),
    chatId: uuid("chatId").notNull(),
    createdAt: timestamp("createdAt").notNull(),
  },
  (table) => ({
    pk: primaryKey({ columns: [table.id] }),
    chatRef: foreignKey({
      columns: [table.chatId],
      foreignColumns: [chat.id],
    }),
  })
);

export type Stream = InferSelectModel<typeof stream>;

// Quran verses table
export const quranVerse = pgTable("QuranVerse", {
  id: uuid("id").primaryKey().notNull().defaultRandom(),
  surahNumber: integer("surahNumber").notNull(),
  ayahNumber: integer("ayahNumber").notNull(),
  surahNameEnglish: varchar("surahNameEnglish", { length: 100 }).notNull(),
  surahNameArabic: varchar("surahNameArabic", { length: 100 }).notNull(),
  textArabic: text("textArabic").notNull(),
  textEnglish: text("textEnglish").notNull(),
  createdAt: timestamp("createdAt").notNull().defaultNow(),
});

export type QuranVerse = InferSelectModel<typeof quranVerse>;

// Embeddings table for vector similarity search
export const quranEmbedding = pgTable(
  "QuranEmbedding",
  {
    id: uuid("id").primaryKey().notNull().defaultRandom(),
    verseId: uuid("verseId")
      .notNull()
      .references(() => quranVerse.id, { onDelete: "cascade" }),
    embedding: vector("embedding", { dimensions: 768 }).notNull(), // Gemini text-embedding-004
    content: text("content").notNull(), // English text for search
    createdAt: timestamp("createdAt").notNull().defaultNow(),
  },
  (table) => ({
    // HNSW index for fast similarity search
    embeddingIdx: index("embedding_hnsw_idx").using(
      "hnsw",
      table.embedding.op("vector_cosine_ops")
    ),
  })
);

export type QuranEmbedding = InferSelectModel<typeof quranEmbedding>;

// Hadith text table
export const hadithText = pgTable(
  "HadithText",
  {
    id: uuid("id").primaryKey().notNull().defaultRandom(),
    collection: varchar("collection", { length: 50 }).notNull(), // 'bukhari', 'muslim', etc.
    collectionName: varchar("collectionName", { length: 100 }).notNull(), // 'Sahih Bukhari'
    hadithNumber: integer("hadithNumber").notNull(),
    reference: varchar("reference", { length: 200 }).notNull(), // 'Sahih al-Bukhari 1'
    englishText: text("englishText").notNull(),
    arabicText: text("arabicText").notNull(),
    bookNumber: integer("bookNumber"),
    bookName: varchar("bookName", { length: 200 }),
    chapterNumber: integer("chapterNumber"),
    chapterName: text("chapterName"),
    grade: varchar("grade", { length: 50 }), // 'Sahih', 'Hasan', 'Da'if'
    narratorChain: text("narratorChain"),
    sourceUrl: varchar("sourceUrl", { length: 500 }),
    createdAt: timestamp("createdAt").notNull().defaultNow(),
  },
  (table) => ({
    // Indexes for filtering
    collectionIdx: index("hadith_collection_idx").on(table.collection),
    gradeIdx: index("hadith_grade_idx").on(table.grade),
    // GIN index for full-text search (will be created via migration)
    // searchIdx: index("hadith_search_idx").using("gin", sql`to_tsvector('english', ${table.englishText})`),
  })
);

export type HadithText = InferSelectModel<typeof hadithText>;

// Hadith embeddings for vector similarity search
export const hadithEmbedding = pgTable(
  "HadithEmbedding",
  {
    id: uuid("id").primaryKey().notNull().defaultRandom(),
    hadithId: uuid("hadithId")
      .notNull()
      .references(() => hadithText.id, { onDelete: "cascade" }),
    embedding: vector("embedding", { dimensions: 768 }).notNull(), // Gemini text-embedding-004
    content: text("content").notNull(), // English text for search
    createdAt: timestamp("createdAt").notNull().defaultNow(),
  },
  (table) => ({
    // HNSW index for fast similarity search
    embeddingIdx: index("hadith_embedding_hnsw_idx").using(
      "hnsw",
      table.embedding.op("vector_cosine_ops")
    ),
  })
);

export type HadithEmbedding = InferSelectModel<typeof hadithEmbedding>;
