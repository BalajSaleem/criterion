import Link from "next/link";
import { CriterionBranding } from "@/components/criterion-branding";

export function SearchPageHeader() {
  return (
    <header className="border-b">
      <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
        <CriterionBranding />
        <nav className="flex gap-4 md:gap-6 text-sm">
          <Link href="/" className="hover:underline">
            Chat
          </Link>
          <Link href="/about" className="hover:underline">
            About
          </Link>
          <Link href="/quran" className="hover:underline">
            Quran
          </Link>
          <Link href="/faq" className="hover:underline">
            FAQ
          </Link>
        </nav>
      </div>
    </header>
  );
}
