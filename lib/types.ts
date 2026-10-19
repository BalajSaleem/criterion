import type { InferUITool, UIMessage } from "ai";
import { z } from "zod";

import type { queryQuran } from "./ai/tools/query-quran";
import type { queryHadith } from "./ai/tools/query-hadith";
import type { getQuranByReference } from "./ai/tools/get-quran-by-reference";
import type { getTafsir } from "./ai/tools/get-tafsir";
import type { searchScholarlyAnswers } from "./ai/tools/search-scholarly-answers";
import type { Suggestion } from "./db/schema";
import type { AppUsage } from "./usage";

export type DataPart = { type: "append-message"; message: string };

export const messageMetadataSchema = z.object({
  createdAt: z.string(),
});

export type MessageMetadata = z.infer<typeof messageMetadataSchema>;

type queryQuranTool = InferUITool<typeof queryQuran>;
type queryHadithTool = InferUITool<typeof queryHadith>;
type getQuranByReferenceTool = InferUITool<typeof getQuranByReference>;
type getTafsirTool = InferUITool<typeof getTafsir>;
type searchScholarlyAnswersTool = InferUITool<typeof searchScholarlyAnswers>;

export type ChatTools = {
  queryQuran: queryQuranTool;
  queryHadith: queryHadithTool;
  getQuranByReference: getQuranByReferenceTool;
  getTafsir: getTafsirTool;
  searchScholarlyAnswers: searchScholarlyAnswersTool;
};

export type CustomUIDataTypes = {
  textDelta: string;
  imageDelta: string;
  sheetDelta: string;
  codeDelta: string;
  suggestion: Suggestion;
  appendMessage: string;
  id: string;
  title: string;
  clear: null;
  finish: null;
  usage: AppUsage;
};

export type ChatMessage = UIMessage<
  MessageMetadata,
  CustomUIDataTypes,
  ChatTools
>;

export type Attachment = {
  name: string;
  url: string;
  contentType: string;
};
