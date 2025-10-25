import { motion } from "framer-motion";
import Link from "next/link";

interface VerseResult {
  surahNumber: number;
  ayahNumber: number;
  surahNameEnglish: string;
  surahNameArabic: string;
  textArabic: string;
  textEnglish: string;
  similarity?: number;
  hasContext?: boolean;
  contextBefore?: Array<{
    ayahNumber: number;
    textArabic: string;
    textEnglish: string;
  }>;
  contextAfter?: Array<{
    ayahNumber: number;
    textArabic: string;
    textEnglish: string;
  }>;
}

interface VerseCardProps {
  verse: VerseResult;
  index?: number;
  showSimilarity?: boolean;
}

export function VerseCard({ verse, index = 0, showSimilarity = true }: VerseCardProps) {
  return (
    <Link
      href={`/quran/${verse.surahNumber}/${verse.ayahNumber}`}
      className="block"
    >
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: index * 0.05 }}
        className="border rounded-lg p-6 hover:border-zinc-400 transition-colors cursor-pointer"
      >
        {/* Surah Reference */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <span className="text-sm font-medium text-primary">
              {verse.surahNameEnglish} {verse.surahNumber}:{verse.ayahNumber}
            </span>
          </div>
          {showSimilarity && verse.similarity !== undefined && (
            <span className="text-xs text-zinc-500">
              {Math.round(verse.similarity * 100)}% match
            </span>
          )}
        </div>

        {/* Context Before */}
        {verse.hasContext && verse.contextBefore && verse.contextBefore.length > 0 && (
          <div className="mb-3 pl-4 border-l-2 border-zinc-200 dark:border-zinc-800 space-y-2">
            {verse.contextBefore.map((ctx) => (
              <div key={ctx.ayahNumber} className="text-sm text-zinc-400">
                <div className="font-arabic text-base mb-1 text-right">
                  {ctx.textArabic}
                </div>
                <div>{ctx.textEnglish}</div>
              </div>
            ))}
          </div>
        )}

        {/* Main Verse */}
        <div className="space-y-3">
          <div className="font-arabic text-xl md:text-2xl text-right leading-loose">
            {verse.textArabic}
          </div>
          <div className="text-base leading-relaxed">
            {verse.textEnglish}
          </div>
        </div>

        {/* Context After */}
        {verse.hasContext && verse.contextAfter && verse.contextAfter.length > 0 && (
          <div className="mt-3 pl-4 border-l-2 border-zinc-200 dark:border-zinc-800 space-y-2">
            {verse.contextAfter.map((ctx) => (
              <div key={ctx.ayahNumber} className="text-sm text-zinc-400">
                <div className="font-arabic text-base mb-1 text-right">
                  {ctx.textArabic}
                </div>
                <div>{ctx.textEnglish}</div>
              </div>
            ))}
          </div>
        )}
      </motion.div>
    </Link>
  );
}
