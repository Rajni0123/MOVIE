import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db/prisma";
import { requireAuth } from "@/lib/auth";
import { validateMovieData, validatePagination } from "@/lib/utils/validators";
import { generateSlug, extractYear } from "@/lib/utils/slug";
import { generateMetaDescription, generateMetaTitle } from "@/lib/utils";
import { ApiResponse } from "@/types/api";
import { MovieFormData, MovieWithRelations, PaginatedMovies } from "@/types/movie";
import { Prisma } from "@prisma/client";

// GET /api/movies - List all movies with pagination
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get("page") || "1");
    const pageSize = parseInt(searchParams.get("pageSize") || "20");
    const status = searchParams.get("status");
    const genre = searchParams.get("genre");
    const year = searchParams.get("year");
    const search = searchParams.get("search");
    const sortBy = searchParams.get("sortBy") || "createdAt";
    const sortOrder = searchParams.get("sortOrder") || "desc";

    const { page: validPage, pageSize: validPageSize } = validatePagination(page, pageSize);
    const skip = (validPage - 1) * validPageSize;

    // Build where clause
    const where: Prisma.MovieWhereInput = {};

    if (status) {
      where.status = status as "DRAFT" | "PUBLISHED" | "UNPUBLISHED";
    }

    if (genre) {
      where.genres = {
        contains: genre,
      };
    }

    if (year) {
      const yearNum = parseInt(year);
      if (!isNaN(yearNum)) {
        where.releaseDate = {
          gte: new Date(`${yearNum}-01-01`),
          lt: new Date(`${yearNum + 1}-01-01`),
        };
      }
    }

    // Note: For search, we'll do post-filtering for case-insensitive match in SQLite
    const searchTerm = search?.toLowerCase();

    // Build orderBy
    const orderBy: Prisma.MovieOrderByWithRelationInput = {
      [sortBy]: sortOrder as "asc" | "desc",
    };

    // If searching, fetch all matching and filter for case-insensitive match
    if (searchTerm) {
      const allMovies = await prisma.movie.findMany({
        where,
        orderBy,
        include: {
          streamingLinks: true,
          seoIndexStatus: true,
        },
      });

      // Case-insensitive filtering
      const filteredMovies = allMovies.filter((movie) => {
        const titleMatch = movie.title?.toLowerCase().includes(searchTerm);
        const descMatch = movie.description?.toLowerCase().includes(searchTerm);
        const directorMatch = movie.director?.toLowerCase().includes(searchTerm);
        return titleMatch || descMatch || directorMatch;
      });

      const total = filteredMovies.length;
      const paginatedMovies = filteredMovies.slice(skip, skip + validPageSize);

      const response: ApiResponse<PaginatedMovies> = {
        success: true,
        data: {
          movies: paginatedMovies as MovieWithRelations[],
          total,
          page: validPage,
          pageSize: validPageSize,
          totalPages: Math.ceil(total / validPageSize),
        },
      };

      return NextResponse.json(response);
    }

    const [movies, total] = await Promise.all([
      prisma.movie.findMany({
        where,
        orderBy,
        skip,
        take: validPageSize,
        include: {
          streamingLinks: true,
          seoIndexStatus: true,
        },
      }),
      prisma.movie.count({ where }),
    ]);

    const response: ApiResponse<PaginatedMovies> = {
      success: true,
      data: {
        movies: movies as MovieWithRelations[],
        total,
        page: validPage,
        pageSize: validPageSize,
        totalPages: Math.ceil(total / validPageSize),
      },
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error("Get movies error:", error);
    return NextResponse.json<ApiResponse>(
      { success: false, error: "Failed to fetch movies" },
      { status: 500 }
    );
  }
}

// POST /api/movies - Create a new movie
export async function POST(request: NextRequest) {
  try {
    const auth = await requireAuth(request);
    if (!auth.authenticated) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: auth.error },
        { status: 401 }
      );
    }

    const body: MovieFormData = await request.json();
    const validation = validateMovieData(body);

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

    // Generate slug if not provided
    const year = extractYear(body.releaseDate);
    let slug = body.slug || generateSlug(body.title, year);

    // Check if slug exists
    const existingMovie = await prisma.movie.findUnique({
      where: { slug },
    });

    if (existingMovie) {
      // Append a random suffix
      slug = `${slug}-${Date.now().toString(36)}`;
    }

    // Generate meta fields if not provided
    const metaTitle = body.metaTitle || generateMetaTitle(body.title, year);
    const metaDescription = body.metaDescription || generateMetaDescription(body.description || "");

    const movie = await prisma.movie.create({
      data: {
        title: body.title,
        slug,
        description: body.description,
        releaseDate: body.releaseDate ? new Date(body.releaseDate) : null,
        runtime: body.runtime,
        genres: JSON.stringify(body.genres || []),
        cast: JSON.stringify(body.cast || []),
        director: body.director,
        rating: body.rating,
        posterUrl: body.posterUrl,
        backdropUrl: body.backdropUrl,
        trailerUrl: body.trailerUrl,
        status: body.status || "DRAFT",
        metaTitle,
        metaDescription,
        tmdbId: body.tmdbId,
        imdbId: body.imdbId,
      },
      include: {
        streamingLinks: true,
        seoIndexStatus: true,
      },
    });

    // Create SEO index status record
    await prisma.seoIndexStatus.create({
      data: {
        movieId: movie.id,
      },
    });

    return NextResponse.json<ApiResponse<MovieWithRelations>>(
      { success: true, data: movie as MovieWithRelations },
      { status: 201 }
    );
  } catch (error) {
    console.error("Create movie error:", error);
    return NextResponse.json<ApiResponse>(
      { success: false, error: "Failed to create movie" },
      { status: 500 }
    );
  }
}
