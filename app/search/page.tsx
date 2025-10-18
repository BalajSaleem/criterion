"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import { Loader2, Search } from "lucide-react";
import Link from "next/link";
import { CriterionBranding } from "@/components/criterion-branding";

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

export default function SearchPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);

  // Perform the actual search
  const performSearch = async (searchQuery: string) => {
    const trimmedQuery = searchQuery.trim();
    
    // Validate query
    if (!trimmedQuery) return;
    if (trimmedQuery.length > 200) {
      console.warn("Search query too long, truncating to 200 characters");
    }

    setIsLoading(true);
    setHasSearched(true);

    try {
      const response = await fetch(
        `/search/api?q=${encodeURIComponent(trimmedQuery.slice(0, 200))}`
      );
      const data = await response.json();
      setResults(data);
    } catch (error) {
      console.error("Search error:", error);
    } finally {
      setIsLoading(false);
    }
  };

  // Load search from URL on mount
  useEffect(() => {
    const urlQuery = searchParams.get("q");
    if (urlQuery && urlQuery.trim()) {
      setQuery(urlQuery.trim());
      performSearch(urlQuery);
    }
  }, [searchParams]);

  // Handle search form submission
  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedQuery = query.trim();
    if (!trimmedQuery) return;

    // Update URL without page reload (don't add to history stack)
    router.replace(`/search?q=${encodeURIComponent(trimmedQuery)}`, {
      scroll: false, // Preserve scroll position
    });
    
    // Perform search
    await performSearch(trimmedQuery);
  };

  return (
    <div className="min-h-screen flex flex-col">
      {/* Navigation Header */}
      <header className="border-b">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
          <CriterionBranding />
          <nav className="flex gap-4 md:gap-6 text-sm">
            <Link href="/about" className="hover:underline">
              About
            </Link>
            <Link href="/quran" className="hover:underline">
              Quran
            </Link>
            <Link href="/faq" className="hover:underline">
              FAQ
            </Link>
          </nav>
        </div>
      </header>

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
                disabled={isLoading}
              />
              <button
                type="submit"
                disabled={isLoading || !query.trim()}
                className="absolute right-2 top-1/2 -translate-y-1/2 p-2 rounded-md hover:bg-zinc-100 dark:hover:bg-zinc-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {isLoading ? (
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
                    onClick={() => {
                      setQuery(term);
                      // Update URL and trigger search
                      router.replace(`/search?q=${encodeURIComponent(term)}`, {
                        scroll: false,
                      });
                      performSearch(term);
                    }}
                    className="text-sm px-3 py-1 rounded-full border hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
                  >
                    {term}
                  </button>
                ))}
              </motion.div>
            )}
          </motion.div>
        </div>
      </div>

      {/* Results */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-4xl mx-auto px-4 py-8">
          {isLoading && (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="size-8 animate-spin text-zinc-400" />
            </div>
          )}

          {!isLoading && results && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.3 }}
            >
              <div className="mb-6 text-sm text-zinc-500">
                Found {results.count} relevant verses for "{results.query}"
              </div>

              <div className="space-y-6">
                {results.results.map((result, index) => (
                  <motion.div
                    key={`${result.surahNumber}:${result.ayahNumber}`}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05 }}
                    className="border rounded-lg p-6 hover:border-zinc-400 transition-colors"
                  >
                    {/* Surah Reference */}
                    <div className="flex items-center justify-between mb-4">
                      <a
                        href={`https://quran.com/${result.surahNumber}/${result.ayahNumber}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm font-medium hover:underline"
                      >
                        {result.surahNameEnglish} {result.surahNumber}:
                        {result.ayahNumber}
                      </a>
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
                ))}
              </div>
            </motion.div>
          )}

          {!isLoading && hasSearched && results && results.count === 0 && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-center py-12 text-zinc-500"
            >
              No verses found for "{results.query}". Try different keywords.
            </motion.div>
          )}
        </div>
      </div>
    </div>
  );
}
