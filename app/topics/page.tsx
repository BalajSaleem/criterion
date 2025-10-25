import type { Metadata } from 'next';
import Link from 'next/link';
import { BookOpen, Sparkles, Search } from 'lucide-react';
import { getAllTopicsSorted, type Topic } from '@/lib/topics';
import { SearchPageHeader } from '@/components/search/search-page-header';

export const metadata: Metadata = {
  title: 'Islamic Topics - Quran & Hadith | Criterion',
  description:
    'Explore essential Islamic topics with verses from the Quran and authentic Hadiths. Learn about prayer, patience, charity, justice, and more.',
  keywords: [
    'Islamic topics',
    'Quran topics',
    'Hadith topics',
    'Islamic teachings',
    'Islamic knowledge',
    'Learn Islam',
    'Islamic education',
  ],
  openGraph: {
    title: 'Islamic Topics - Quran & Hadith',
    description:
      'Explore essential Islamic topics with verses from the Quran and authentic Hadiths.',
    type: 'website',
  },
};

export default function TopicsPage() {
  const allTopics = getAllTopicsSorted();

  // Group topics by category
  const topicsByCategory = allTopics.reduce<Record<string, Topic[]>>(
    (acc, topic) => {
      const category = topic.category || 'Other';
      if (!acc[category]) {
        acc[category] = [];
      }
      acc[category].push(topic);
      return acc;
    },
    {}
  );

  const categories = Object.keys(topicsByCategory).sort();

  return (
    <div className="min-h-screen bg-background">
      <SearchPageHeader />

      {/* Hero Section */}
      <div className="border-b bg-gradient-to-b from-zinc-50 to-white dark:from-zinc-950 dark:to-zinc-900">
        <div className="max-w-4xl mx-auto px-4 py-16 md:py-20">
          <div className="text-center">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-primary/20 bg-primary/5 mb-6">
              <Sparkles className="h-4 w-4 text-primary" />
              <span className="text-sm font-medium text-primary">
                {allTopics.length} Topics Available
              </span>
            </div>

            <h1 className="text-4xl md:text-6xl font-bold mb-6">
              Explore Islamic Topics
            </h1>

            <p className="text-xl text-zinc-600 dark:text-zinc-400 leading-relaxed max-w-3xl mx-auto mb-8">
              Discover what the Quran and authentic Hadiths teach about essential Islamic topics.
              Each topic page includes relevant verses and narrations to deepen your understanding.
            </p>

            <div className="flex flex-wrap justify-center gap-3">
              <Link
                href="/quran/search"
                className="inline-flex items-center gap-2 px-5 py-3 rounded-lg border border-zinc-300 dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
              >
                <Search className="h-5 w-5" />
                <span className="font-medium">Search Quran</span>
              </Link>
              <Link
                href="/hadith/search"
                className="inline-flex items-center gap-2 px-5 py-3 rounded-lg border border-zinc-300 dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
              >
                <Search className="h-5 w-5" />
                <span className="font-medium">Search Hadith</span>
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Topics Grid */}
      <div className="max-w-6xl mx-auto px-4 py-16">
        {categories.map((category) => (
          <section key={category} className="mb-16">
            <div className="flex items-center gap-3 mb-8">
              <BookOpen className="h-6 w-6 text-primary" />
              <h2 className="text-2xl md:text-3xl font-bold">{category}</h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {topicsByCategory[category].map((topic) => (
                <Link
                  key={topic.slug}
                  href={`/topics/${topic.slug}`}
                  className="group relative overflow-hidden rounded-lg border bg-card hover:border-primary transition-all duration-300 hover:shadow-lg"
                >
                  <div className="p-6">
                    {/* Icon */}
                    {topic.icon && (
                      <div className="text-4xl mb-4 group-hover:scale-110 transition-transform duration-300">
                        {topic.icon}
                      </div>
                    )}

                    {/* Title */}
                    <h3 className="text-xl font-semibold mb-2 group-hover:text-primary transition-colors">
                      {topic.title}
                    </h3>

                    {/* Arabic Title */}
                    {topic.titleAr && (
                      <p
                        className="text-sm text-muted-foreground font-arabic mb-3"
                        dir="rtl"
                      >
                        {topic.titleAr}
                      </p>
                    )}

                    {/* Description */}
                    <p className="text-sm text-zinc-600 dark:text-zinc-400 line-clamp-3">
                      {topic.description}
                    </p>

                    {/* Arrow indicator */}
                    <div className="mt-4 flex items-center text-primary text-sm font-medium opacity-0 group-hover:opacity-100 transition-opacity">
                      <span>Explore topic</span>
                      <svg
                        className="ml-1 h-4 w-4 group-hover:translate-x-1 transition-transform"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M9 5l7 7-7 7"
                        />
                      </svg>
                    </div>
                  </div>

                  {/* Gradient overlay on hover */}
                  <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-primary/10 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
                </Link>
              ))}
            </div>
          </section>
        ))}
      </div>

      {/* Call to Action */}
      <div className="border-t bg-zinc-50 dark:bg-zinc-950">
        <div className="max-w-4xl mx-auto px-4 py-16 text-center">
          <h2 className="text-3xl font-bold mb-4">Can't find what you're looking for?</h2>
          <p className="text-lg text-zinc-600 dark:text-zinc-400 mb-8">
            Use our AI-powered search to explore any topic in the Quran and Hadith.
          </p>
          <div className="flex flex-wrap justify-center gap-3">
            <Link
              href="/quran/search"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors font-medium"
            >
              <Search className="h-5 w-5" />
              <span>Search Quran</span>
            </Link>
            <Link
              href="/hadith/search"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-lg border border-zinc-300 dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors font-medium"
            >
              <Search className="h-5 w-5" />
              <span>Search Hadith</span>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
