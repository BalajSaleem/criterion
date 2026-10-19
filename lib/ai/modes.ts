export type ChatMode = "seeker" | "muslim";

export const DEFAULT_CHAT_MODE: ChatMode = "seeker";

export const CHAT_MODE_COOKIE = "chat-mode";

export const isChatMode = (value: unknown): value is ChatMode =>
  value === "seeker" || value === "muslim";
