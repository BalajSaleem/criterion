import type { InferUITool, UIMessage } from "ai";
import { z } from "zod";
import type { getQuranByReference } from "./ai/tools/get-quran-by-reference";
import type { queryHadith } from "./ai/tools/query-hadith";
import type { queryQuran } from "./ai/tools/query-quran";
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

export type ChatTools = {
  queryQuran: queryQuranTool;
  queryHadith: queryHadithTool;
  getQuranByReference: getQuranByReferenceTool;
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
  /**
   * Citation guard signal. `regenerating` means the streamed answer failed
   * verification and is being replaced; `fallback` carries the localized text
   * to show when a corrective retry also failed.
   */
  verification: { status: "regenerating" | "fallback"; text?: string };
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
