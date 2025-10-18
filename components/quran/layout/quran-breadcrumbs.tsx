import Link from 'next/link';

interface BreadcrumbItem {
  label: string;
  href?: string;
}

interface QuranBreadcrumbsProps {
  items: BreadcrumbItem[];
}

export function QuranBreadcrumbs({ items }: QuranBreadcrumbsProps) {
  return (
    <nav className="mb-6 text-sm text-muted-foreground">
      {items.map((item, index) => {
        const isLast = index === items.length - 1;
        
        return (
          <span key={index}>
            {item.href ? (
              <Link href={item.href} className="hover:text-foreground">
                {item.label}
              </Link>
            ) : (
              <span className="text-foreground">{item.label}</span>
            )}
            {!isLast && <span className="mx-2">/</span>}
          </span>
        );
      })}
    </nav>
  );
}
