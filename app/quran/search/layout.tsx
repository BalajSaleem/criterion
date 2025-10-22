import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Search the Quran",
  description:
    "Search 6,236 Quran verses using semantic search. Find verses about any topic - patience, prayer, forgiveness, and more.",
  keywords: [
    "Quran search",
    "search Quran verses",
    "Quran by topic",
    "Islamic search",
    "find Quran verses",
    "semantic Quran search",
  ],
  openGraph: {
    title: "Search the Quran - Criterion",
    description:
      "Search 6,236 Quran verses using semantic search. Find verses about any topic.",
    type: "website",
  },
};

export default function SearchLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
