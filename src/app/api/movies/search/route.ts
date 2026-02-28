import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db/prisma";

// GET /api/movies/search - Lightweight search for autocomplete
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get("q")?.toLowerCase().trim();
    const limit = Math.min(parseInt(searchParams.get("limit") || "8"), 20);

    if (!query || query.length < 2) {
      return NextResponse.json({ success: true, data: [] });
    }

    // Get all published movies and filter case-insensitively
    const allMovies = await prisma.movie.findMany({
      where: {
        status: "PUBLISHED",
        isActive: true,
      },
      select: {
        id: true,
        title: true,
        slug: true,
        posterUrl: true,
        releaseDate: true,
        rating: true,
      },
      orderBy: { viewCount: "desc" },
    });

    // Case-insensitive filtering
    const filtered = allMovies
      .filter((movie) => movie.title?.toLowerCase().includes(query))
      .slice(0, limit)
      .map((movie) => ({
        id: movie.id,
        title: movie.title,
        slug: movie.slug,
        posterUrl: movie.posterUrl,
        year: movie.releaseDate ? new Date(movie.releaseDate).getFullYear() : null,
        rating: movie.rating,
      }));

    return NextResponse.json({ success: true, data: filtered });
  } catch (error) {
    console.error("Search error:", error);
    return NextResponse.json(
      { success: false, error: "Search failed" },
      { status: 500 }
    );
  }
}
