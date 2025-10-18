import Link from 'next/link';

interface VerseHeaderProps {
  surahNumber: number;
  verseNumber?: number;
  surahName: {
    english: string;
    arabic: string;
    transliteration?: string;
    translation?: string;
  };
  metadata?: {
    type: string;
    verses: number;
    number: number;
  };
  links?: Array<{
    label: string;
    href: string;
    icon?: React.ReactNode;
  }>;
}

export function VerseHeader({
  surahNumber,
  verseNumber,
  surahName,
  metadata,
  links,
}: VerseHeaderProps) {
  const isVersePage = verseNumber !== undefined;

  return (
    <div className="mb-8 border-b pb-6">
      <div className="flex items-start justify-between mb-4">
        <div>
          <h1 className={isVersePage ? 'text-2xl md:text-3xl font-bold mb-2' : 'mb-2 text-4xl font-bold'}>
            {isVersePage ? (
              `${surahName.english} ${surahNumber}:${verseNumber}`
            ) : (
              <span className="font-arabic text-5xl">{surahName.arabic}</span>
            )}
          </h1>
          <h2 className={isVersePage ? 'text-muted-foreground' : 'mb-4 text-2xl text-muted-foreground'}>
            {isVersePage ? (
              `${surahName.transliteration} - ${surahName.translation}`
            ) : (
              `Surah ${surahName.transliteration} - ${surahName.translation}`
            )}
          </h2>
          
          {!isVersePage && metadata && (
            <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
              <span>Chapter {metadata.number}</span>
              <span>•</span>
              <span>{metadata.type}</span>
              <span>•</span>
              <span>{metadata.verses} verses</span>
            </div>
          )}
        </div>
        
        {!isVersePage && (
          <div className="font-arabic text-3xl text-muted-foreground">
            {surahName.arabic}
          </div>
        )}
        
        {isVersePage && (
          <div className="font-arabic text-3xl text-muted-foreground">
            {surahName.arabic}
          </div>
        )}
      </div>

      {/* Links */}
      {links && links.length > 0 && (
        <div className="flex gap-4">
          {links.map((link, index) => (
            <Link
              key={index}
              href={link.href}
              className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              {link.icon}
              {link.label}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
