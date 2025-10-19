"use client";

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { cn } from '@/lib/utils';
import { buildQuranUrl } from '@/lib/quran-url-helpers';

interface VerseCardProps {
  verse: {
    id?: string;
    surahNumber: number;
    ayahNumber: number;
    textArabic: string;
    textEnglish: string;
    surahNameEnglish?: string;
    // Multilingual support
    translation?: string | null;
    translatorName?: string | null;
  };
  variant?: 'default' | 'highlighted' | 'context';
  showVerseLink?: boolean;
  showQuranComLink?: boolean;
  className?: string;
}

export function VerseCard({
  verse,
  variant = 'default',
  showVerseLink = false,
  showQuranComLink = true,
  className,
}: VerseCardProps) {
  const searchParams = useSearchParams();
  const isHighlighted = variant === 'highlighted';
  const isContext = variant === 'context';
  const isCardClickable = showVerseLink && (variant === 'default' || isContext);

  // Use translation if available, otherwise fall back to textEnglish
  const translationText = verse.translation || verse.textEnglish;
  
  // Build verse URL with preserved query params
  const verseUrl = buildQuranUrl(
    `/quran/${verse.surahNumber}/${verse.ayahNumber}`,
    searchParams
  );

  const cardClasses = cn(
    'rounded-lg p-6 transition-colors',
    {
      // Default variant - regular verse in list
      'border hover:bg-muted/50': variant === 'default',
      
      // Highlighted variant - featured verse
      'border-2 border-primary bg-card shadow-sm': isHighlighted,
      
      // Context variant - muted context verses
      'border border-muted bg-muted/30 hover:border-muted-foreground/30': isContext,
    },
    className
  );

  const arabicTextClasses = cn(
    'font-arabic mb-3 text-right leading-loose',
    {
      'text-2xl': variant === 'default',
      'text-3xl md:text-4xl mb-6': isHighlighted,
      'text-lg text-muted-foreground': isContext,
    }
  );

  const englishTextClasses = cn(
    'leading-relaxed',
    {
      'text-base text-foreground/90': variant === 'default',
      'text-lg': isHighlighted,
      'text-sm text-muted-foreground': isContext,
    }
  );

  const verseNumberClasses = cn(
    'text-sm font-medium',
    {
      'text-muted-foreground hover:text-primary': variant === 'default',
      'text-primary': isHighlighted,
      'text-muted-foreground': isContext,
    }
  );

  const content = (
    <>
      {/* Verse Number & Links */}
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className={verseNumberClasses}>
            Verse {verse.ayahNumber}
          </span>
        </div>
        
        {/* Only show Quran.com link if card itself is not clickable (to avoid nested anchors) */}
        {showQuranComLink && !isCardClickable && (
          <a
            href={`https://quran.com/${verse.surahNumber}/${verse.ayahNumber}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-muted-foreground hover:text-foreground"
          >
            {isHighlighted ? 'View on Quran.com ↗' : 'Quran.com ↗'}
          </a>
        )}
      </div>

      {/* Arabic Text */}
      <p className={arabicTextClasses}>
        {verse.textArabic}
      </p>

      {/* Translation */}
      <p className={englishTextClasses}>
        {translationText}
      </p>
    </>
  );

  // Wrap entire card in Link if showVerseLink is true (for default and context variants)
  if (isCardClickable) {
    return (
      <Link
        href={verseUrl}
        className={cn(cardClasses, 'block')}
        id={variant === 'default' ? `verse-${verse.ayahNumber}` : undefined}
      >
        {content}
      </Link>
    );
  }

  // Regular div for highlighted variant or when no link needed
  return (
    <div
      className={cardClasses}
      id={variant === 'default' ? `verse-${verse.ayahNumber}` : undefined}
    >
      {content}
    </div>
  );
}
