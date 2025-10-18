import Link from 'next/link';

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
  return (
    <div className="text-center">
      {showContext ? (
        <Link
          href={`/quran/${surahNumber}/${ayahNumber}`}
          className="text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          Hide context
        </Link>
      ) : (
        <Link
          href={`/quran/${surahNumber}/${ayahNumber}?context=true`}
          className="text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          Show context (±{contextWindow} verses)
        </Link>
      )}
    </div>
  );
}
