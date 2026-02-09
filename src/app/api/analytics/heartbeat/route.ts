import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db/prisma";
import { randomUUID } from "crypto";

export const dynamic = "force-dynamic";

// Helper to detect device type from user agent
function getDeviceType(userAgent: string): string {
  if (/mobile/i.test(userAgent)) return "mobile";
  if (/tablet|ipad/i.test(userAgent)) return "tablet";
  return "desktop";
}

// POST /api/analytics/heartbeat - Track visitor activity
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { sessionId, page } = body;

    // Get visitor info from request
    const userAgent = request.headers.get("user-agent") || "";
    const ip = request.headers.get("x-forwarded-for")?.split(",")[0] || 
               request.headers.get("x-real-ip") || 
               "unknown";
    const device = getDeviceType(userAgent);

    // Generate session ID if not provided
    const visitorId = sessionId || randomUUID();

    // Upsert visitor record using raw SQL
    await prisma.$executeRawUnsafe(`
      INSERT INTO active_visitors (id, page, user_agent, ip_address, device, last_seen, created_at)
      VALUES (?, ?, ?, ?, ?, datetime('now'), datetime('now'))
      ON CONFLICT(id) DO UPDATE SET
        page = excluded.page,
        last_seen = datetime('now')
    `, visitorId, page || "/", userAgent.substring(0, 500), ip, device);

    // Clean up old sessions (older than 5 minutes)
    await prisma.$executeRawUnsafe(`
      DELETE FROM active_visitors 
      WHERE last_seen < datetime('now', '-5 minutes')
    `);

    return NextResponse.json({
      success: true,
      sessionId: visitorId,
    });
  } catch (error) {
    console.error("Error tracking visitor:", error);
    // Return success even on error to not break the page
    return NextResponse.json({ success: true });
  }
}
