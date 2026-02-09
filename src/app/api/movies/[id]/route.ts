import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db/prisma";
import { requireAuth } from "@/lib/auth";
import { validateMovieData } from "@/lib/utils/validators";
import { generateSlug, extractYear } from "@/lib/utils/slug";
import { generateMetaDescription, generateMetaTitle } from "@/lib/utils";
import { ApiResponse } from "@/types/api";
import { MovieFormData, MovieWithRelations } from "@/types/movie";

interface RouteParams {
  params: Promise<{ id: string }>;
}

// GET /api/movies/[id] - Get a single movie
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const movieId = parseInt(id);

    if (isNaN(movieId)) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: "Invalid movie ID" },
        { status: 400 }
      );
    }

    const movie = await prisma.movie.findUnique({
      where: { id: movieId },
      include: {
        streamingLinks: {
          where: { isActive: true },
          orderBy: { priority: "desc" },
        },
        seoIndexStatus: true,
      },
    });

    if (!movie) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: "Movie not found" },
        { status: 404 }
      );
    }

    return NextResponse.json<ApiResponse<MovieWithRelations>>({
      success: true,
      data: movie as MovieWithRelations,
    });
  } catch (error) {
    console.error("Get movie error:", error);
    return NextResponse.json<ApiResponse>(
      { success: false, error: "Failed to fetch movie" },
      { status: 500 }
    );
  }
}

// PUT /api/movies/[id] - Update a movie
export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const auth = await requireAuth(request);
    if (!auth.authenticated) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: auth.error },
        { status: 401 }
      );
    }

    const { id } = await params;
    const movieId = parseInt(id);

    if (isNaN(movieId)) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: "Invalid movie ID" },
        { status: 400 }
      );
    }

    const existingMovie = await prisma.movie.findUnique({
      where: { id: movieId },
    });

    if (!existingMovie) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: "Movie not found" },
        { status: 404 }
      );
    }

    const body: Partial<MovieFormData> = await request.json();
    const validation = validateMovieData({ 
      title: body.title || existingMovie.title,
      ...body 
    });

    if (!validation.isValid) {
      return NextResponse.json<ApiResponse>(
        { 
          success: false, 
          error: "Validation failed",
          data: validation.errors 
        },
        { status: 400 }
      );
    }

    // Handle slug update
    let slug = existingMovie.slug;
    if (body.title && body.title !== existingMovie.title) {
      const year = extractYear(body.releaseDate || existingMovie.releaseDate?.toISOString());
      slug = generateSlug(body.title, year);

      // Check if new slug exists
      const slugExists = await prisma.movie.findFirst({
        where: {
          slug,
          NOT: { id: movieId },
        },
      });

      if (slugExists) {
        slug = `${slug}-${Date.now().toString(36)}`;
      }
    }

    // Update meta fields if title changed
    const year = extractYear(body.releaseDate || existingMovie.releaseDate?.toISOString());
    const metaTitle = body.metaTitle || (body.title ? generateMetaTitle(body.title, year) : undefined);
    const metaDescription = body.metaDescription || (body.description ? generateMetaDescription(body.description) : undefined);

    const movie = await prisma.movie.update({
      where: { id: movieId },
      data: {
        title: body.title,
        slug: body.title ? slug : undefined,
        description: body.description,
        releaseDate: body.releaseDate ? new Date(body.releaseDate) : undefined,
        runtime: body.runtime,
        genres: body.genres ? JSON.stringify(body.genres) : undefined,
        cast: body.cast ? JSON.stringify(body.cast) : undefined,
        director: body.director,
        rating: body.rating,
        posterUrl: body.posterUrl,
        backdropUrl: body.backdropUrl,
        trailerUrl: body.trailerUrl,
        status: body.status,
        metaTitle,
        metaDescription,
        metaKeywords: (body as Record<string, unknown>).metaKeywords as string | undefined,
        tmdbId: body.tmdbId,
        imdbId: body.imdbId,
      },
      include: {
        streamingLinks: true,
        seoIndexStatus: true,
      },
    });

    return NextResponse.json<ApiResponse<MovieWithRelations>>({
      success: true,
      data: movie as MovieWithRelations,
    });
  } catch (error) {
    console.error("Update movie error:", error);
    return NextResponse.json<ApiResponse>(
      { success: false, error: "Failed to update movie" },
      { status: 500 }
    );
  }
}

// DELETE /api/movies/[id] - Delete a movie
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const auth = await requireAuth(request);
    if (!auth.authenticated) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: auth.error },
        { status: 401 }
      );
    }

    const { id } = await params;
    const movieId = parseInt(id);

    if (isNaN(movieId)) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: "Invalid movie ID" },
        { status: 400 }
      );
    }

    const existingMovie = await prisma.movie.findUnique({
      where: { id: movieId },
    });

    if (!existingMovie) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: "Movie not found" },
        { status: 404 }
      );
    }

    await prisma.movie.delete({
      where: { id: movieId },
    });

    return NextResponse.json<ApiResponse>({
      success: true,
      message: "Movie deleted successfully",
    });
  } catch (error) {
    console.error("Delete movie error:", error);
    return NextResponse.json<ApiResponse>(
      { success: false, error: "Failed to delete movie" },
      { status: 500 }
    );
  }
}
