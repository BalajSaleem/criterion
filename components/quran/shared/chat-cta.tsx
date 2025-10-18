import Link from 'next/link';

interface ChatCTAProps {
  title?: string;
  description?: string;
  href?: string;
  buttonText?: string;
}

export function ChatCTA({
  title = "Have questions?",
  description = "Ask our AI assistant powered by Quran and Hadith",
  href = "/",
  buttonText = "Start Chat",
}: ChatCTAProps) {
  return (
    <div className="rounded-lg border bg-muted/50 p-6 text-center">
      <h3 className="mb-2 text-lg font-semibold">{title}</h3>
      <p className="mb-4 text-sm text-muted-foreground">{description}</p>
      <Link
        href={href}
        className="inline-flex items-center justify-center rounded-lg bg-primary px-6 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
      >
        {buttonText}
      </Link>
    </div>
  );
}
