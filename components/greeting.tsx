import { motion } from "framer-motion";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { useChatMode } from "@/hooks/use-chat-mode";
import { ModeToggle } from "./mode-toggle";

export const Greeting = () => {
  const t = useTranslations("chat");
  const tMuslim = useTranslations("muslim");
  const { mode } = useChatMode();
  const isMuslimMode = mode === "muslim";

  return (
    <div
      className="mx-auto mt-4 flex size-full max-w-3xl flex-col justify-center px-4 md:mt-16 md:px-8"
      key="overview"
    >
      {/* Clean centered text for mobile and desktop */}
      <motion.div
        animate={{ opacity: 1, y: 0 }}
        className="font-semibold text-xl md:text-2xl text-center"
        exit={{ opacity: 0, y: 10 }}
        initial={{ opacity: 0, y: 10 }}
        key={mode}
        transition={{ delay: 0.5 }}
      >
        {isMuslimMode ? tMuslim("welcome") : t("welcome")}
      </motion.div>
      <motion.div
        animate={{ opacity: 1, y: 0 }}
        className="text-base text-zinc-500 md:text-xl text-center mt-2"
        exit={{ opacity: 0, y: 10 }}
        initial={{ opacity: 0, y: 10 }}
        transition={{ delay: 0.6 }}
      >
        {isMuslimMode ? (
          tMuslim("subtitle")
        ) : (
          <>
            {t("getAnswersBefore")}{" "}
            <Link
              href="/quran/search"
              className="text-zinc-700 dark:text-zinc-300 hover:underline"
            >
              {t("quranLink")}
            </Link>{" "}
            {t("and")}{" "}
            <Link
              href="/hadith/search"
              className="text-zinc-700 dark:text-zinc-300 hover:underline"
            >
              {t("sunnahLink")}
            </Link>
          </>
        )}
      </motion.div>
      <motion.div
        animate={{ opacity: 1 }}
        className="mt-4 flex justify-center md:hidden"
        initial={{ opacity: 0 }}
        transition={{ delay: 0.7 }}
      >
        <ModeToggle />
      </motion.div>
    </div>
  );
};
