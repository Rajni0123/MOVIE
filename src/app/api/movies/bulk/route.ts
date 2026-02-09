import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import prisma from "@/lib/db/prisma";

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
