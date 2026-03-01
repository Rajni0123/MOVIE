import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { writeFile, readdir, unlink, stat } from "fs/promises";
import path from "path";

export const dynamic = "force-dynamic";

// Allowed verification file patterns
const ALLOWED_PATTERNS = [
  /^sw\.js$/i, // Service worker
  /^[a-zA-Z0-9_-]+\.txt$/i, // Text verification files
  /^[a-zA-Z0-9_-]+\.html$/i, // HTML verification files
];

const isAllowedFile = (filename: string): boolean => {
  return ALLOWED_PATTERNS.some((pattern) => pattern.test(filename));
};

// GET /api/admin/ads/verification-files - List all verification files
export async function GET(request: NextRequest) {
  const auth = await requireAuth(request);
  if (!auth.authenticated) {
    return NextResponse.json({ error: auth.error }, { status: 401 });
  }

  try {
    const publicDir = path.join(process.cwd(), "public");
    const files = await readdir(publicDir);

    // Filter to only verification-type files
    const verificationFiles = [];

    for (const file of files) {
      if (isAllowedFile(file)) {
        try {
          const filePath = path.join(publicDir, file);
          const stats = await stat(filePath);
          if (stats.isFile() && stats.size < 50 * 1024) {
            // Only files under 50KB
            verificationFiles.push({
              name: file,
              uploadedAt: stats.mtime.toLocaleDateString("en-US", {
                year: "numeric",
                month: "short",
                day: "numeric",
              }),
            });
          }
        } catch {
          // Skip if can't stat
        }
      }
    }

    return NextResponse.json({
      success: true,
      files: verificationFiles,
    });
  } catch (error) {
    console.error("Error listing verification files:", error);
    return NextResponse.json({
      success: true,
      files: [],
    });
  }
}

// POST /api/admin/ads/verification-files - Upload a verification file
export async function POST(request: NextRequest) {
  const auth = await requireAuth(request);
  if (!auth.authenticated) {
    return NextResponse.json({ error: auth.error }, { status: 401 });
  }

  try {
    const formData = await request.formData();
    const file = formData.get("file") as File;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    const filename = file.name;

    // Security validation
    if (!isAllowedFile(filename)) {
      return NextResponse.json(
        { error: "Invalid file type. Only .txt and .html files allowed." },
        { status: 400 }
      );
    }

    // Check file size (max 10KB)
    if (file.size > 10 * 1024) {
      return NextResponse.json(
        { error: "File too large. Max 10KB allowed." },
        { status: 400 }
      );
    }

    // Read file content
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // Save to public directory
    const publicDir = path.join(process.cwd(), "public");
    const filePath = path.join(publicDir, filename);

    await writeFile(filePath, buffer);

    console.log(`[VERIFICATION] Uploaded file: ${filename}`);

    return NextResponse.json({
      success: true,
      message: `File "${filename}" uploaded successfully`,
      path: `/${filename}`,
    });
  } catch (error) {
    console.error("Error uploading verification file:", error);
    return NextResponse.json(
      { error: "Failed to upload file" },
      { status: 500 }
    );
  }
}

// DELETE /api/admin/ads/verification-files?file=filename.txt - Delete a verification file
export async function DELETE(request: NextRequest) {
  const auth = await requireAuth(request);
  if (!auth.authenticated) {
    return NextResponse.json({ error: auth.error }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const filename = searchParams.get("file");

    if (!filename) {
      return NextResponse.json(
        { error: "Filename required" },
        { status: 400 }
      );
    }

    // Security validation
    if (!isAllowedFile(filename)) {
      return NextResponse.json(
        { error: "Invalid file type" },
        { status: 400 }
      );
    }

    // Prevent path traversal
    const sanitizedFilename = path.basename(filename);
    const publicDir = path.join(process.cwd(), "public");
    const filePath = path.join(publicDir, sanitizedFilename);

    await unlink(filePath);

    console.log(`[VERIFICATION] Deleted file: ${sanitizedFilename}`);

    return NextResponse.json({
      success: true,
      message: `File "${sanitizedFilename}" deleted`,
    });
  } catch (error) {
    console.error("Error deleting verification file:", error);
    return NextResponse.json(
      { error: "Failed to delete file" },
      { status: 500 }
    );
  }
}
