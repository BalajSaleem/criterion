import Link from "next/link";

export function CriterionBranding() {
  return (
    <div className="flex items-center justify-center">
      <Link href="/" className="text-center">
        <h1 className="text-lg md:text-xl font-semibold tracking-tight bg-gradient-to-r from-foreground to-muted-foreground bg-clip-text text-transparent hover:from-foreground hover:to-foreground transition-all">
          criterion.life
        </h1>
      </Link>
    </div>
  );
}
