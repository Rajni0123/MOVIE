import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db/prisma";
import { requireAuth } from "@/lib/auth";

// GET /api/admin/stats - Get admin statistics
export async function GET(request: NextRequest) {
  try {
    const auth = await requireAuth(request);
    if (!auth.authenticated) {
      return NextResponse.json(
        { success: false, error: auth.error },
        { status: 401 }
      );
    }

    // Get overall stats
    const [
      totalMovies,
      totalShares,
      totalViews,
      recentShares,
      topSharedMovies,
      sharesByPlatform,
      sharesToday,
      sharesThisWeek,
    ] = await Promise.all([
      // Total movies
      prisma.movie.count(),
      
      // Total shares
      prisma.movie.aggregate({
        _sum: { shareCount: true },
      }),
      
      // Total views
      prisma.movie.aggregate({
        _sum: { viewCount: true },
      }),
      
      // Recent shares (last 50)
      prisma.shareLog.findMany({
        take: 50,
        orderBy: { createdAt: "desc" },
        include: {
          movie: {
            select: {
              id: true,
              title: true,
              slug: true,
              posterUrl: true,
            },
          },
        },
      }),
      
      // Top 10 most shared movies
      prisma.movie.findMany({
        take: 10,
        orderBy: { shareCount: "desc" },
        where: { shareCount: { gt: 0 } },
        select: {
          id: true,
          title: true,
          slug: true,
          posterUrl: true,
          shareCount: true,
          viewCount: true,
        },
      }),
      
      // Shares by platform
      prisma.shareLog.groupBy({
        by: ["platform"],
        _count: { id: true },
        orderBy: { _count: { id: "desc" } },
      }),
      
      // Shares today
      prisma.shareLog.count({
        where: {
          createdAt: {
            gte: new Date(new Date().setHours(0, 0, 0, 0)),
          },
        },
      }),
      
      // Shares this week
      prisma.shareLog.count({
        where: {
          createdAt: {
            gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
          },
        },
      }),
    ]);

    return NextResponse.json({
      success: true,
      data: {
        overview: {
          totalMovies,
          totalShares: totalShares._sum.shareCount || 0,
          totalViews: totalViews._sum.viewCount || 0,
          sharesToday,
          sharesThisWeek,
        },
        topSharedMovies,
        recentShares: recentShares.map((share) => ({
          id: share.id,
          platform: share.platform,
          createdAt: share.createdAt,
          movie: share.movie,
        })),
        sharesByPlatform: sharesByPlatform.map((item) => ({
          platform: item.platform || "unknown",
          count: item._count.id,
        })),
      },
    });
  } catch (error) {
    console.error("Get admin stats error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to get statistics" },
      { status: 500 }
    );
  }
}
