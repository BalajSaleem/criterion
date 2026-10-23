/**
 * SEO Utilities and Structured Data Schemas
 */
import socialImage from "@/app/opengraph-image.png";
const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://criterion.life';

/**
 * Organization Schema (JSON-LD)
 * Helps search engines understand who we are
 */
export const organizationSchema = {
  '@context': 'https://schema.org',
  '@type': 'Organization',
  name: 'Criterion',
  alternateName: 'Criterion AI',
  description: 'Intelligent AI assistant for exploring Islam. Ask questions about Islam, the Quran, and Hadith. Get authentic answers from Islamic sources with an AI-powered guide.',
  url: siteUrl,
  logo: {
    '@type': 'ImageObject',
    url: socialImage.src,
    width: 512,
    height: 512,
  },
  foundingDate: '2024',
  sameAs: [
    'https://github.com/BalajSaleem/criterion'
  ],
  contactPoint: {
    '@type': 'ContactPoint',
    contactType: 'Customer Support',
    url: `${siteUrl}`,
  },
};

/**
 * WebSite Schema with Search Action (JSON-LD)
 * Enables site search box in Google results
 */
export const websiteSchema = {
  '@context': 'https://schema.org',
  '@type': 'WebSite',
  name: 'Criterion',
  alternateName: 'Criterion - Islamic AI Assistant',
  url: siteUrl,
  description: 'Intelligent AI assistant for exploring Islam. Ask questions about Islam, the Quran, and Hadith. Get authentic answers from Islamic sources with an AI-powered guide. Search and find answers from Quranic verses and authentic Hadiths.',
  inLanguage: 'en',
  publisher: {
    '@type': 'Organization',
    name: 'Criterion',
    logo: {
      '@type': 'ImageObject',
      url: socialImage.src,
    },
  },
  potentialAction: [
    {
      '@type': 'SearchAction',
      target: {
        '@type': 'EntryPoint',
        urlTemplate: `${siteUrl}/search?q={search_term_string}`,
      },
      'query-input': 'required name=search_term_string',
    },
    {
      '@type': 'ReadAction',
      target: {
        '@type': 'EntryPoint',
        urlTemplate: `${siteUrl}/quran`,
      },
    },
  ],
};

/**
 * FAQ Page Schema (JSON-LD)
 * For structured FAQ data in search results
 */
export function createFAQSchema(faqs: Array<{ question: string; answer: string }>) {
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faqs.map((faq) => ({
      '@type': 'Question',
      name: faq.question,
      acceptedAnswer: {
        '@type': 'Answer',
        text: faq.answer,
      },
    })),
  };
}

/**
 * BreadcrumbList Schema (JSON-LD)
 * For breadcrumb navigation in search results
 */
export function createBreadcrumbSchema(items: Array<{ name: string; url: string }>) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: item.name,
      item: item.url,
    })),
  };
}

/**
 * Article Schema (JSON-LD)
 * For content pages like Surah details
 */
export function createArticleSchema(article: {
  title: string;
  description: string;
  url: string;
  datePublished?: Date;
  dateModified?: Date;
}) {
  return {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: article.title,
    description: article.description,
    url: article.url,
    datePublished: article.datePublished?.toISOString(),
    dateModified: article.dateModified?.toISOString(),
    author: {
      '@type': 'Organization',
      name: 'Criterion',
    },
    publisher: {
      '@type': 'Organization',
      name: 'Criterion',
      logo: {
        '@type': 'ImageObject',
        url: socialImage.src,
      },
    },
  };
}

/**
 * Hadith Article Schema (JSON-LD)
 * For individual hadith pages with religious text specifics
 */
export function createHadithArticleSchema(hadith: {
  reference: string;
  title: string;
  description: string;
  url: string;
  collection: string;
  compiler?: string;
  grade?: string;
  arabicText?: string;
  englishText: string;
}) {
  return {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: hadith.title,
    description: hadith.description,
    url: hadith.url,
    articleBody: hadith.englishText,
    inLanguage: ['en', 'ar'],
    about: {
      '@type': 'Thing',
      name: 'Islamic Hadith',
      description: `Narration from ${hadith.collection}`,
    },
    author: {
      '@type': 'Organization',
      name: 'Criterion',
      description: 'AI-powered Islamic guide providing authentic knowledge from the Quran and Hadith',
    },
    publisher: {
      '@type': 'Organization',
      name: 'Criterion',
      logo: {
        '@type': 'ImageObject',
        url: socialImage.src,
      },
    },
    isPartOf: {
      '@type': 'Book',
      name: hadith.collection,
      author: hadith.compiler ? {
        '@type': 'Person',
        name: hadith.compiler,
      } : undefined,
    },
    datePublished: new Date('2024-01-01').toISOString(), // Collection compilation date proxy
    dateModified: new Date('2024-01-01').toISOString(),
  };
}

/**
 * SoftwareApplication Schema (JSON-LD)
 * Helps search engines understand Criterion as a web application
 */
export const softwareApplicationSchema = {
  '@context': 'https://schema.org',
  '@type': 'SoftwareApplication',
  name: 'Criterion',
  applicationCategory: 'EducationalApplication',
  operatingSystem: 'Web Browser',
  offers: {
    '@type': 'Offer',
    price: '0',
    priceCurrency: 'USD',
  },
  aggregateRating: {
    '@type': 'AggregateRating',
    ratingValue: '5.0',
    ratingCount: '1',
  },
  description: 'AI-powered Islamic assistant for exploring the Quran and Hadith. Ask questions and get authentic answers from Islamic sources.',
  url: siteUrl,
  author: {
    '@type': 'Organization',
    name: 'Criterion',
  },
  featureList: [
    'Search 6,236 Quranic verses',
    'Search 21,641 authentic Hadiths from 6 collections',
    'AI-powered Islamic guidance',
    'Multilingual support (English, Slovak)',
    'Authentic source citations',
    'Real-time responses',
  ],
  screenshot: `${siteUrl}/opengraph-image.png`,
};
