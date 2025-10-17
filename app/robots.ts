import { MetadataRoute } from 'next';

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://criterion.life';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: [
          '/chat/',
          '/api/',
          '/(auth)/',
        ],
      },
    ],
    sitemap: `${siteUrl}/sitemap.xml`,
  };
}
