export function ChatFooter() {
  return (
    <div className="border-t bg-background py-2">
      <div className="mx-auto flex max-w-4xl items-center justify-center gap-1 px-4 text-xs text-muted-foreground">
        <a href="/about" className="hover:text-foreground transition-colors">
          About
        </a>
        <span>·</span>
        <a href="/quran/search" className="hover:text-foreground transition-colors">
          Quran
        </a>
        <span>·</span>
        <a
          href="/hadith/search"
          className="hover:text-foreground transition-colors"
        >
          Hadith
        </a>
        <span>·</span>
        <a href="/faq" className="hover:text-foreground transition-colors">
          FAQ
        </a>
        <span>·</span>
        <a
          href="https://github.com/BalajSaleem/criterion"
          target="_blank"
          rel="noopener noreferrer"
          className="hover:text-foreground transition-colors"
        >
          GitHub
        </a>
      </div>
    </div>
  );
}
