# Criterion SEO Plan

**Focus**: Minimal, clean, maintainable SEO foundation for Criterion.life Quran and ahadith based AI intelligence.  
**Target Audience**: Muslims and Non-Muslims curious about Islam, seekers, converters  
**Philosophy**: Simple, professional, open-source

---

## ✅ Completed (Quick Wins) - Week 1

**Technical Foundation** - DONE ✅

- ✅ Fixed `metadataBase` URL (uses `NEXT_PUBLIC_SITE_URL=https://criterion.life`)
- ✅ Enhanced root metadata with comprehensive SEO tags
- ✅ Added Open Graph tags (title, description, images, type)
- ✅ Added Twitter Card tags for social sharing
- ✅ Added comprehensive keywords targeting curious seekers
- ✅ Added `noindex` to chat pages (`/chat/[id]`) to prevent conversation indexing
- ✅ Created `robots.ts` - blocks `/chat/`, `/api/`, `/(auth)/`
- ✅ Created `sitemap.ts` - 122 URLs (8 static pages + 114 Surah pages)
- ✅ Created JSON-LD schemas (Organization, WebSite with SearchAction)
- ✅ Added structured data to root layout for rich search results
- ✅ Updated `.env.example` with `NEXT_PUBLIC_SITE_URL`

**Test Results:**

- ✅ `robots.txt` working at `/robots.txt`
- ✅ `sitemap.xml` working at `/sitemap.xml` (19KB, 122 URLs)
- ✅ Build successful, all routes generated
- ✅ Dev server working

---

## 🎯 Next Best Actions (Priority Order)

### 1. **FAQ Page** (2-3 hours) - HIGHEST IMPACT ⭐

**Why**: FAQ schema → featured snippets in Google, builds trust

- Create `/app/(marketing)/faq/page.tsx`
- 10-15 questions: "What is Islam?", "Is this authentic?", "How to learn Quran?"
- Use `createFAQSchema()` from `lib/seo/schema.ts`
- Target keywords for curious seekers

### 2. **Quran Browse Pages** (4-6 hours) - HIGHEST SEO VALUE ⭐⭐⭐

**Why**: 114 unique indexable pages with real content from your database

- `/app/quran/page.tsx` - List all 114 Surahs (already in sitemap!)
- `/app/quran/[surahNumber]/page.tsx` - Dynamic Surah detail pages
- Query database for verses, add metadata, breadcrumbs
- Each page targets "Surah [name]", "Quran chapter [number]"

### 3. **Theme Search Page** (4-5 hours) - UNIQUE DIFFERENTIATOR ⭐⭐

**Why**: No competitor has semantic search UI, showcases your RAG tech

- `/app/search/page.tsx` with clean search interface
- Reuse `findRelevantVerses()` and `findRelevantHadiths()`
- Target: "Quran verses about [topic]", "What does Islam say about [topic]"

### 4. **About + How It Works Pages** (2-3 hours each)

**Why**: Build trust, explain value, target informational keywords

- `/app/(marketing)/about/page.tsx` - Mission, authenticity, open source
- `/app/(marketing)/how-it-works/page.tsx` - RAG explained simply

### 5. **Footer Navigation** (1-2 hours)

**Why**: Internal linking + discovery (hide during active chat)

- Add to chat layout with links to all pages
- Minimal, clean design

---

## 📊 Suggested Timeline

**Week 2** (10-12 hours): FAQ + Quran browse + Footer  
**Week 3** (8-10 hours): Theme search + About + How It Works  
**Week 4** (4-6 hours): Developers page + Hadith overview + Polish

**Result**: ~125 indexable pages with authentic Islamic content ready for Google.

---

## 🎯 Core Principles

- **Chat First**: Chat interface remains the landing page and primary entry point
- **Minimal & Clean**: Simple footer links, no clutter, professional design
- **Maintainable**: Readable code, no over-optimization, future-proof
- **Seeker-Focused**: Keywords for curious Muslims and non-Muslims, not Islamic scholars
- **Open Source**: Highlight developer resources and transparency

---

## 📋 Phase 1: Technical SEO Foundation (Week 1)

### 1.1 Fix Core Metadata

**Root Layout** (`app/layout.tsx`):

```typescript
export const metadata: Metadata = {
  metadataBase: new URL("https://yourdomain.com"), // Fix this!
  title: "Criterion - Quran Powered AI Assistant",
  description:
    "Ask questions about Islam, the Quran, and Hadith. Get authentic answers from Islamic sources with an AI-powered guide.",
  keywords: [
    "Quran search",
    "Islamic questions",
    "learn about Islam",
    "Quran AI",
    "Islamic teachings",
    "understanding Islam",
  ],
  openGraph: {
    title: "Criterion - Quran Powered AI Assistant",
    description:
      "Ask questions about Islam, the Quran, and Hadith. Get authentic answers.",
    type: "website",
    images: [{ url: "/og-image.png" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Criterion - Quran Powered AI Assistant",
    description: "Ask questions about Islam, the Quran, and Hadith.",
    images: ["/og-image.png"],
  },
};
```

**Chat Pages** (`app/(chat)/chat/[id]/page.tsx`):

```typescript
export const metadata = {
  robots: {
    index: false, // Don't index chat conversations
    follow: true,
  },
};
```

### 1.2 Create Essential Files

**`app/robots.ts`**:

```typescript
export default function robots() {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/chat/", "/api/"], // Block chat conversations
    },
    sitemap: "https://yourdomain.com/sitemap.xml",
  };
}
```

**`app/sitemap.ts`**:

```typescript
export default async function sitemap() {
  const baseUrl = "https://yourdomain.com";

  // Static pages
  const staticPages = [
    "",
    "about",
    "how-it-works",
    "faq",
    "resources",
    "developers",
    "search",
  ];

  // All 114 Surahs
  const surahs = Array.from({ length: 114 }, (_, i) => ({
    url: `${baseUrl}/quran/${i + 1}`,
    lastModified: new Date(),
    changeFrequency: "yearly",
    priority: 0.7,
  }));

  return [
    ...staticPages.map((route) => ({
      url: `${baseUrl}/${route}`,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: route === "" ? 1.0 : 0.8,
    })),
    ...surahs,
  ];
}
```

### 1.3 Add JSON-LD Schema

**`lib/seo/schema.ts`**:

```typescript
export const organizationSchema = {
  "@context": "https://schema.org",
  "@type": "Organization",
  name: "Criterion",
  description:
    "Open-source Quran-powered AI assistant for learning about Islam",
  url: "https://yourdomain.com",
  logo: "https://yourdomain.com/logo.png",
  sameAs: ["https://github.com/BalajSaleem/criterion"],
};

export const websiteSchema = {
  "@context": "https://schema.org",
  "@type": "WebSite",
  name: "Criterion",
  url: "https://yourdomain.com",
  potentialAction: {
    "@type": "SearchAction",
    target: "https://yourdomain.com/search?q={search_term_string}",
    "query-input": "required name=search_term_string",
  },
};
```

Add to root layout:

```typescript
<script
  type="application/ld+json"
  dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationSchema) }}
/>
```

---

## 📄 Phase 2: Core Pages (Week 2)

### 2.1 Footer Navigation

**Simple footer links** (visible on chat page, hidden during chat):

- About
- How It Works
- FAQ
- Resources → Quran, Hadith
- Search (theme search)
- Developers

**Implementation**: Add to `app/(chat)/layout.tsx` footer, hide on scroll/engagement.

### 2.2 Static Info Pages

**`app/(marketing)/about/page.tsx`**:

- Mission: Help people understand Islam through authentic sources
- Technology: AI-powered RAG with Quran + Hadith
- Open source: Link to GitHub
- Authenticity: Sahih hadith, verified translations

**`app/(marketing)/how-it-works/page.tsx`**:

- Simple explanation of RAG (for users, not engineers)
- How citations work
- Why it's reliable
- CTA: Try the chat

**`app/(marketing)/faq/page.tsx`**:

- "What is Criterion?"
- "Is this information authentic?"
- "Can I learn about Islam here?"
- "Is this free?"
- "Who built this?"
- FAQ schema for rich snippets

**`app/(marketing)/developers/page.tsx`**:

- GitHub repo link
- Tech stack overview
- How to contribute
- API documentation (if public)
- Open source philosophy

---

## 📚 Phase 3: Resource Pages (Week 3)

### 3.1 Quran Browse

**`app/quran/page.tsx`**:

- List all 114 Surahs with English names
- Verse counts
- Brief one-line description
- Link to full Surah
- Metadata optimized for "Quran surah list"

**`app/quran/[surahNumber]/page.tsx`**:

- Full Surah text (Arabic + English)
- Surah metadata (Meccan/Medinan, verse count, theme)
- Clean, readable layout
- Prev/Next navigation
- "Ask about this Surah" CTA to chat
- Dynamic metadata per Surah

### 3.2 Hadith Collections

**`app/hadith/page.tsx`**:

- Overview of collections: Sahih Bukhari, Sahih Muslim, Nawawi40, Riyadussalihin
- Hadith counts per collection
- Authenticity grading explanation
- Browse by collection
- Link to theme search

**`app/hadith/[collection]/page.tsx`** (optional, future):

- List hadiths by collection
- Can defer if too complex

---

## 🔍 Phase 4: Theme Search Page (Week 4)

### 4.1 Standalone Search Interface

**`app/search/page.tsx`**:

- Clean search box: "Search Quran & Hadith by theme..."
- Example queries: "patience", "prayer", "forgiveness", "afterlife"
- Returns top 20 RAG results (verses + hadiths)
- Minimal UI: Just search box + results
- No chat interface, just pure search
- Each result links to full Surah or Hadith page

**Why this matters**:

- Unique offering (most sites don't have semantic search)
- SEO gold (users searching "Quran verses about X")
- Shareable results (direct links)
- Demonstrates RAG capabilities

**Implementation**:

```typescript
// Reuse existing RAG functions
import { findRelevantVerses, findRelevantHadiths } from "@/lib/ai/embeddings";

// Simple search API route
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get("q");

  const verses = await findRelevantVerses(query);
  const hadiths = await findRelevantHadiths(query, { gradeFilter: "sahih" });

  return Response.json({ verses, hadiths });
}
```

---

## 🎯 Target Keywords (Non-Muslim Focus)

### Primary Keywords

- "Questions about Islam"
- "What is Islam about"
- "Quran search"
- "Understanding the Quran"
- "Learn about Islam"
- "Islamic teachings explained"

### Long-Tail Keywords

- "What does the Quran say about [topic]"
- "Islamic perspective on [topic]"
- "Quran verses about [topic]"
- "Understanding Islamic beliefs"
- "Is Islam [question]"
- "What do Muslims believe about [topic]"

### Technical/Developer Keywords

- "Quran API"
- "Islamic AI open source"
- "RAG chatbot for Quran"
- "Vector search Quran"

---

## 📐 File Structure

```
app/
├── (chat)/
│   ├── page.tsx              # Landing page (chat interface)
│   ├── chat/[id]/
│   │   └── page.tsx          # Chat pages (noindex)
│   └── layout.tsx            # Add footer with links
│
├── (marketing)/
│   ├── about/page.tsx
│   ├── how-it-works/page.tsx
│   ├── faq/page.tsx
│   └── developers/page.tsx
│
├── quran/
│   ├── page.tsx              # Surah list (SEO page)
│   └── [surahNumber]/
│       └── page.tsx          # Surah detail (114 pages)
│
├── hadith/
│   ├── page.tsx              # Collections overview
│   └── [collection]/
│       └── page.tsx          # Collection detail (optional)
│
├── search/
│   ├── page.tsx              # Theme search interface
│   └── api/
│       └── route.ts          # Search API
│
├── robots.ts                 # Crawler rules
├── sitemap.ts                # Dynamic sitemap
└── layout.tsx                # Fix metadataBase

lib/
└── seo/
    └── schema.ts             # JSON-LD schemas
```

---

## ✅ Implementation Checklist

### Week 1: Foundation

- [ ] Fix `metadataBase` URL in `app/layout.tsx`
- [ ] Add comprehensive metadata (OG tags, Twitter cards)
- [ ] Add `noindex` to chat pages
- [ ] Create `robots.ts`
- [ ] Create `sitemap.ts`
- [ ] Add JSON-LD schema to root layout
- [ ] Create OG image (`/og-image.png`)

### Week 2: Info Pages

- [ ] Add footer to chat layout (with hide-on-engagement)
- [ ] Create About page
- [ ] Create How It Works page
- [ ] Create FAQ page (with FAQ schema)
- [ ] Create Developers page

### Week 3: Resources

- [ ] Create Quran browse page (list 114 Surahs)
- [ ] Create dynamic Surah detail pages (use existing data)
- [ ] Add metadata per Surah
- [ ] Create Hadith collections page
- [ ] Test all internal links

### Week 4: Search

- [ ] Create theme search page
- [ ] Create search API route (reuse RAG functions)
- [ ] Design minimal search UI
- [ ] Test search results
- [ ] Add metadata for search page

---

## 📊 Success Metrics

### Technical (1 month)

- ✅ 120+ pages indexed (114 Surahs + static pages)
- ✅ 0 indexing errors in Search Console
- ✅ All pages have proper metadata
- ✅ Sitemap submitted and verified

### Traffic (3 months)

- ✅ 1,000-5,000 organic visits/month
- ✅ 10+ keywords ranking in top 50
- ✅ 3+ featured snippets for Quran searches

### Engagement (6 months)

- ✅ Average session >3 minutes
- ✅ 30%+ search-to-chat conversion
- ✅ Low bounce rate (<50%)

---

## 🎨 Design Principles

1. **Minimal**: No clutter, clean typography, lots of whitespace
2. **Professional**: Trustworthy, respectful of religious content
3. **Accessible**: High contrast, readable fonts, keyboard navigation
4. **Mobile-First**: Most seekers browse on mobile
5. **Fast**: No unnecessary animations or heavy assets

---

## 🚫 What We're NOT Doing

- ❌ No blog or articles section
- ❌ No topic/category pages
- ❌ No content marketing campaigns
- ❌ No multilingual (for now)
- ❌ No complicated SEO tricks
- ❌ No sacrificing code quality for SEO
- ❌ No overindexing on SEO at expense of features

---

## 🔧 Maintenance Plan

- **Monthly**: Review Search Console, fix any errors
- **Quarterly**: Update FAQ based on common questions
- **Yearly**: Refresh metadata, add new resources if needed
- **Ongoing**: Monitor performance, avoid feature bloat

---

## 💡 Quick Wins (Do First)

1. **Fix metadataBase** (5 min)
2. **Add robots.txt** (10 min)
3. **Add sitemap.xml** (30 min)
4. **Add noindex to chat** (5 min)
5. **Create FAQ page** (2 hours)
6. **Create Quran browse** (3 hours)

Total time to basic SEO: **1 day**

---

## 🎯 Summary

This plan focuses on:

- ✅ Solid technical foundation (proper metadata, sitemap, robots.txt)
- ✅ Leveraging existing data (114 Surahs = 114 SEO pages)
- ✅ Unique offering (theme search interface)
- ✅ Open source appeal (developer page)
- ✅ Non-Muslim seekers (question-based keywords)
- ✅ Maintainable, clean code
- ✅ Chat-first experience

**Result**: Clean, professional SEO implementation that enhances (not distracts from) the core chat experience, while creating valuable standalone resources for organic discovery.
