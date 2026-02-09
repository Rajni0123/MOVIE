import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db/prisma";
import { requireAuth } from "@/lib/auth";
import { ApiResponse } from "@/types/api";

// GET /api/scraping/status - Get scraping job status
export async function GET(request: NextRequest) {
  try {
    const auth = await requireAuth(request);
    if (!auth.authenticated) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: auth.error },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const jobId = searchParams.get("jobId");

    if (jobId) {
      // Get specific job
      const job = await prisma.scrapingJob.findUnique({
        where: { id: parseInt(jobId) },
        include: { source: true },
      });

      if (!job) {
        return NextResponse.json<ApiResponse>(
          { success: false, error: "Job not found" },
          { status: 404 }
        );
      }

      return NextResponse.json<ApiResponse>({
        success: true,
        data: job,
      });
    }

    // Get all recent jobs
    const jobs = await prisma.scrapingJob.findMany({
      orderBy: { startedAt: "desc" },
      take: 20,
      include: { source: true },
    });

    return NextResponse.json<ApiResponse>({
      success: true,
      data: jobs,
    });
  } catch (error) {
    console.error("Get scraping status error:", error);
    return NextResponse.json<ApiResponse>(
      { success: false, error: "Failed to fetch scraping status" },
      { status: 500 }
    );
  }
}
