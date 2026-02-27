import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db/prisma";
import { requireAuth } from "@/lib/auth";

export const dynamic = "force-dynamic";

interface FooterLink {
  id: number;
  section: string;
  label: string;
  url: string;
  sort_order: number;
  is_active: number;
}

// GET /api/footer-links - Get all footer links (public)
export async function GET() {
  try {
    const links = await prisma.$queryRaw<FooterLink[]>`
      SELECT id, section, label, url, sort_order, is_active 
      FROM footer_links 
      WHERE is_active = 1 
      ORDER BY section, sort_order ASC
    `;

    // Group by section
    const grouped = {
      quick_links: links.filter(l => l.section === "quick_links").map(l => ({
        id: l.id,
        label: l.label,
        url: l.url,
        sortOrder: l.sort_order,
      })),
      legal: links.filter(l => l.section === "legal").map(l => ({
        id: l.id,
        label: l.label,
        url: l.url,
        sortOrder: l.sort_order,
      })),
      genres: links.filter(l => l.section === "genres").map(l => ({
        id: l.id,
        label: l.label,
        url: l.url,
        sortOrder: l.sort_order,
      })),
    };

    return NextResponse.json({ success: true, data: grouped });
  } catch (error) {
    console.error("Error fetching footer links:", error);
    return NextResponse.json({ 
      success: true, 
      data: { quick_links: [], legal: [], genres: [] } 
    });
  }
}

// POST /api/footer-links - Create new footer link (admin only)
export async function POST(request: NextRequest) {
  const auth = await requireAuth(request);
  if (!auth.authenticated) {
    return NextResponse.json({ error: auth.error }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { section, label, url, sortOrder = 0 } = body;

    if (!section || !label || !url) {
      return NextResponse.json(
        { error: "Section, label, and URL are required" },
        { status: 400 }
      );
    }

    await prisma.$executeRawUnsafe(
      `INSERT INTO footer_links (section, label, url, sort_order, is_active, created_at, updated_at) 
       VALUES (?, ?, ?, ?, 1, datetime('now'), datetime('now'))`,
      section,
      label,
      url,
      sortOrder
    );

    // Get the inserted link
    const [newLink] = await prisma.$queryRaw<FooterLink[]>`
      SELECT id, section, label, url, sort_order, is_active 
      FROM footer_links 
      ORDER BY id DESC 
      LIMIT 1
    `;

    return NextResponse.json({
      success: true,
      data: {
        id: newLink.id,
        section: newLink.section,
        label: newLink.label,
        url: newLink.url,
        sortOrder: newLink.sort_order,
        isActive: newLink.is_active === 1,
      },
    });
  } catch (error) {
    console.error("Error creating footer link:", error);
    return NextResponse.json(
      { error: "Failed to create footer link" },
      { status: 500 }
    );
  }
}
