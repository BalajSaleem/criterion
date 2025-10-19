import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { getVersesBySurah } from '@/lib/db/queries';
import { getSurahMetadata } from '@/lib/quran-metadata';
import { createBreadcrumbSchema } from '@/lib/seo/schema';
import { getQuranLanguageFromParam } from '@/lib/quran-language';
import { QuranPageLayout } from '@/components/quran/layout/quran-page-layout';
import { VerseHeader } from '@/components/quran/verse/verse-header';
import { VerseCard } from '@/components/quran/verse/verse-card';
import { PageNavigation } from '@/components/quran/navigation/page-navigation';
import { LanguageSelector } from '@/components/quran/language-selector';

interface PageProps {
  params: Promise<{
    surahNumber: string;
  }>;
  searchParams: Promise<{
    lang?: string;
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

export default async function SurahPage({ params, searchParams }: PageProps) {
  const { surahNumber } = await params;
  const { lang: langParam } = await searchParams;
  const num = Number.parseInt(surahNumber);
  const language = getQuranLanguageFromParam(langParam);

  // Validate surah number
  if (Number.isNaN(num) || num < 1 || num > 114) {
    notFound();
  }

  const metadata = getSurahMetadata(num);
  if (!metadata) {
    notFound();
  }

  // Fetch all verses for this Surah with language support
  const verses = await getVersesBySurah({ surahNumber: num, language });

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
    <QuranPageLayout
      breadcrumbs={[
        { label: 'Home', href: '/' },
        { label: 'Quran', href: '/quran' },
        { label: `Surah ${num}` },
      ]}
      jsonLd={breadcrumbSchema}
      cta={{
        title: 'Have questions about this Surah?',
        description: 'Ask our AI assistant powered by Quran and Hadith',
      }}
    >
      <VerseHeader
        surahNumber={num}
        surahName={{
          english: metadata.transliteration,
          arabic: metadata.name,
          transliteration: metadata.transliteration,
          translation: metadata.translation,
        }}
        metadata={{
          type: metadata.type,
          verses: metadata.verses,
          number: metadata.number,
        }}
      />

      {/* Language Selector */}
      <div className="mb-8 flex justify-end">
        <LanguageSelector currentLanguage={language} className="w-[200px]" />
      </div>

      {/* Verses */}
      <div className="space-y-6">
        {verses.map((verse) => (
          <VerseCard
            key={verse.id}
            verse={verse}
            variant="default"
            showVerseLink
            showQuranComLink
          />
        ))}
      </div>

      {/* Navigation */}
      <div className="mt-12">
        <PageNavigation
          previous={
            num > 1
              ? {
                  href: `/quran/${num - 1}`,
                  label: `Surah ${num - 1}`,
                  sublabel: 'Previous',
                }
              : undefined
          }
          next={
            num < 114
              ? {
                  href: `/quran/${num + 1}`,
                  label: `Surah ${num + 1}`,
                  sublabel: 'Next',
                }
              : undefined
          }
          center={{
            href: '/quran',
            label: 'All Surahs',
          }}
        />
      </div>
    </QuranPageLayout>
  );
}
