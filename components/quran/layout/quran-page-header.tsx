import Link from 'next/link';
import { CriterionBranding } from '@/components/criterion-branding';

export function QuranPageHeader() {
  return (
    <header className="border-b">
      <div className="mx-auto max-w-4xl px-4 py-4">
        <div className="flex items-center justify-between">
          <CriterionBranding />
          <nav className="flex gap-6 text-sm">
            <Link href="/quran/search" className="text-muted-foreground hover:text-foreground transition-colors">
              Search
            </Link>
            <Link href="/about" className="text-muted-foreground hover:text-foreground transition-colors">
              About
            </Link>
            <Link href="/faq" className="text-muted-foreground hover:text-foreground transition-colors">
              FAQ
            </Link>
          </nav>
        </div>
      </div>
    </header>
  );
}
