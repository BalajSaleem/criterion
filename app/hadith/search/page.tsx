"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import { Loader2, Search, ChevronDown } from "lucide-react";
import Link from "next/link";
import { CriterionBranding } from "@/components/criterion-branding";
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

function HadithSearchPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [showFilters, setShowFilters] = useState(false);

  // Filter states
  const [selectedCollections, setSelectedCollections] = useState<Collection[]>(
    []
  );
  const [gradePreference, setGradePreference] =
    useState<GradePreference>("sahih-only");

  // Collection metadata
  const collections: Array<{
    id: Collection;
    name: string;
    description: string;
  }> = [
    { id: "bukhari", name: "Sahih Bukhari", description: "7,558 hadiths" },
    { id: "muslim", name: "Sahih Muslim", description: "2,920 hadiths" },
    { id: "nawawi40", name: "40 Hadith Nawawi", description: "42 hadiths" },
    {
      id: "riyadussalihin",
      name: "Riyad as-Salihin",
      description: "1,896 hadiths",
    },
  ];

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
      const queryParams = buildQueryParams(trimmedQuery.slice(0, 200));
      const response = await fetch(`/hadith/search/api?${queryParams}`);
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
    const urlCollections = searchParams.get("collections");
    const urlGrade = searchParams.get("grade");

    // Load filters from URL
    if (urlCollections) {
      const parsed = urlCollections
        .split(",")
        .filter((c) =>
          ["bukhari", "muslim", "nawawi40", "riyadussalihin"].includes(c)
        ) as Collection[];
      setSelectedCollections(parsed);
    }

    if (urlGrade && ["sahih-only", "sahih-and-hasan", "all"].includes(urlGrade)) {
      setGradePreference(urlGrade as GradePreference);
    }

    // Load and perform search
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

    // Update URL without page reload
    const queryParams = buildQueryParams(trimmedQuery);
    router.replace(`/hadith/search?${queryParams}`, {
      scroll: false,
    });

    // Perform search
    await performSearch(trimmedQuery);
  };

  // Handle filter changes
  const handleFilterChange = () => {
    if (!query.trim()) return;

    // Update URL with new filters
    const queryParams = buildQueryParams(query.trim());
    router.replace(`/hadith/search?${queryParams}`, {
      scroll: false,
    });

    // Re-run search
    performSearch(query);
  };

  // Toggle collection selection
  const toggleCollection = (collection: Collection) => {
    setSelectedCollections((prev) => {
      const newCollections = prev.includes(collection)
        ? prev.filter((c) => c !== collection)
        : [...prev, collection];

      // Update search after state change
      setTimeout(() => {
        if (query.trim()) {
          handleFilterChange();
        }
      }, 0);

      return newCollections;
    });
  };

  // Handle grade change
  const handleGradeChange = (grade: GradePreference) => {
    setGradePreference(grade);

    // Update search after state change
    setTimeout(() => {
      if (query.trim()) {
        handleFilterChange();
      }
    }, 0);
  };

  return (
    <div className="min-h-screen flex flex-col">
      {/* Navigation Header */}
      <header className="border-b">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
          <CriterionBranding />
          <nav className="flex gap-4 md:gap-6 text-sm">
            <Link href="/" className="hover:underline">
              Chat
            </Link>
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
                className="border rounded-lg p-3 mb-4 space-y-3"
              >
                {/* Collections Filter */}
                <div>
                  <h3 className="text-xs font-medium text-zinc-600 dark:text-zinc-400 mb-2">
                    Collections
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {collections.map((collection) => (
                      <label
                        key={collection.id}
                        className="flex items-center gap-1.5 cursor-pointer px-2.5 py-1.5 rounded-md border text-xs hover:bg-zinc-50 dark:hover:bg-zinc-900 transition-colors has-[:checked]:bg-primary has-[:checked]:text-primary-foreground has-[:checked]:border-primary"
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
                    <p className="text-xs text-zinc-500 mt-1.5">
                      All collections selected
                    </p>
                  )}
                </div>

                {/* Grade Filter */}
                <div>
                  <h3 className="text-xs font-medium text-zinc-600 dark:text-zinc-400 mb-2">
                    Authenticity
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    <label className="flex items-center gap-1.5 cursor-pointer px-2.5 py-1.5 rounded-md border text-xs hover:bg-zinc-50 dark:hover:bg-zinc-900 transition-colors has-[:checked]:bg-primary has-[:checked]:text-primary-foreground has-[:checked]:border-primary">
                      <input
                        type="radio"
                        name="grade"
                        checked={gradePreference === "sahih-only"}
                        onChange={() => handleGradeChange("sahih-only")}
                        className="sr-only"
                      />
                      <span className="font-medium">Sahih only</span>
                    </label>
                    <label className="flex items-center gap-1.5 cursor-pointer px-2.5 py-1.5 rounded-md border text-xs hover:bg-zinc-50 dark:hover:bg-zinc-900 transition-colors has-[:checked]:bg-primary has-[:checked]:text-primary-foreground has-[:checked]:border-primary">
                      <input
                        type="radio"
                        name="grade"
                        checked={gradePreference === "sahih-and-hasan"}
                        onChange={() => handleGradeChange("sahih-and-hasan")}
                        className="sr-only"
                      />
                      <span className="font-medium">Sahih + Hasan</span>
                    </label>
                    <label className="flex items-center gap-1.5 cursor-pointer px-2.5 py-1.5 rounded-md border text-xs hover:bg-zinc-50 dark:hover:bg-zinc-900 transition-colors has-[:checked]:bg-primary has-[:checked]:text-primary-foreground has-[:checked]:border-primary">
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
                    onClick={() => {
                      setQuery(term);
                      const queryParams = buildQueryParams(term);
                      router.replace(`/hadith/search?${queryParams}`, {
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

            {/* Cross-link to Quran search */}
            {!hasSearched && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.4 }}
                className="mt-4 text-sm text-zinc-500"
              >
                Looking for Quran verses?{" "}
                <Link
                  href="/search"
                  className="text-primary hover:underline"
                >
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
                Found {results.count} relevant hadith
                {results.count !== 1 ? "s" : ""} for "{results.query}"
                {results.filters.collections.length > 0 && (
                  <span> in {results.filters.collections.join(", ")}</span>
                )}
              </div>

              <div className="space-y-4">
                {results.results.map((hadith, index) => (
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

          {!isLoading && hasSearched && results && results.count === 0 && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-center py-12 space-y-4"
            >
              <p className="text-zinc-500">
                No hadiths found for "{results.query}".
              </p>
              <p className="text-sm text-zinc-400">
                Try different keywords or adjust your filters.
              </p>
            </motion.div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function HadithSearchPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center">
          <Loader2 className="size-8 animate-spin text-zinc-400" />
        </div>
      }
    >
      <HadithSearchPageContent />
    </Suspense>
  );
}
