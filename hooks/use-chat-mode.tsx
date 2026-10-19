"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  CHAT_MODE_COOKIE,
  type ChatMode,
  DEFAULT_CHAT_MODE,
} from "@/lib/ai/modes";

type ChatModeContextValue = {
  mode: ChatMode;
  setMode: (mode: ChatMode) => void;
};

export const ChatModeContext = createContext<ChatModeContextValue>({
  mode: DEFAULT_CHAT_MODE,
  setMode: () => {},
});

// Written client-side on purpose: a server action would refresh the current
// route, which races with the URL switching to /chat/[id] on first message.
function saveChatModeCookie(mode: ChatMode) {
  document.cookie = `${CHAT_MODE_COOKIE}=${mode}; path=/; max-age=${60 * 60 * 24 * 365}; samesite=lax`;
}

/**
 * Owns the chat mode for a Chat. Returns the context value to provide, plus a
 * ref that always holds the latest mode (read when sending a message).
 */
export function useChatModeState(initialMode: ChatMode, persist: boolean) {
  const [mode, setModeState] = useState<ChatMode>(initialMode);
  const modeRef = useRef(mode);

  // Entry points like /muslim choose the mode; remember it for later visits
  useEffect(() => {
    if (persist) {
      saveChatModeCookie(initialMode);
    }
  }, [persist, initialMode]);

  const setMode = useCallback((next: ChatMode) => {
    setModeState(next);
    modeRef.current = next;
    saveChatModeCookie(next);
  }, []);

  const value = useMemo(() => ({ mode, setMode }), [mode, setMode]);

  return { value, modeRef };
}

export const useChatMode = () => useContext(ChatModeContext);
