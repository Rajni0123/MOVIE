import { NextRequest, NextResponse } from "next/server";

const TMDB_API_KEY = process.env.TMDB_API_KEY;
const TMDB_BASE_URL = "https://api.themoviedb.org/3";

// GET /api/scraping/tmdb/search?query=matrix - Search movies on TMDB
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get("query");

    if (!query) {
      return NextResponse.json(
        { success: false, error: "Search query is required" },
        { status: 400 }
      );
    }

    if (!TMDB_API_KEY) {
      return NextResponse.json(
        { success: false, error: "TMDB API key not configured. Add TMDB_API_KEY to .env" },
        { status: 500 }
      );
    }

    const res = await fetch(
      `${TMDB_BASE_URL}/search/movie?api_key=${TMDB_API_KEY}&query=${encodeURIComponent(query)}&language=en-US&page=1&include_adult=false`
    );

    if (!res.ok) {
      return NextResponse.json(
        { success: false, error: "TMDB search failed" },
        { status: 500 }
      );
    }

    const data = await res.json();

    return NextResponse.json({
      success: true,
      data: data.results || [],
      totalResults: data.total_results || 0,
      totalPages: data.total_pages || 0,
    });
  } catch (error) {
    console.error("TMDB search error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to search TMDB" },
      { status: 500 }
    );
  }
}
