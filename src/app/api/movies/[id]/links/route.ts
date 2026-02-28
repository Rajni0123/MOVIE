import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db/prisma";
import { requireAuth } from "@/lib/auth";

// GET /api/movies/[id]/links - Get all download links for a movie
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const movieId = parseInt(id);

    if (isNaN(movieId)) {
      return NextResponse.json(
        { success: false, error: "Invalid movie ID" },
        { status: 400 }
      );
    }

    const links = await prisma.streamingLink.findMany({
      where: { movieId },
      orderBy: { priority: "desc" },
    });

    return NextResponse.json({ success: true, data: links });
  } catch (error) {
    console.error("Get links error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch links" },
      { status: 500 }
    );
  }
}

// POST /api/movies/[id]/links - Create a new download link
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireAuth(request);
    if (!auth.authenticated) {
      return NextResponse.json(
        { success: false, error: auth.error },
        { status: 401 }
      );
    }

    const { id } = await params;
    const movieId = parseInt(id);

    if (isNaN(movieId)) {
      return NextResponse.json(
        { success: false, error: "Invalid movie ID" },
        { status: 400 }
      );
    }

    const body = await request.json();
    const { sourceName, quality, language, linkUrl, isActive, priority } = body;

    if (!linkUrl) {
      return NextResponse.json(
        { success: false, error: "Link URL is required" },
        { status: 400 }
      );
    }

    // Reject image URLs - these should never be saved as download links
    const lowerUrl = linkUrl.toLowerCase();
    const invalidPatterns = [
      "image.tmdb.org", "tmdb.org/t/p",
      ".jpg", ".jpeg", ".png", ".webp", ".gif", ".svg", ".ico",
      "poster", "backdrop", "thumbnail"
    ];
    if (invalidPatterns.some(p => lowerUrl.includes(p))) {
      return NextResponse.json(
        { success: false, error: "Invalid URL: Image URLs cannot be saved as download links" },
        { status: 400 }
      );
    }

    const link = await prisma.streamingLink.create({
      data: {
        movieId,
        sourceName: sourceName || "Direct",
        quality: quality || "720p",
        language: language || "Hindi",
        linkUrl,
        isActive: isActive ?? true,
        priority: priority || 0,
      },
    });

    return NextResponse.json({ success: true, data: link }, { status: 201 });
  } catch (error) {
    console.error("Create link error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to create link" },
      { status: 500 }
    );
  }
}
