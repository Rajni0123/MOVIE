import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db/prisma";
import { requireAuth } from "@/lib/auth";

// PUT /api/movies/[id]/links/[linkId] - Update a download link
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; linkId: string }> }
) {
  try {
    const auth = await requireAuth(request);
    if (!auth.authenticated) {
      return NextResponse.json(
        { success: false, error: auth.error },
        { status: 401 }
      );
    }

    const { linkId } = await params;
    const linkIdNum = parseInt(linkId);

    if (isNaN(linkIdNum)) {
      return NextResponse.json(
        { success: false, error: "Invalid link ID" },
        { status: 400 }
      );
    }

    const body = await request.json();
    const { sourceName, quality, language, linkUrl, isActive, priority } = body;

    const link = await prisma.streamingLink.update({
      where: { id: linkIdNum },
      data: {
        ...(sourceName && { sourceName }),
        ...(quality && { quality }),
        ...(language && { language }),
        ...(linkUrl && { linkUrl }),
        ...(typeof isActive === "boolean" && { isActive }),
        ...(typeof priority === "number" && { priority }),
      },
    });

    return NextResponse.json({ success: true, data: link });
  } catch (error) {
    console.error("Update link error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to update link" },
      { status: 500 }
    );
  }
}

// DELETE /api/movies/[id]/links/[linkId] - Delete a download link
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; linkId: string }> }
) {
  try {
    const auth = await requireAuth(request);
    if (!auth.authenticated) {
      return NextResponse.json(
        { success: false, error: auth.error },
        { status: 401 }
      );
    }

    const { linkId } = await params;
    const linkIdNum = parseInt(linkId);

    if (isNaN(linkIdNum)) {
      return NextResponse.json(
        { success: false, error: "Invalid link ID" },
        { status: 400 }
      );
    }

    await prisma.streamingLink.delete({
      where: { id: linkIdNum },
    });

    return NextResponse.json({ success: true, message: "Link deleted" });
  } catch (error) {
    console.error("Delete link error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to delete link" },
      { status: 500 }
    );
  }
}
