import { QuranPageHeader } from './quran-page-header';
import { QuranBreadcrumbs } from './quran-breadcrumbs';
import { ChatCTA } from '../shared/chat-cta';

interface BreadcrumbItem {
  label: string;
  href?: string;
}

interface QuranPageLayoutProps {
  children: React.ReactNode;
  breadcrumbs: BreadcrumbItem[];
  jsonLd?: object;
  cta?: {
    title: string;
    description: string;
  } | false;
}

export function QuranPageLayout({
  children,
  breadcrumbs,
  jsonLd,
  cta,
}: QuranPageLayoutProps) {
  return (
    <>
      {jsonLd && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      )}

      <div className="min-h-screen bg-background">
        <QuranPageHeader />

        <div className="mx-auto max-w-4xl px-4 py-8">
          <QuranBreadcrumbs items={breadcrumbs} />

          {children}

          {cta !== false && (
            <div className="mt-12">
              <ChatCTA
                title={cta?.title}
                description={cta?.description}
              />
            </div>
          )}
        </div>
      </div>
    </>
  );
}
