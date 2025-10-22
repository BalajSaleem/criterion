import { NextRequest, NextResponse } from "next/server";
import { findRelevantHadiths } from "@/lib/ai/embeddings";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Collection = "bukhari" | "muslim" | "nawawi40" | "riyadussalihin";
type GradePreference = "sahih-only" | "sahih-and-hasan" | "all";

const VALID_COLLECTIONS: Collection[] = [
  "bukhari",
  "muslim",
  "nawawi40",
  "riyadussalihin",
];
const VALID_GRADES: GradePreference[] = [
  "sahih-only",
  "sahih-and-hasan",
  "all",
];

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const query = searchParams.get("q");

    if (!query || query.trim().length === 0) {
      return NextResponse.json(
        { error: "Query parameter 'q' is required" },
        { status: 400 }
      );
    }

    // Parse collections filter
    const collectionsParam = searchParams.get("collections");
    let collections: Collection[] | undefined;
    if (collectionsParam) {
      const parsed = collectionsParam
        .split(",")
        .map((c) => c.trim() as Collection)
        .filter((c) => VALID_COLLECTIONS.includes(c));
      collections = parsed.length > 0 ? parsed : undefined;
    }

    // Parse grade preference
    const gradeParam = searchParams.get("grade");
    let gradePreference: GradePreference = "sahih-only"; // default
    if (gradeParam && VALID_GRADES.includes(gradeParam as GradePreference)) {
      gradePreference = gradeParam as GradePreference;
    }

    // Use existing RAG function with filters (limit to 15 for search UI)
    const hadiths = await findRelevantHadiths(query, {
      collections,
      gradePreference,
      limit: 15, // Increased from default 5 for search UI
    });

    // Map collection codes to display names
    const collectionNames: Record<Collection, string> = {
      bukhari: "Sahih Bukhari",
      muslim: "Sahih Muslim",
      nawawi40: "40 Hadith Nawawi",
      riyadussalihin: "Riyad as-Salihin",
    };

    const collectionsSearched = collections
      ? collections.map((c) => collectionNames[c])
      : ["All collections"];

    // Map database fields to component's expected format
    const formattedHadiths = hadiths.map((h) => ({
      reference: h.reference,
      collection: h.collectionName,
      english: h.englishText,
      arabic: h.arabicText,
      grade: h.grade || "Unknown",
      narrator: h.narratorChain || "Not specified",
      book: h.bookName || "Not specified",
      chapter: h.chapterName || "Not specified",
      sourceUrl: h.sourceUrl || "",
      similarity: h.similarity,
    }));

    return NextResponse.json({
      results: formattedHadiths,
      query: query.trim(),
      count: formattedHadiths.length,
      filters: {
        collections: collectionsSearched,
        gradeFilter: gradePreference,
      },
    });
  } catch (error) {
    console.error("[Hadith Search API] Error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
