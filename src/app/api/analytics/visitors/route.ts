import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db/prisma";
import { requireAuth } from "@/lib/auth";

export const dynamic = "force-dynamic";

interface VisitorRow {
  id: string;
  page: string;
  device: string | null;
  ip_address: string | null;
  last_seen: string;
  created_at: string;
}

interface CountRow {
  count: number;
}

// GET /api/analytics/visitors - Get active visitors (admin only)
export async function GET(request: NextRequest) {
  const auth = await requireAuth(request);
  if (!auth.authenticated) {
    return NextResponse.json({ error: auth.error }, { status: 401 });
  }

  try {
    // Clean up old sessions first
    await prisma.$executeRawUnsafe(`
      DELETE FROM active_visitors 
      WHERE last_seen < datetime('now', '-5 minutes')
    `);

    // Get total active count
    const countResult = await prisma.$queryRaw<CountRow[]>`
      SELECT COUNT(*) as count FROM active_visitors
      WHERE last_seen >= datetime('now', '-5 minutes')
    `;
    const totalActive = countResult[0]?.count || 0;

    // Get device breakdown
    const deviceStats = await prisma.$queryRaw<{ device: string; count: number }[]>`
      SELECT device, COUNT(*) as count FROM active_visitors
      WHERE last_seen >= datetime('now', '-5 minutes')
      GROUP BY device
    `;

    // Get page breakdown (top 10)
    const pageStats = await prisma.$queryRaw<{ page: string; count: number }[]>`
      SELECT page, COUNT(*) as count FROM active_visitors
      WHERE last_seen >= datetime('now', '-5 minutes')
      GROUP BY page
      ORDER BY count DESC
      LIMIT 10
    `;

    // Get recent visitors list
    const visitors = await prisma.$queryRaw<VisitorRow[]>`
      SELECT id, page, device, ip_address, last_seen, created_at
      FROM active_visitors
      WHERE last_seen >= datetime('now', '-5 minutes')
      ORDER BY last_seen DESC
      LIMIT 50
    `;

    return NextResponse.json({
      success: true,
      data: {
        totalActive,
        deviceStats: deviceStats.reduce((acc, d) => {
          acc[d.device || "unknown"] = d.count;
          return acc;
        }, {} as Record<string, number>),
        pageStats: pageStats.map(p => ({
          page: p.page,
          count: p.count,
        })),
        visitors: visitors.map(v => ({
          id: v.id.substring(0, 8) + "...",
          page: v.page,
          device: v.device || "unknown",
          lastSeen: v.last_seen,
        })),
      },
    });
  } catch (error) {
    console.error("Error fetching visitors:", error);
    return NextResponse.json(
      { error: "Failed to fetch visitors" },
      { status: 500 }
    );
  }
}
