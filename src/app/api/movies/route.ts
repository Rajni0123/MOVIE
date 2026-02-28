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
      // Handle special "POPULAR" filter for featured movies
      if (status === "POPULAR") {
        where.isFeatured = true;
      } else {
        where.status = status as "DRAFT" | "PUBLISHED" | "UNPUBLISHED";
      }
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
    const slug = body.slug || generateSlug(body.title, year);

    // Normalize title for duplicate detection - extract year first to keep movies from different years separate
    const normalizeTitle = (title: string) => {
      // Extract year from title to keep movies from different years separate
      const yearMatch = title.match(/\((\d{4})\)/);
      const extractedYear = yearMatch ? yearMatch[1] : '';

      const normalized = title.toLowerCase()
        .replace(/\(\d{4}\)/g, '') // Remove year in parentheses
        .replace(/\[\d{4}\]/g, '') // Remove year in brackets
        .replace(/hindi|dubbed|hd|netflix|complete|season|jiohotstar|amzn|web-dl|webrip|hdtc|hdcam|dvdrip|bluray|brrip/gi, '')
        .replace(/v2|v3|v4|proper|x264|x265|hevc|10bit|esub|msubs|nf|hdts|predvd|scr|hdrip|camrip|telesync|ts|tc|cam|r5|dvdscr|ppvrip|hdtv|pdtv|dsr|dvbr|satrip|iptvrip|vhsrip|vodrip|web|remux|pre|dvd/gi, '')
        .replace(/480p|720p|1080p|2160p|4k/gi, '')
        .replace(/[^a-z0-9]/g, '')
        .trim();

      // Append year to keep movies from different years separate (e.g., Karam 2005 vs Karam 2025)
      return normalized + extractedYear;
    };

    const normalizedTitle = normalizeTitle(body.title);

    // Check if movie already exists by slug OR exact title
    const existingMovie = await prisma.movie.findFirst({
      where: {
        OR: [
          { slug: slug },
          { title: body.title },
        ],
      },
    });

    if (existingMovie) {
      return NextResponse.json<ApiResponse>(
        {
          success: false,
          error: `Movie already exists: "${existingMovie.title}" (ID: ${existingMovie.id})`,
          data: { existingId: existingMovie.id, existingSlug: existingMovie.slug }
        },
        { status: 409 } // Conflict
      );
    }

    // If not found, check by normalized title (fuzzy match)
    const allMovies = await prisma.movie.findMany({
      select: { id: true, title: true, slug: true },
      take: 5000, // Limit for performance
    });

    const fuzzyMatch = allMovies.find(m => normalizeTitle(m.title) === normalizedTitle);
    if (fuzzyMatch) {
      return NextResponse.json<ApiResponse>(
        {
          success: false,
          error: `Movie already exists: "${fuzzyMatch.title}" (ID: ${fuzzyMatch.id})`,
          data: { existingId: fuzzyMatch.id, existingSlug: fuzzyMatch.slug }
        },
        { status: 409 } // Conflict
      );
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
