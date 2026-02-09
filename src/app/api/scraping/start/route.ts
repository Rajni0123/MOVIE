import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db/prisma";
import { requireAuth } from "@/lib/auth";
import { tmdbScraper } from "@/lib/scraping/scrapers/tmdb-scraper";
import { ApiResponse } from "@/types/api";

// POST /api/scraping/start - Start a scraping job
export async function POST(request: NextRequest) {
  try {
    const auth = await requireAuth(request);
    if (!auth.authenticated) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: auth.error },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { type = "popular", pages = 1 } = body;

    // Create scraping job record
    const job = await prisma.scrapingJob.create({
      data: {
        status: "RUNNING",
        startedAt: new Date(),
      },
    });

    // Start scraping in the background
    // In production, this should be done via a job queue like Bull
    scrapeInBackground(job.id, type, pages);

    return NextResponse.json<ApiResponse>({
      success: true,
      data: {
        jobId: job.id,
        message: "Scraping job started",
      },
    });
  } catch (error) {
    console.error("Start scraping error:", error);
    return NextResponse.json<ApiResponse>(
      { success: false, error: "Failed to start scraping job" },
      { status: 500 }
    );
  }
}

async function scrapeInBackground(
  jobId: number,
  type: "popular" | "top_rated" | "now_playing",
  pages: number
) {
  let moviesFound = 0;
  let moviesAdded = 0;
  const errors: { message: string; timestamp: Date }[] = [];

  try {
    const movies = await tmdbScraper.scrapeMovies(type, pages);
    moviesFound = movies.length;

    for (const movieData of movies) {
      try {
        // Check if movie already exists
        const existing = await prisma.movie.findFirst({
          where: {
            OR: [
              { tmdbId: movieData.tmdbId },
              { slug: movieData.slug },
            ],
          },
        });

        if (!existing) {
          const movie = await prisma.movie.create({
            data: {
              title: movieData.title,
              slug: movieData.slug!,
              description: movieData.description,
              releaseDate: movieData.releaseDate ? new Date(movieData.releaseDate) : null,
              runtime: movieData.runtime,
              genres: JSON.stringify(movieData.genres || []),
              cast: JSON.stringify(movieData.cast || []),
              director: movieData.director,
              rating: movieData.rating,
              posterUrl: movieData.posterUrl,
              backdropUrl: movieData.backdropUrl,
              status: "DRAFT",
              metaTitle: movieData.metaTitle,
              metaDescription: movieData.metaDescription,
              tmdbId: movieData.tmdbId,
              imdbId: movieData.imdbId,
            },
          });

          // Create SEO status
          await prisma.seoIndexStatus.create({
            data: { movieId: movie.id },
          });

          moviesAdded++;
        }
      } catch (error) {
        errors.push({
          message: `Error adding movie ${movieData.title}: ${error}`,
          timestamp: new Date(),
        });
      }
    }

    // Update job as completed
    await prisma.scrapingJob.update({
      where: { id: jobId },
      data: {
        status: "COMPLETED",
        moviesFound,
        moviesAdded,
        errors: errors.length > 0 ? errors : undefined,
        completedAt: new Date(),
      },
    });
  } catch (error) {
    // Update job as failed
    await prisma.scrapingJob.update({
      where: { id: jobId },
      data: {
        status: "FAILED",
        moviesFound,
        moviesAdded,
        errors: [{ message: String(error), timestamp: new Date() }],
        completedAt: new Date(),
      },
    });
  }
}
