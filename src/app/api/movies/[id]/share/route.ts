import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db/prisma";

// POST /api/movies/[id]/share - Track a share
export async function POST(
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

    // Get request body for platform info
    let platform = "native";
    try {
      const body = await request.json();
      platform = body.platform || "native";
    } catch {
      // No body provided, use default
    }

    // Get user agent and IP
    const userAgent = request.headers.get("user-agent") || null;
    const ipAddress = request.headers.get("x-forwarded-for") || 
                      request.headers.get("x-real-ip") || 
                      null;

    // Create share log and increment counter in transaction
    const [shareLog, movie] = await prisma.$transaction([
      prisma.shareLog.create({
        data: {
          movieId,
          platform,
          userAgent,
          ipAddress,
        },
      }),
      prisma.movie.update({
        where: { id: movieId },
        data: {
          shareCount: { increment: 1 },
        },
        select: {
          id: true,
          title: true,
          shareCount: true,
        },
      }),
    ]);

    return NextResponse.json({
      success: true,
      data: {
        shareId: shareLog.id,
        totalShares: movie.shareCount,
      },
    });
  } catch (error) {
    console.error("Track share error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to track share" },
      { status: 500 }
    );
  }
}

// GET /api/movies/[id]/share - Get share count
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

    const movie = await prisma.movie.findUnique({
      where: { id: movieId },
      select: {
        id: true,
        title: true,
        shareCount: true,
      },
    });

    if (!movie) {
      return NextResponse.json(
        { success: false, error: "Movie not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: {
        movieId: movie.id,
        title: movie.title,
        totalShares: movie.shareCount,
      },
    });
  } catch (error) {
    console.error("Get share count error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to get share count" },
      { status: 500 }
    );
  }
}
