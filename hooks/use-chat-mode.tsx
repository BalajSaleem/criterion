"use client";

import {
  createContext,
  startTransition,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { saveChatModeAsCookie } from "@/app/(chat)/actions";
import { type ChatMode, DEFAULT_CHAT_MODE } from "@/lib/ai/modes";

type ChatModeContextValue = {
  mode: ChatMode;
  setMode: (mode: ChatMode) => void;
};

export const ChatModeContext = createContext<ChatModeContextValue>({
  mode: DEFAULT_CHAT_MODE,
  setMode: () => {},
});

/**
 * Owns the chat mode for a Chat. Returns the context value to provide, plus a
 * ref that always holds the latest mode (read when sending a message).
 */
export function useChatModeState(initialMode: ChatMode, persist: boolean) {
  const [mode, setModeState] = useState<ChatMode>(initialMode);
  const modeRef = useRef(mode);

  useEffect(() => {
    modeRef.current = mode;
  }, [mode]);

  // Entry points like /muslim choose the mode; remember it for later visits
  useEffect(() => {
    if (persist) {
      saveChatModeAsCookie(initialMode);
    }
  }, [persist, initialMode]);

  const setMode = useCallback((next: ChatMode) => {
    setModeState(next);
    modeRef.current = next;
    startTransition(() => {
      saveChatModeAsCookie(next);
    });
  }, []);

  const value = useMemo(() => ({ mode, setMode }), [mode, setMode]);

  return { value, modeRef };
}

export const useChatMode = () => useContext(ChatModeContext);
