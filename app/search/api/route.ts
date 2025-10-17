import { NextRequest, NextResponse } from "next/server";
import { findRelevantVerses } from "@/lib/ai/embeddings";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

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

    // Use existing RAG function
    const verses = await findRelevantVerses(query);

    return NextResponse.json({
      results: verses,
      query: query.trim(),
      count: verses.length,
    });
  } catch (error) {
    console.error("[Search API] Error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
