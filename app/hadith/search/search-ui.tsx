"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Search, ChevronDown, Loader2 } from "lucide-react";
import Link from "next/link";
import { HadithCard, type HadithCardData } from "@/components/hadith/hadith-card";

type Collection = "bukhari" | "muslim" | "nawawi40" | "riyadussalihin";
type GradePreference = "sahih-only" | "sahih-and-hasan" | "all";

interface SearchResponse {
  results: HadithCardData[];
  query: string;
  count: number;
  filters: {
    collections: string[];
    gradeFilter: GradePreference;
  };
}

interface HadithSearchUIProps {
  initialQuery?: string;
  initialResults?: SearchResponse | null;
  initialCollections?: Collection[];
  initialGrade?: GradePreference;
}

// Collection metadata
const COLLECTIONS: Array<{
  id: Collection;
  name: string;
  description: string;
}> = [
  { id: "bukhari", name: "Sahih Bukhari", description: "7,558 hadiths" },
  { id: "muslim", name: "Sahih Muslim", description: "2,920 hadiths" },
  { id: "nawawi40", name: "40 Hadith Nawawi", description: "42 hadiths" },
  { id: "riyadussalihin", name: "Riyad as-Salihin", description: "1,896 hadiths" },
];

export function HadithSearchUI({
  initialQuery = "",
  initialResults = null,
  initialCollections = [],
  initialGrade = "sahih-only",
}: HadithSearchUIProps) {
  const router = useRouter();
  const [query, setQuery] = useState(initialQuery);
  const [showFilters, setShowFilters] = useState(false);
  const [selectedCollections, setSelectedCollections] = useState<Collection[]>(initialCollections);
  const [gradePreference, setGradePreference] = useState<GradePreference>(initialGrade);
  const [isPending, startTransition] = useTransition();

  const hasSearched = !!initialQuery || !!initialResults;

  // Build query params from filter state
  const buildQueryParams = (searchQuery: string) => {
    const params = new URLSearchParams();
    params.set("q", searchQuery);

    if (selectedCollections.length > 0) {
      params.set("collections", selectedCollections.join(","));
    }

    if (gradePreference !== "sahih-only") {
      params.set("grade", gradePreference);
    }

    return params.toString();
  };

  // Handle search form submission
  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedQuery = query.trim();
    if (!trimmedQuery) return;

    const queryParams = buildQueryParams(trimmedQuery);
    startTransition(() => {
      router.push(`/hadith/search?${queryParams}`);
    });
  };

  // Quick search button handler
  const quickSearch = (term: string) => {
    setQuery(term);
    const queryParams = buildQueryParams(term);
    startTransition(() => {
      router.push(`/hadith/search?${queryParams}`);
    });
  };

  // Toggle collection selection
  const toggleCollection = (collection: Collection) => {
    const newCollections = selectedCollections.includes(collection)
      ? selectedCollections.filter((c) => c !== collection)
      : [...selectedCollections, collection];
    
    setSelectedCollections(newCollections);
  };

  // Handle grade change
  const handleGradeChange = (grade: GradePreference) => {
    setGradePreference(grade);
  };

  // Apply filters (re-search with current query)
  const applyFilters = () => {
    if (!query.trim()) return;
    const queryParams = buildQueryParams(query.trim());
    startTransition(() => {
      router.push(`/hadith/search?${queryParams}`);
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
              Search Authentic Hadith
            </h1>
            <p className="text-zinc-500 text-lg mb-6">
              Explore 12,416 hadiths from major collections using semantic search
            </p>

            {/* Search Form */}
            <form onSubmit={handleSearch} className="relative mb-4">
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="What are you curious about? (e.g., charity, prayer, patience)"
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

            {/* Filters Toggle */}
            <button
              type="button"
              onClick={() => setShowFilters(!showFilters)}
              className="flex items-center gap-2 text-sm text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100 transition-colors mb-4"
            >
              <span>Filters</span>
              <ChevronDown
                className={`size-4 transition-transform ${
                  showFilters ? "rotate-180" : ""
                }`}
              />
            </button>

            {/* Filter Panel */}
            {showFilters && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="border rounded-lg p-4 mb-4 space-y-4"
              >
                {/* Collections Filter */}
                <div>
                  <h3 className="text-sm font-medium mb-2">Collections</h3>
                  <div className="flex flex-wrap gap-2">
                    {COLLECTIONS.map((collection) => (
                      <label
                        key={collection.id}
                        className="flex items-center gap-1.5 cursor-pointer px-3 py-2 rounded-md border text-sm hover:bg-zinc-50 dark:hover:bg-zinc-900 transition-colors has-[:checked]:bg-primary has-[:checked]:text-primary-foreground has-[:checked]:border-primary"
                      >
                        <input
                          type="checkbox"
                          checked={selectedCollections.includes(collection.id)}
                          onChange={() => toggleCollection(collection.id)}
                          className="sr-only"
                        />
                        <span className="font-medium">{collection.name}</span>
                      </label>
                    ))}
                  </div>
                  {selectedCollections.length === 0 && (
                    <p className="text-xs text-zinc-500 mt-2">
                      All collections selected
                    </p>
                  )}
                </div>

                {/* Grade Filter */}
                <div>
                  <h3 className="text-sm font-medium mb-2">Authenticity</h3>
                  <div className="flex flex-wrap gap-2">
                    <label className="flex items-center gap-1.5 cursor-pointer px-3 py-2 rounded-md border text-sm hover:bg-zinc-50 dark:hover:bg-zinc-900 transition-colors has-[:checked]:bg-primary has-[:checked]:text-primary-foreground has-[:checked]:border-primary">
                      <input
                        type="radio"
                        name="grade"
                        checked={gradePreference === "sahih-only"}
                        onChange={() => handleGradeChange("sahih-only")}
                        className="sr-only"
                      />
                      <span className="font-medium">Sahih only</span>
                    </label>
                    <label className="flex items-center gap-1.5 cursor-pointer px-3 py-2 rounded-md border text-sm hover:bg-zinc-50 dark:hover:bg-zinc-900 transition-colors has-[:checked]:bg-primary has-[:checked]:text-primary-foreground has-[:checked]:border-primary">
                      <input
                        type="radio"
                        name="grade"
                        checked={gradePreference === "sahih-and-hasan"}
                        onChange={() => handleGradeChange("sahih-and-hasan")}
                        className="sr-only"
                      />
                      <span className="font-medium">Sahih + Hasan</span>
                    </label>
                    <label className="flex items-center gap-1.5 cursor-pointer px-3 py-2 rounded-md border text-sm hover:bg-zinc-50 dark:hover:bg-zinc-900 transition-colors has-[:checked]:bg-primary has-[:checked]:text-primary-foreground has-[:checked]:border-primary">
                      <input
                        type="radio"
                        name="grade"
                        checked={gradePreference === "all"}
                        onChange={() => handleGradeChange("all")}
                        className="sr-only"
                      />
                      <span className="font-medium">All grades</span>
                    </label>
                  </div>
                </div>

                {/* Apply Filters Button */}
                <button
                  type="button"
                  onClick={applyFilters}
                  disabled={!query.trim()}
                  className="w-full px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm font-medium"
                >
                  Apply Filters
                </button>
              </motion.div>
            )}

            {/* Example queries */}
            {!hasSearched && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.3 }}
                className="flex flex-wrap gap-2"
              >
                <span className="text-sm text-zinc-500">Try:</span>
                {["charity", "patience", "prayer", "fasting"].map((term) => (
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

            {/* Cross-link to Quran search */}
            {!hasSearched && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.4 }}
                className="mt-4 text-sm text-zinc-500"
              >
                Looking for Quran verses?{" "}
                <Link href="/quran/search" className="text-primary hover:underline">
                  Search the Quran →
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
                <p className="text-sm text-zinc-500">Searching hadiths...</p>
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
                Found {initialResults.count} relevant hadith
                {initialResults.count !== 1 ? "s" : ""} for "{initialResults.query}"
                {initialResults.filters.collections.length > 0 &&
                  initialResults.filters.collections[0] !== "All collections" && (
                    <span> in {initialResults.filters.collections.join(", ")}</span>
                  )}
              </div>

              <div className="space-y-4">
                {initialResults.results.map((hadith, index) => (
                  <motion.div
                    key={`${hadith.reference}-${index}`}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05 }}
                  >
                    <HadithCard hadith={hadith} variant="search" />
                  </motion.div>
                ))}
              </div>
            </motion.div>
          )}

          {hasSearched && initialResults && initialResults.count === 0 && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-center py-12 space-y-4"
            >
              <p className="text-zinc-500">
                No hadiths found for "{initialResults.query}".
              </p>
              <p className="text-sm text-zinc-400">
                Try different keywords or adjust your filters.
              </p>
            </motion.div>
          )}
        </div>
      </div>
    </>
  );
}
