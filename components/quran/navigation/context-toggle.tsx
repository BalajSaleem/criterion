"use client";

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { buildQuranUrl } from '@/lib/quran-url-helpers';

interface ContextToggleProps {
  surahNumber: number;
  ayahNumber: number;
  showContext: boolean;
  contextWindow?: number;
}

export function ContextToggle({
  surahNumber,
  ayahNumber,
  showContext,
  contextWindow = 5,
}: ContextToggleProps) {
  const searchParams = useSearchParams();
  const basePath = `/quran/${surahNumber}/${ayahNumber}`;

  return (
    <div className="text-center">
      {showContext ? (
        <Link
          href={buildQuranUrl(basePath, searchParams, { context: '' })}
          className="text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          Hide context
        </Link>
      ) : (
        <Link
          href={buildQuranUrl(basePath, searchParams, { context: 'true' })}
          className="text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          Show context (±{contextWindow} verses)
        </Link>
      )}
    </div>
  );
}
