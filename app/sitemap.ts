import { MetadataRoute } from 'next';
import { SURAH_METADATA } from '@/lib/quran-metadata';
import { getAllTopicsSorted } from '@/lib/topics';

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://criterion.life';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const currentDate = new Date();

  // Static pages
  const staticPages = [
    {
      url: siteUrl,
      lastModified: currentDate,
      changeFrequency: 'daily' as const,
      priority: 1.0,
    },
    {
      url: `${siteUrl}/about`,
      lastModified: currentDate,
      changeFrequency: 'monthly' as const,
      priority: 0.8,
    },
    {
      url: `${siteUrl}/how-it-works`,
      lastModified: currentDate,
      changeFrequency: 'monthly' as const,
      priority: 0.8,
    },
    {
      url: `${siteUrl}/faq`,
      lastModified: currentDate,
      changeFrequency: 'monthly' as const,
      priority: 0.8,
    },
    {
      url: `${siteUrl}/developers`,
      lastModified: currentDate,
      changeFrequency: 'monthly' as const,
      priority: 0.7,
    },
    {
      url: `${siteUrl}/topics`,
      lastModified: currentDate,
      changeFrequency: 'monthly' as const,
      priority: 0.9,
    },
    {
      url: `${siteUrl}/quran/search`,
      lastModified: currentDate,
      changeFrequency: 'weekly' as const,
      priority: 0.9,
    },
    {
      url: `${siteUrl}/hadith/search`,
      lastModified: currentDate,
      changeFrequency: 'weekly' as const,
      priority: 0.9,
    },
    {
      url: `${siteUrl}/quran`,
      lastModified: currentDate,
      changeFrequency: 'yearly' as const,
      priority: 0.9,
    },
    {
      url: `${siteUrl}/hadith`,
      lastModified: currentDate,
      changeFrequency: 'yearly' as const,
      priority: 0.8,
    },
  ];

  // All 114 Surahs
  const surahPages = Array.from({ length: 114 }, (_, i) => ({
    url: `${siteUrl}/quran/${i + 1}`,
    lastModified: currentDate,
    changeFrequency: 'yearly' as const,
    priority: 0.7,
  }));

  // All 6,236 individual verse pages
  const versePages: MetadataRoute.Sitemap = [];
  for (const surah of SURAH_METADATA) {
    for (let ayah = 1; ayah <= surah.verses; ayah++) {
      versePages.push({
        url: `${siteUrl}/quran/${surah.number}/${ayah}`,
        lastModified: currentDate,
        changeFrequency: 'yearly' as const,
        priority: 0.6,
      });
    }
  }

  // All 20 topic pages
  const topics = getAllTopicsSorted();
  const topicPages = topics.map((topic) => ({
    url: `${siteUrl}/topics/${topic.slug}`,
    lastModified: currentDate,
    changeFrequency: 'monthly' as const,
    priority: topic.priority,
  }));

  return [...staticPages, ...surahPages, ...versePages, ...topicPages];
}
