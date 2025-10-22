import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Search Authentic Hadith",
  description:
    "Search 12,416 authentic hadiths from Bukhari, Muslim, Nawawi40, and Riyadussalihin. Find hadiths about any topic using semantic search.",
  keywords: [
    "hadith search",
    "search hadith",
    "authentic hadith",
    "Bukhari hadith",
    "Muslim hadith",
    "Islamic hadith",
    "Prophet Muhammad sayings",
    "Sunnah search",
  ],
  openGraph: {
    title: "Search Authentic Hadith - Criterion",
    description:
      "Search 12,416 authentic hadiths from major collections. Find hadiths about any topic.",
    type: "website",
  },
};

export default function HadithSearchLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
