"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Search, Loader2 } from "lucide-react";
import Link from "next/link";

interface SearchResult {
  surahNumber: number;
  ayahNumber: number;
  surahNameEnglish: string;
  surahNameArabic: string;
  textArabic: string;
  textEnglish: string;
  similarity: number;
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

interface SearchResponse {
  results: SearchResult[];
  query: string;
  count: number;
}

interface SearchUIProps {
  initialQuery?: string;
  initialResults?: SearchResponse | null;
}

export function SearchUI({ initialQuery = "", initialResults = null }: SearchUIProps) {
  const router = useRouter();
  const [query, setQuery] = useState(initialQuery);
  const [isPending, startTransition] = useTransition();

  const hasSearched = !!initialQuery || !!initialResults;

  // Handle search form submission
  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedQuery = query.trim();
    if (!trimmedQuery) return;
    
    // Navigate with transition to show loading state
    startTransition(() => {
      router.push(`/quran/search?q=${encodeURIComponent(trimmedQuery)}`);
    });
  };

  // Quick search button handler
  const quickSearch = (term: string) => {
    setQuery(term);
    startTransition(() => {
      router.push(`/quran/search?q=${encodeURIComponent(term)}`);
    });
  };

  return (
    <>
      {/* Search Header */}
      <div className="flex-shrink-0 border-b">
        <div className="max-w-4xl mx-auto px-4 py-8 md:py-12">
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <h1 className="text-3xl md:text-4xl font-semibold mb-2">
              Search the Quran
            </h1>
            <p className="text-zinc-500 text-lg mb-6">
              Explore 6,236 verses using semantic search
            </p>

            {/* Search Form */}
            <form onSubmit={handleSearch} className="relative">
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="What are you curious about? (e.g., patience, prayer, purpose of life)"
                className="w-full px-4 py-4 pr-12 text-base border rounded-lg focus:outline-none focus:ring-2 focus:ring-zinc-400 bg-transparent"
                disabled={isPending}
              />
              <button
                type="submit"
                disabled={isPending || !query.trim()}
                className="absolute right-2 top-1/2 -translate-y-1/2 p-2 rounded-md hover:bg-zinc-100 dark:hover:bg-zinc-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {isPending ? (
                  <Loader2 className="size-5 animate-spin text-zinc-500" />
                ) : (
                  <Search className="size-5 text-zinc-500" />
                )}
              </button>
            </form>

            {/* Example queries */}
            {!hasSearched && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.3 }}
                className="mt-4 flex flex-wrap gap-2"
              >
                <span className="text-sm text-zinc-500">Try:</span>
                {["patience", "forgiveness", "prayer", "charity"].map((term) => (
                  <button
                    key={term}
                    type="button"
                    onClick={() => quickSearch(term)}
                    className="text-sm px-3 py-1 rounded-full border hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
                  >
                    {term}
                  </button>
                ))}
              </motion.div>
            )}

            {/* Cross-link to Hadith search */}
            {!hasSearched && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.4 }}
                className="mt-4 text-sm text-zinc-500"
              >
                Looking for Hadith?{" "}
                <Link
                  href="/hadith/search"
                  className="text-primary hover:underline"
                >
                  Search Authentic Hadith →
                </Link>
              </motion.div>
            )}
          </motion.div>
        </div>
      </div>

      {/* Results */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-4xl mx-auto px-4 py-8">
          {isPending && (
            <div className="flex items-center justify-center py-12">
              <div className="flex flex-col items-center gap-3">
                <Loader2 className="size-8 animate-spin text-zinc-400" />
                <p className="text-sm text-zinc-500">Searching verses...</p>
              </div>
            </div>
          )}

          {!isPending && initialResults && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.3 }}
            >
              <div className="mb-6 text-sm text-zinc-500">
                Found {initialResults.count} relevant verses for "{initialResults.query}"
              </div>

              <div className="space-y-6">
                {initialResults.results.map((result, index) => (
                  <Link
                    key={`${result.surahNumber}:${result.ayahNumber}`}
                    href={`/quran/${result.surahNumber}/${result.ayahNumber}`}
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
                            {result.surahNameEnglish} {result.surahNumber}:
                            {result.ayahNumber}
                          </span>
                        </div>
                        <span className="text-xs text-zinc-500">
                          {Math.round(result.similarity * 100)}% match
                        </span>
                      </div>

                      {/* Context Before */}
                      {result.hasContext && result.contextBefore && result.contextBefore.length > 0 && (
                        <div className="mb-3 pl-4 border-l-2 border-zinc-200 dark:border-zinc-800 space-y-2">
                          {result.contextBefore.map((verse) => (
                            <div
                              key={verse.ayahNumber}
                              className="text-sm text-zinc-400"
                            >
                              <div className="font-arabic text-base mb-1 text-right">
                                {verse.textArabic}
                              </div>
                              <div>{verse.textEnglish}</div>
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Main Verse */}
                      <div className="space-y-3">
                        <div className="font-arabic text-xl md:text-2xl text-right leading-loose">
                          {result.textArabic}
                        </div>
                        <div className="text-base leading-relaxed">
                          {result.textEnglish}
                        </div>
                      </div>

                      {/* Context After */}
                      {result.hasContext && result.contextAfter && result.contextAfter.length > 0 && (
                        <div className="mt-3 pl-4 border-l-2 border-zinc-200 dark:border-zinc-800 space-y-2">
                          {result.contextAfter.map((verse) => (
                            <div
                              key={verse.ayahNumber}
                              className="text-sm text-zinc-400"
                            >
                              <div className="font-arabic text-base mb-1 text-right">
                                {verse.textArabic}
                              </div>
                              <div>{verse.textEnglish}</div>
                            </div>
                          ))}
                        </div>
                      )}
                    </motion.div>
                  </Link>
                ))}
              </div>
            </motion.div>
          )}

          {!isPending && hasSearched && initialResults && initialResults.count === 0 && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-center py-12 text-zinc-500"
            >
              No verses found for "{initialResults.query}". Try different keywords.
            </motion.div>
          )}
        </div>
      </div>
    </>
  );
}
