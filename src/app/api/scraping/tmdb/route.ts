import { NextRequest, NextResponse } from "next/server";

const TMDB_API_KEY = process.env.TMDB_API_KEY;
const TMDB_BASE_URL = "https://api.themoviedb.org/3";
const TMDB_IMAGE_BASE = "https://image.tmdb.org/t/p";

// GET /api/scraping/tmdb?tmdbId=123 - Fetch movie data from TMDB
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const tmdbId = searchParams.get("tmdbId");

    if (!tmdbId) {
      return NextResponse.json(
        { success: false, error: "TMDB ID is required" },
        { status: 400 }
      );
    }

    if (!TMDB_API_KEY) {
      return NextResponse.json(
        { success: false, error: "TMDB API key not configured. Add TMDB_API_KEY to .env" },
        { status: 500 }
      );
    }

    // Fetch movie details
    const movieRes = await fetch(
      `${TMDB_BASE_URL}/movie/${tmdbId}?api_key=${TMDB_API_KEY}&language=en-US`
    );

    if (!movieRes.ok) {
      return NextResponse.json(
        { success: false, error: "Movie not found on TMDB" },
        { status: 404 }
      );
    }

    const movieData = await movieRes.json();

    // Fetch credits for director and cast
    const creditsRes = await fetch(
      `${TMDB_BASE_URL}/movie/${tmdbId}/credits?api_key=${TMDB_API_KEY}`
    );
    const creditsData = await creditsRes.json();

    // Fetch videos for trailer
    const videosRes = await fetch(
      `${TMDB_BASE_URL}/movie/${tmdbId}/videos?api_key=${TMDB_API_KEY}`
    );
    const videosData = await videosRes.json();

    // Find director
    const director = creditsData.crew?.find(
      (person: { job: string }) => person.job === "Director"
    );

    // Get cast (top 10)
    const cast = creditsData.cast?.slice(0, 10).map((person: { name: string; character: string }) => ({
      name: person.name,
      character: person.character,
    })) || [];

    // Find trailer (YouTube)
    const trailer = videosData.results?.find(
      (video: { site: string; type: string }) =>
        video.site === "YouTube" && video.type === "Trailer"
    );

    // Format response
    const movie = {
      title: movieData.title,
      description: movieData.overview,
      releaseDate: movieData.release_date,
      runtime: movieData.runtime,
      genres: movieData.genres?.map((g: { name: string }) => g.name) || [],
      director: director?.name || "",
      cast,
      rating: movieData.vote_average,
      posterUrl: movieData.poster_path
        ? `${TMDB_IMAGE_BASE}/w500${movieData.poster_path}`
        : "",
      backdropUrl: movieData.backdrop_path
        ? `${TMDB_IMAGE_BASE}/original${movieData.backdrop_path}`
        : "",
      trailerUrl: trailer
        ? `https://www.youtube.com/watch?v=${trailer.key}`
        : "",
      tmdbId: tmdbId,
      imdbId: movieData.imdb_id || "",
    };

    return NextResponse.json({ success: true, data: movie });
  } catch (error) {
    console.error("TMDB fetch error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch from TMDB" },
      { status: 500 }
    );
  }
}
