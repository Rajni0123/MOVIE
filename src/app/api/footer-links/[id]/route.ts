import { NextResponse } from "next/server";
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

// GET /api/footer-links/[id] - Get single footer link
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const linkId = parseInt(id);

    const [link] = await prisma.$queryRaw<FooterLink[]>`
      SELECT id, section, label, url, sort_order, is_active 
      FROM footer_links 
      WHERE id = ${linkId}
    `;

    if (!link) {
      return NextResponse.json({ error: "Link not found" }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      data: {
        id: link.id,
        section: link.section,
        label: link.label,
        url: link.url,
        sortOrder: link.sort_order,
        isActive: link.is_active === 1,
      },
    });
  } catch (error) {
    console.error("Error fetching footer link:", error);
    return NextResponse.json(
      { error: "Failed to fetch footer link" },
      { status: 500 }
    );
  }
}

// PUT /api/footer-links/[id] - Update footer link
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAuth(request);
  if (!auth.authenticated) {
    return NextResponse.json({ error: auth.error }, { status: 401 });
  }

  try {
    const { id } = await params;
    const linkId = parseInt(id);
    const body = await request.json();
    const { section, label, url, sortOrder, isActive } = body;

    await prisma.$executeRawUnsafe(
      `UPDATE footer_links 
       SET section = ?, label = ?, url = ?, sort_order = ?, is_active = ?, updated_at = datetime('now')
       WHERE id = ?`,
      section,
      label,
      url,
      sortOrder ?? 0,
      isActive === false ? 0 : 1,
      linkId
    );

    return NextResponse.json({
      success: true,
      data: {
        id: linkId,
        section,
        label,
        url,
        sortOrder: sortOrder ?? 0,
        isActive: isActive !== false,
      },
    });
  } catch (error) {
    console.error("Error updating footer link:", error);
    return NextResponse.json(
      { error: "Failed to update footer link" },
      { status: 500 }
    );
  }
}

// DELETE /api/footer-links/[id] - Delete footer link
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAuth(request);
  if (!auth.authenticated) {
    return NextResponse.json({ error: auth.error }, { status: 401 });
  }

  try {
    const { id } = await params;
    const linkId = parseInt(id);

    await prisma.$executeRawUnsafe(
      `DELETE FROM footer_links WHERE id = ?`,
      linkId
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting footer link:", error);
    return NextResponse.json(
      { error: "Failed to delete footer link" },
      { status: 500 }
    );
  }
}
