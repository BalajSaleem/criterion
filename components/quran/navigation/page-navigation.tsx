import Link from 'next/link';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface NavigationItem {
  href: string;
  label: string;
  sublabel?: string;
}

interface PageNavigationProps {
  previous?: NavigationItem;
  next?: NavigationItem;
  center?: NavigationItem;
}

export function PageNavigation({ previous, next, center }: PageNavigationProps) {
  return (
    <div className="flex items-center justify-between border-t pt-6">
      {previous ? (
        <Link
          href={previous.href}
          className="flex items-center gap-2 rounded-lg border px-4 py-3 text-sm transition-colors hover:bg-muted"
        >
          <ChevronLeft className="size-4" />
          <div>
            {previous.sublabel && (
              <div className="text-xs text-muted-foreground">{previous.sublabel}</div>
            )}
            <div className="font-medium">{previous.label}</div>
          </div>
        </Link>
      ) : (
        <div />
      )}

      {center && (
        <Link
          href={center.href}
          className="rounded-lg border px-4 py-2 text-sm transition-colors hover:bg-muted"
        >
          {center.label}
        </Link>
      )}

      {next ? (
        <Link
          href={next.href}
          className="flex items-center gap-2 rounded-lg border px-4 py-3 text-sm transition-colors hover:bg-muted"
        >
          <div className="text-right">
            {next.sublabel && (
              <div className="text-xs text-muted-foreground">{next.sublabel}</div>
            )}
            <div className="font-medium">{next.label}</div>
          </div>
          <ChevronRight className="size-4" />
        </Link>
      ) : (
        <div />
      )}
    </div>
  );
}
