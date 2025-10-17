import { notFound } from 'next/navigation';
import Link from 'next/link';
import type { Metadata } from 'next';
import { getVersesBySurah } from '@/lib/db/queries';
import { getSurahMetadata } from '@/lib/quran-metadata';
import { createBreadcrumbSchema } from '@/lib/seo/schema';

interface PageProps {
  params: Promise<{
    surahNumber: string;
  }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { surahNumber } = await params;
  const num = Number.parseInt(surahNumber);
  
  if (Number.isNaN(num) || num < 1 || num > 114) {
    return { title: 'Surah Not Found' };
  }

  const metadata = getSurahMetadata(num);
  if (!metadata) {
    return { title: 'Surah Not Found' };
  }

  const title = `Surah ${metadata.transliteration} (${metadata.name}) - Chapter ${num}`;
  const description = `Read Surah ${metadata.transliteration} (${metadata.translation}) - ${metadata.type} Surah with ${metadata.verses} verses. Full Arabic text and English translation from the Quran.`;

  return {
    title,
    description,
    keywords: [
      `Surah ${metadata.transliteration}`,
      `Quran Chapter ${num}`,
      metadata.translation,
      'Quran',
      'Islamic text',
      `${metadata.type} Surah`,
    ],
    openGraph: {
      title,
      description,
      type: 'article',
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
    },
  };
}

export default async function SurahPage({ params }: PageProps) {
  const { surahNumber } = await params;
  const num = Number.parseInt(surahNumber);

  // Validate surah number
  if (Number.isNaN(num) || num < 1 || num > 114) {
    notFound();
  }

  const metadata = getSurahMetadata(num);
  if (!metadata) {
    notFound();
  }

  // Fetch all verses for this Surah
  const verses = await getVersesBySurah({ surahNumber: num });

  if (verses.length === 0) {
    notFound();
  }

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://criterion.life';
  
  // Breadcrumb schema
  const breadcrumbSchema = createBreadcrumbSchema([
    { name: 'Home', url: siteUrl },
    { name: 'Quran', url: `${siteUrl}/quran` },
    { name: `Surah ${metadata.transliteration}`, url: `${siteUrl}/quran/${num}` },
  ]);

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }}
      />
      
      <div className="min-h-screen bg-background">
        <div className="mx-auto max-w-4xl px-4 py-8">
          {/* Breadcrumbs */}
          <nav className="mb-6 text-sm text-muted-foreground">
            <Link href="/" className="hover:text-foreground">Home</Link>
            <span className="mx-2">/</span>
            <Link href="/quran" className="hover:text-foreground">Quran</Link>
            <span className="mx-2">/</span>
            <span className="text-foreground">Surah {num}</span>
          </nav>

          {/* Surah Header */}
          <div className="mb-8 border-b pb-6">
            <h1 className="mb-2 text-4xl font-bold">
              <span className="font-arabic text-5xl">{metadata.name}</span>
            </h1>
            <h2 className="mb-4 text-2xl text-muted-foreground">
              Surah {metadata.transliteration} - {metadata.translation}
            </h2>
            <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
              <span>Chapter {metadata.number}</span>
              <span>•</span>
              <span>{metadata.type}</span>
              <span>•</span>
              <span>{metadata.verses} verses</span>
            </div>
          </div>

          {/* Verses */}
          <div className="space-y-6">
            {verses.map((verse) => (
              <div
                key={verse.id}
                id={`verse-${verse.ayahNumber}`}
                className="group rounded-lg border p-6 transition-colors hover:bg-muted/50"
              >
                {/* Verse Number */}
                <div className="mb-3 flex items-center justify-between">
                  <span className="text-sm font-medium text-muted-foreground">
                    Verse {verse.ayahNumber}
                  </span>
                  <a
                    href={`https://quran.com/${verse.surahNumber}/${verse.ayahNumber}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-muted-foreground hover:text-foreground"
                  >
                    View on Quran.com ↗
                  </a>
                </div>

                {/* Arabic Text */}
                <p className="font-arabic mb-4 text-right text-2xl leading-loose">
                  {verse.textArabic}
                </p>

                {/* English Translation */}
                <p className="text-base leading-relaxed text-foreground/90">
                  {verse.textEnglish}
                </p>
              </div>
            ))}
          </div>

          {/* Navigation */}
          <div className="mt-12 flex items-center justify-between border-t pt-6">
            {num > 1 ? (
              <Link
                href={`/quran/${num - 1}`}
                className="flex items-center gap-2 rounded-lg border px-4 py-2 text-sm transition-colors hover:bg-muted"
              >
                <span>←</span>
                <div>
                  <div className="text-xs text-muted-foreground">Previous</div>
                  <div className="font-medium">Surah {num - 1}</div>
                </div>
              </Link>
            ) : (
              <div />
            )}

            <Link
              href="/quran"
              className="rounded-lg border px-4 py-2 text-sm transition-colors hover:bg-muted"
            >
              All Surahs
            </Link>

            {num < 114 ? (
              <Link
                href={`/quran/${num + 1}`}
                className="flex items-center gap-2 rounded-lg border px-4 py-2 text-sm transition-colors hover:bg-muted"
              >
                <div className="text-right">
                  <div className="text-xs text-muted-foreground">Next</div>
                  <div className="font-medium">Surah {num + 1}</div>
                </div>
                <span>→</span>
              </Link>
            ) : (
              <div />
            )}
          </div>

          {/* CTA to Chat */}
          <div className="mt-12 rounded-lg border bg-muted/50 p-6 text-center">
            <h3 className="mb-2 text-lg font-semibold">Have questions about this Surah?</h3>
            <p className="mb-4 text-sm text-muted-foreground">
              Ask our AI assistant powered by Quran and Hadith
            </p>
            <Link
              href="/"
              className="inline-flex items-center justify-center rounded-lg bg-primary px-6 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
            >
              Start Chat
            </Link>
          </div>
        </div>
      </div>
    </>
  );
}
