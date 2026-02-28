import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import prisma from "@/lib/db/prisma";
import { indexMovies } from "@/lib/seo/indexnow";

// GET /api/movies/bulk - Get all movie IDs by status
export async function GET(request: NextRequest) {
  try {
    const auth = await requireAuth(request);
    if (!auth.authenticated) {
      return NextResponse.json(
        { success: false, error: auth.error },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status") || "DRAFT";

    // Get all movie IDs with the specified status
    const movies = await prisma.movie.findMany({
      where: { status },
      select: { id: true, title: true },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({
      success: true,
      data: {
        ids: movies.map(m => m.id),
        count: movies.length,
        movies: movies,
      },
    });
  } catch (error) {
    console.error("Get bulk IDs error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to get movie IDs" },
      { status: 500 }
    );
  }
}

// POST /api/movies/bulk - Bulk operations on movies
export async function POST(request: NextRequest) {
  try {
    const auth = await requireAuth(request);
    if (!auth.authenticated) {
      return NextResponse.json(
        { success: false, error: auth.error },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { action, ids } = body;

    // Special actions that don't require IDs
    if (action === "publish-all-drafts") {
      // Get slugs before updating for auto-indexing
      const drafts = await prisma.movie.findMany({
        where: { status: "DRAFT" },
        select: { slug: true },
      });

      const result = await prisma.movie.updateMany({
        where: { status: "DRAFT" },
        data: {
          status: "PUBLISHED",
          isActive: true,
        },
      });

      // Auto-index published movies to search engines
      if (drafts.length > 0) {
        const slugs = drafts.map(m => m.slug);
        indexMovies(slugs).then(indexResult => {
          console.log(`🔍 IndexNow: Bulk indexed ${indexResult.urlCount} movies`);
        }).catch(err => {
          console.error("❌ IndexNow bulk indexing failed:", err);
        });
      }

      return NextResponse.json({
        success: true,
        message: `${result.count} draft movies published successfully`,
        count: result.count,
      });
    }

    if (action === "get-draft-count") {
      const count = await prisma.movie.count({
        where: { status: "DRAFT" },
      });
      return NextResponse.json({
        success: true,
        count,
      });
    }

    if (!action || !ids || !Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json(
        { success: false, error: "Action and ids array are required" },
        { status: 400 }
      );
    }

    // Validate ids are numbers
    const validIds = ids.filter(id => typeof id === "number" && id > 0);
    if (validIds.length === 0) {
      return NextResponse.json(
        { success: false, error: "No valid movie IDs provided" },
        { status: 400 }
      );
    }

    let result;

    switch (action) {
      case "publish":
        // Get slugs before updating for auto-indexing
        const moviesToPublish = await prisma.movie.findMany({
          where: { id: { in: validIds }, status: { not: "PUBLISHED" } },
          select: { slug: true },
        });

        // Bulk publish movies - set both status and isActive
        result = await prisma.movie.updateMany({
          where: {
            id: { in: validIds },
          },
          data: {
            status: "PUBLISHED",
            isActive: true,
          },
        });

        // Auto-index published movies to search engines
        if (moviesToPublish.length > 0) {
          const slugs = moviesToPublish.map(m => m.slug);
          indexMovies(slugs).then(indexResult => {
            console.log(`🔍 IndexNow: Indexed ${indexResult.urlCount} movies`);
          }).catch(err => {
            console.error("❌ IndexNow indexing failed:", err);
          });
        }

        return NextResponse.json({
          success: true,
          message: `${result.count} movies published successfully`,
          count: result.count,
        });

      case "unpublish":
        // Bulk unpublish (set to draft)
        result = await prisma.movie.updateMany({
          where: {
            id: { in: validIds },
          },
          data: {
            status: "DRAFT",
          },
        });
        return NextResponse.json({
          success: true,
          message: `${result.count} movies unpublished successfully`,
          count: result.count,
        });

      case "delete":
        // First delete related records
        await prisma.streamingLink.deleteMany({
          where: {
            movieId: { in: validIds },
          },
        });

        await prisma.shareLog.deleteMany({
          where: {
            movieId: { in: validIds },
          },
        });

        await prisma.seoIndexStatus.deleteMany({
          where: {
            movieId: { in: validIds },
          },
        });

        // Then delete movies
        result = await prisma.movie.deleteMany({
          where: {
            id: { in: validIds },
          },
        });
        return NextResponse.json({
          success: true,
          message: `${result.count} movies deleted successfully`,
          count: result.count,
        });

      case "activate":
        // Bulk activate
        result = await prisma.movie.updateMany({
          where: {
            id: { in: validIds },
          },
          data: {
            isActive: true,
          },
        });
        return NextResponse.json({
          success: true,
          message: `${result.count} movies activated successfully`,
          count: result.count,
        });

      case "deactivate":
        // Bulk deactivate
        result = await prisma.movie.updateMany({
          where: {
            id: { in: validIds },
          },
          data: {
            isActive: false,
          },
        });
        return NextResponse.json({
          success: true,
          message: `${result.count} movies deactivated successfully`,
          count: result.count,
        });

      case "featured":
        // Bulk set as featured/popular using raw SQL
        // Use raw SQL to bypass Prisma type checking until client is regenerated
        const idsPlaceholders = validIds.map(() => '?').join(',');
        await prisma.$executeRawUnsafe(
          `UPDATE movies SET is_featured = 1, featured_order = 1 WHERE id IN (${idsPlaceholders})`,
          ...validIds
        );
        return NextResponse.json({
          success: true,
          message: `${validIds.length} movies set as Popular`,
          count: validIds.length,
        });

      case "unfeatured":
        // Bulk remove from featured/popular using raw SQL
        const unfeaturedPlaceholders = validIds.map(() => '?').join(',');
        await prisma.$executeRawUnsafe(
          `UPDATE movies SET is_featured = 0, featured_order = 0 WHERE id IN (${unfeaturedPlaceholders})`,
          ...validIds
        );
        return NextResponse.json({
          success: true,
          message: `${validIds.length} movies removed from Popular`,
          count: validIds.length,
        });

      default:
        return NextResponse.json(
          { success: false, error: `Unknown action: ${action}` },
          { status: 400 }
        );
    }
  } catch (error) {
    console.error("Bulk operation error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to perform bulk operation" },
      { status: 500 }
    );
  }
}
