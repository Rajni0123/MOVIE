import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db/prisma";
import { requireAuth } from "@/lib/auth";

export const dynamic = "force-dynamic";

// PUT /api/movies/[id]/featured - Toggle featured status
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Check auth
    const auth = await requireAuth(request);
    if (!auth.authenticated) {
      return NextResponse.json(
        { error: auth.error },
        { status: 401 }
      );
    }

    const { id } = await params;
    const movieId = parseInt(id);
    const body = await request.json();
    const { isFeatured, featuredOrder } = body;

    if (isNaN(movieId)) {
      return NextResponse.json(
        { error: "Invalid movie ID" },
        { status: 400 }
      );
    }

    // Use raw SQL to bypass Prisma type checking until client is regenerated
    const featuredValue = isFeatured ? 1 : 0;
    const orderValue = featuredOrder ?? 0;

    await prisma.$executeRawUnsafe(
      `UPDATE movies SET is_featured = ?, featured_order = ? WHERE id = ?`,
      featuredValue,
      orderValue,
      movieId
    );

    // Fetch updated movie
    const movie = await prisma.movie.findUnique({
      where: { id: movieId },
    });

    return NextResponse.json({
      success: true,
      movie: {
        id: movie?.id,
        title: movie?.title,
        isFeatured: isFeatured,
        featuredOrder: orderValue,
      },
    });
  } catch (error) {
    console.error("Error updating featured status:", error);
    return NextResponse.json(
      { error: "Failed to update featured status" },
      { status: 500 }
    );
  }
}
