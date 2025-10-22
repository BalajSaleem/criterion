import { motion } from "framer-motion";
import Link from "next/link";
import { BookOpen, Search } from "lucide-react";

export const Greeting = () => {
  return (
    <div
      className="mx-auto mt-4 flex size-full max-w-3xl flex-col justify-center px-4 md:mt-16 md:px-8"
      key="overview"
    >
      <motion.div
        animate={{ opacity: 1, y: 0 }}
        className="font-semibold text-xl md:text-2xl"
        exit={{ opacity: 0, y: 10 }}
        initial={{ opacity: 0, y: 10 }}
        transition={{ delay: 0.5 }}
      >
        Welcome to Criterion
      </motion.div>
      <motion.div
        animate={{ opacity: 1, y: 0 }}
        className="text-xl text-zinc-500 md:text-2xl"
        exit={{ opacity: 0, y: 10 }}
        initial={{ opacity: 0, y: 10 }}
        transition={{ delay: 0.6 }}
      >
        your AI companion for exploring Islam and the Quran.
      </motion.div>

      {/* Resource Cards - Compact on mobile */}
      <motion.div
        animate={{ opacity: 1, y: 0 }}
        className="mt-6 grid gap-2 sm:grid-cols-2 sm:gap-3"
        exit={{ opacity: 0, y: 10 }}
        initial={{ opacity: 0, y: 10 }}
        transition={{ delay: 0.7 }}
      >
        <Link
          href="/quran"
          className="group flex items-center gap-3 rounded-lg border border-zinc-200 dark:border-zinc-800 p-3 transition-all hover:border-zinc-300 dark:hover:border-zinc-700 hover:bg-zinc-50 dark:hover:bg-zinc-900/50"
        >
          <div className="flex h-9 w-9 items-center justify-center rounded-md bg-zinc-100 dark:bg-zinc-800 transition-colors group-hover:bg-zinc-200 dark:group-hover:bg-zinc-700">
            <BookOpen className="h-4 w-4 text-zinc-700 dark:text-zinc-300" />
          </div>
          <div className="flex-1">
            <div className="text-sm font-medium sm:text-base">Read the Quran</div>
            <div className="text-xs text-zinc-500 dark:text-zinc-400 sm:text-sm">
              The word of God in Arabic & English
            </div>
          </div>
        </Link>

        {/* Combined Search Card */}
        <div className="group rounded-lg border border-zinc-200 dark:border-zinc-800 p-3 transition-all hover:border-zinc-300 dark:hover:border-zinc-700 hover:bg-zinc-50 dark:hover:bg-zinc-900/50">
          <div className="flex items-center gap-3 mb-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-md bg-zinc-100 dark:bg-zinc-800 transition-colors group-hover:bg-zinc-200 dark:group-hover:bg-zinc-700">
              <Search className="h-4 w-4 text-zinc-700 dark:text-zinc-300" />
            </div>
            <div className="flex-1">
              <div className="text-sm font-medium sm:text-base">Search by Theme</div>
              <div className="text-xs text-zinc-500 dark:text-zinc-400 sm:text-sm">
                Find guidance on any topic
              </div>
            </div>
          </div>
          <div className="flex gap-2 mt-2">
            <Link
              href="/quran/search"
              className="flex-1 text-center text-xs font-medium px-2.5 py-1.5 rounded-md border border-zinc-200 dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
            >
              Quran
            </Link>
            <Link
              href="/hadith/search"
              className="flex-1 text-center text-xs font-medium px-2.5 py-1.5 rounded-md border border-zinc-200 dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
            >
              Hadith
            </Link>
          </div>
        </div>
      </motion.div>
    </div>
  );
};
