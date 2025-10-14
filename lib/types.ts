import type { InferUITool, UIMessage } from "ai";
import { z } from "zod";

import type { queryQuran } from "./ai/tools/query-quran";
import type { queryHadith } from "./ai/tools/query-hadith";
import type { requestSuggestions } from "./ai/tools/request-suggestions";
import type { Suggestion } from "./db/schema";
import type { AppUsage } from "./usage";

export type DataPart = { type: "append-message"; message: string };

export const messageMetadataSchema = z.object({
  createdAt: z.string(),
});

export type MessageMetadata = z.infer<typeof messageMetadataSchema>;

type requestSuggestionsTool = InferUITool<
  ReturnType<typeof requestSuggestions>
>;
type queryQuranTool = InferUITool<typeof queryQuran>;
type queryHadithTool = InferUITool<typeof queryHadith>;

export type ChatTools = {
  requestSuggestions: requestSuggestionsTool;
  queryQuran: queryQuranTool;
  queryHadith: queryHadithTool;
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
