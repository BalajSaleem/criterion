import Link from 'next/link';
import type { Metadata } from 'next';
import { SURAH_METADATA } from '@/lib/quran-metadata';
import { createBreadcrumbSchema } from '@/lib/seo/schema';
import { CriterionBranding } from '@/components/criterion-branding';

export const metadata: Metadata = {
  title: 'Quran - Browse All 114 Surahs',
  description: 'Browse all 114 Surahs (chapters) of the Holy Quran. Read full Arabic text and English translations. Explore Meccan and Medinan revelations.',
  keywords: [
    'Quran',
    'Holy Quran',
    'Quran chapters',
    'Surahs',
    'Islamic scripture',
    'Quran online',
    'Read Quran',
  ],
  openGraph: {
    title: 'Quran - Browse All 114 Surahs | Criterion',
    description: 'Browse all 114 Surahs (chapters) of the Holy Quran with Arabic text and English translations.',
    type: 'website',
  },
};

export default function QuranPage() {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://criterion.life';
  
  const breadcrumbSchema = createBreadcrumbSchema([
    { name: 'Home', url: siteUrl },
    { name: 'Quran', url: `${siteUrl}/quran` },
  ]);

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }}
      />
      
      <div className="min-h-screen bg-background">
        {/* Navigation Header */}
        <header className="border-b">
          <div className="mx-auto max-w-6xl px-4 py-4 flex items-center justify-between">
            <CriterionBranding />
            <nav className="flex gap-4 md:gap-6 text-sm">
              <Link href="/search" className="hover:underline">
                Search
              </Link>
              <Link href="/about" className="hover:underline">
                About
              </Link>
              <Link href="/faq" className="hover:underline">
                FAQ
              </Link>
            </nav>
          </div>
        </header>

        <div className="mx-auto max-w-6xl px-4 py-8">
          {/* Breadcrumbs */}
          <nav className="mb-6 text-sm text-muted-foreground">
            <Link href="/" className="hover:text-foreground">Home</Link>
            <span className="mx-2">/</span>
            <span className="text-foreground">Quran</span>
          </nav>

          {/* Header */}
          <div className="mb-12 text-center">
            <h1 className="mb-4 text-4xl font-bold">The Holy Quran</h1>
            <p className="mx-auto max-w-2xl text-muted-foreground">
              Browse all 114 Surahs (chapters) of the Quran. Each Surah includes the full Arabic text 
              and English translation. Click any Surah to read it in full.
            </p>
          </div>

          {/* Surah Grid */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {SURAH_METADATA.map((surah) => (
              <Link
                key={surah.number}
                href={`/quran/${surah.number}`}
                className="group rounded-lg border p-4 transition-all hover:border-primary hover:bg-muted/50"
              >
                <div className="mb-2 flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full border bg-muted text-sm font-semibold">
                      {surah.number}
                    </div>
                    <div>
                      <h2 className="font-semibold group-hover:text-primary">
                        {surah.transliteration}
                      </h2>
                      <p className="text-xs text-muted-foreground">
                        {surah.translation}
                      </p>
                    </div>
                  </div>
                  <div className="font-arabic text-xl">{surah.name}</div>
                </div>
                <div className="flex gap-2 text-xs text-muted-foreground">
                  <span className="rounded bg-muted px-2 py-1">{surah.type}</span>
                  <span className="rounded bg-muted px-2 py-1">{surah.verses} verses</span>
                </div>
              </Link>
            ))}
          </div>

          {/* CTA */}
          <div className="mt-12 rounded-lg border bg-muted/50 p-8 text-center">
            <h2 className="mb-2 text-2xl font-semibold">Search the Quran by Theme</h2>
            <p className="mb-4 text-muted-foreground">
              Use our semantic search to find verses about any topic
            </p>
            <Link
              href="/search"
              className="inline-flex items-center justify-center rounded-lg bg-primary px-6 py-3 font-medium text-primary-foreground transition-colors hover:bg-primary/90"
            >
              Search Quran & Hadith
            </Link>
          </div>
        </div>
      </div>
    </>
  );
}
