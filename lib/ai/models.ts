export const DEFAULT_CHAT_MODEL: string = "chat-model";

export type ChatModel = {
  id: string;
  name: string;
  description: string;
};

export const chatModels: ChatModel[] = [
  {
    id: "chat-model",
    name: "Talk",
    description: "General purpose conversational model",
  },
  {
    id: "chat-model-reasoning",
    name: "Reason",
    description:
      "Uses advanced chain-of-thought reasoning for complex problems",
  },
];
