import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { getVerseWithContext, getVerseBySurahAndAyah } from '@/lib/db/queries';
import { getSurahMetadata } from '@/lib/quran-metadata';
import { createBreadcrumbSchema } from '@/lib/seo/schema';
import { QuranPageLayout } from '@/components/quran/layout/quran-page-layout';
import { VerseHeader } from '@/components/quran/verse/verse-header';
import { VerseCard } from '@/components/quran/verse/verse-card';
import { PageNavigation } from '@/components/quran/navigation/page-navigation';
import { ContextToggle } from '@/components/quran/navigation/context-toggle';
import { Book } from 'lucide-react';

interface PageProps {
  params: Promise<{
    surahNumber: string;
    ayahNumber: string;
  }>;
  searchParams: Promise<{
    context?: string;
  }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { surahNumber, ayahNumber } = await params;
  const surahNum = Number.parseInt(surahNumber);
  const ayahNum = Number.parseInt(ayahNumber);

  if (Number.isNaN(surahNum) || Number.isNaN(ayahNum)) {
    return { title: 'Verse Not Found' };
  }

  const verse = await getVerseBySurahAndAyah({
    surahNumber: surahNum,
    ayahNumber: ayahNum,
  });

  if (!verse) {
    return { title: 'Verse Not Found' };
  }

  const surahMetadata = getSurahMetadata(surahNum);
  const title = `${verse.surahNameEnglish} ${surahNum}:${ayahNum} - Quran Verse`;
  const description = verse.textEnglish.slice(0, 200) + (verse.textEnglish.length > 200 ? '...' : '');

  return {
    title,
    description,
    keywords: [
      `Quran ${surahNum}:${ayahNum}`,
      verse.surahNameEnglish,
      'Quran verse',
      'Islamic text',
      surahMetadata?.transliteration || '',
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

export default async function VersePage({ params, searchParams }: PageProps) {
  const { surahNumber, ayahNumber } = await params;
  const { context: contextParam } = await searchParams;
  
  const surahNum = Number.parseInt(surahNumber);
  const ayahNum = Number.parseInt(ayahNumber);

  // Validate parameters
  if (Number.isNaN(surahNum) || Number.isNaN(ayahNum) || surahNum < 1 || surahNum > 114 || ayahNum < 1) {
    notFound();
  }

  // Determine context window (default: hidden, can be enabled with ?context=true)
  const showContext = contextParam === 'true';
  const contextWindow = showContext ? 5 : 0;

  const verseData = await getVerseWithContext({
    surahNumber: surahNum,
    ayahNumber: ayahNum,
    contextWindow,
  });

  if (!verseData || !verseData.target) {
    notFound();
  }

  const { target, contextBefore, contextAfter } = verseData;
  const surahMetadata = getSurahMetadata(surahNum);
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://criterion.life';

  // Breadcrumb schema
  const breadcrumbSchema = createBreadcrumbSchema([
    { name: 'Home', url: siteUrl },
    { name: 'Quran', url: `${siteUrl}/quran` },
    { name: `Surah ${surahMetadata?.transliteration || surahNum}`, url: `${siteUrl}/quran/${surahNum}` },
    { name: `Verse ${ayahNum}`, url: `${siteUrl}/quran/${surahNum}/${ayahNum}` },
  ]);

  // Calculate previous and next verse
  const hasPrevious = ayahNum > 1;
  const hasNext = surahMetadata && ayahNum < surahMetadata.verses;

  return (
    <QuranPageLayout
      breadcrumbs={[
        { label: 'Home', href: '/' },
        { label: 'Quran', href: '/quran' },
        { label: `Surah ${surahNum}`, href: `/quran/${surahNum}` },
        { label: `Verse ${ayahNum}` },
      ]}
      jsonLd={breadcrumbSchema}
      cta={{
        title: 'Have questions about this verse?',
        description: 'Ask our AI assistant powered by Quran and Hadith',
      }}
    >
      <VerseHeader
        surahNumber={surahNum}
        verseNumber={ayahNum}
        surahName={{
          english: target.surahNameEnglish,
          arabic: target.surahNameArabic,
          transliteration: surahMetadata?.transliteration,
          translation: surahMetadata?.translation,
        }}
        links={[
          {
            label: 'View Full Surah',
            href: `/quran/${surahNum}#verse-${ayahNum}`,
            icon: <Book className="size-4" />,
          },
        ]}
      />

      {/* Context Before */}
      {showContext && contextBefore.length > 0 && (
        <div className="mb-6 space-y-4">
          {contextBefore.map((verse) => (
            <VerseCard
              key={verse.id}
              verse={verse}
              variant="context"
              showVerseLink
              showQuranComLink={false}
            />
          ))}
        </div>
      )}

      {/* Main Verse - Highlighted */}
      <div className="mb-6">
        <VerseCard
          verse={target}
          variant="highlighted"
          showQuranComLink
        />
      </div>

      {/* Context After */}
      {showContext && contextAfter.length > 0 && (
        <div className="mb-8 space-y-4">
          {contextAfter.map((verse) => (
            <VerseCard
              key={verse.id}
              verse={verse}
              variant="context"
              showVerseLink
              showQuranComLink={false}
            />
          ))}
        </div>
      )}

      {/* Context Toggle */}
      <div className="mb-8">
        <ContextToggle
          surahNumber={surahNum}
          ayahNumber={ayahNum}
          showContext={showContext}
          contextWindow={5}
        />
      </div>

      {/* Navigation */}
      <PageNavigation
        previous={
          hasPrevious
            ? {
                href: `/quran/${surahNum}/${ayahNum - 1}`,
                label: `Verse ${ayahNum - 1}`,
                sublabel: 'Previous',
              }
            : undefined
        }
        next={
          hasNext
            ? {
                href: `/quran/${surahNum}/${ayahNum + 1}`,
                label: `Verse ${ayahNum + 1}`,
                sublabel: 'Next',
              }
            : undefined
        }
      />
    </QuranPageLayout>
  );
}
