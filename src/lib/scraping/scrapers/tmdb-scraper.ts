import { buildTMDBApiUrl, buildTMDBImageUrl, TMDB_CONFIG } from "@/config/scraping-sources";
import { TMDBMovie, TMDBCredits, MovieFormData, CastMember } from "@/types/movie";
import { generateSlug } from "@/lib/utils/slug";
import { generateMetaDescription, generateMetaTitle } from "@/lib/utils";

interface TMDBResponse<T> {
  page: number;
  results: T[];
  total_pages: number;
  total_results: number;
}

interface TMDBMovieDetail extends TMDBMovie {
  credits?: TMDBCredits;
}

/**
 * TMDB API Scraper
 */
export class TMDBScraper {
  private apiKey: string;

  constructor() {
    this.apiKey = process.env.TMDB_API_KEY || "";
    if (!this.apiKey) {
      console.warn("TMDB_API_KEY is not set. TMDB scraping will not work.");
    }
  }

  /**
   * Fetch popular movies from TMDB
   */
  async fetchPopularMovies(page = 1): Promise<TMDBMovie[]> {
    const url = buildTMDBApiUrl("/movie/popular", { page: String(page) });
    const response = await fetch(url);
    
    if (!response.ok) {
      throw new Error(`TMDB API error: ${response.statusText}`);
    }

    const data: TMDBResponse<TMDBMovie> = await response.json();
    return data.results;
  }

  /**
   * Fetch top rated movies from TMDB
   */
  async fetchTopRatedMovies(page = 1): Promise<TMDBMovie[]> {
    const url = buildTMDBApiUrl("/movie/top_rated", { page: String(page) });
    const response = await fetch(url);
    
    if (!response.ok) {
      throw new Error(`TMDB API error: ${response.statusText}`);
    }

    const data: TMDBResponse<TMDBMovie> = await response.json();
    return data.results;
  }

  /**
   * Fetch now playing movies from TMDB
   */
  async fetchNowPlayingMovies(page = 1): Promise<TMDBMovie[]> {
    const url = buildTMDBApiUrl("/movie/now_playing", { page: String(page) });
    const response = await fetch(url);
    
    if (!response.ok) {
      throw new Error(`TMDB API error: ${response.statusText}`);
    }

    const data: TMDBResponse<TMDBMovie> = await response.json();
    return data.results;
  }

  /**
   * Fetch movie details by TMDB ID
   */
  async fetchMovieDetails(tmdbId: number): Promise<TMDBMovieDetail | null> {
    const url = buildTMDBApiUrl(`/movie/${tmdbId}`, {
      append_to_response: "credits",
    });
    
    const response = await fetch(url);
    
    if (!response.ok) {
      if (response.status === 404) {
        return null;
      }
      throw new Error(`TMDB API error: ${response.statusText}`);
    }

    return response.json();
  }

  /**
   * Search movies by title
   */
  async searchMovies(query: string, page = 1): Promise<TMDBMovie[]> {
    const url = buildTMDBApiUrl("/search/movie", {
      query: encodeURIComponent(query),
      page: String(page),
    });
    
    const response = await fetch(url);
    
    if (!response.ok) {
      throw new Error(`TMDB API error: ${response.statusText}`);
    }

    const data: TMDBResponse<TMDBMovie> = await response.json();
    return data.results;
  }

  /**
   * Convert TMDB movie to our MovieFormData format
   */
  convertToMovieFormData(tmdbMovie: TMDBMovieDetail): MovieFormData {
    const year = tmdbMovie.release_date
      ? new Date(tmdbMovie.release_date).getFullYear()
      : undefined;

    // Extract director from credits
    const director = tmdbMovie.credits?.crew?.find(
      (member) => member.job === "Director"
    )?.name;

    // Extract cast
    const cast: CastMember[] = (tmdbMovie.credits?.cast || [])
      .slice(0, 10)
      .map((member) => ({
        name: member.name,
        character: member.character,
        profilePath: buildTMDBImageUrl(member.profile_path, "profile") || undefined,
      }));

    // Extract genres
    const genres = tmdbMovie.genres?.map((g) => g.name) || [];

    // Build image URLs
    const posterUrl = buildTMDBImageUrl(tmdbMovie.poster_path, "poster", "large");
    const backdropUrl = buildTMDBImageUrl(tmdbMovie.backdrop_path, "backdrop", "large");

    // Generate SEO metadata
    const metaTitle = generateMetaTitle(tmdbMovie.title, year);
    const metaDescription = generateMetaDescription(tmdbMovie.overview || "");

    return {
      title: tmdbMovie.title,
      slug: generateSlug(tmdbMovie.title, year),
      description: tmdbMovie.overview,
      releaseDate: tmdbMovie.release_date,
      runtime: tmdbMovie.runtime,
      genres,
      cast,
      director,
      rating: tmdbMovie.vote_average,
      posterUrl: posterUrl || undefined,
      backdropUrl: backdropUrl || undefined,
      status: "DRAFT",
      metaTitle,
      metaDescription,
      tmdbId: String(tmdbMovie.id),
      imdbId: tmdbMovie.imdb_id,
    };
  }

  /**
   * Scrape and convert a single movie by TMDB ID
   */
  async scrapeMovie(tmdbId: number): Promise<MovieFormData | null> {
    const movieDetails = await this.fetchMovieDetails(tmdbId);
    
    if (!movieDetails) {
      return null;
    }

    return this.convertToMovieFormData(movieDetails);
  }

  /**
   * Scrape multiple movies from a list
   */
  async scrapeMovies(
    type: "popular" | "top_rated" | "now_playing",
    pages = 1
  ): Promise<MovieFormData[]> {
    const movies: MovieFormData[] = [];

    for (let page = 1; page <= pages; page++) {
      let basicMovies: TMDBMovie[];

      switch (type) {
        case "popular":
          basicMovies = await this.fetchPopularMovies(page);
          break;
        case "top_rated":
          basicMovies = await this.fetchTopRatedMovies(page);
          break;
        case "now_playing":
          basicMovies = await this.fetchNowPlayingMovies(page);
          break;
        default:
          basicMovies = await this.fetchPopularMovies(page);
      }

      // Fetch full details for each movie
      for (const basicMovie of basicMovies) {
        try {
          const movieData = await this.scrapeMovie(basicMovie.id);
          if (movieData) {
            movies.push(movieData);
          }

          // Rate limiting - wait 100ms between requests
          await new Promise((resolve) => setTimeout(resolve, 100));
        } catch (error) {
          console.error(`Error scraping movie ${basicMovie.id}:`, error);
        }
      }
    }

    return movies;
  }
}

// Export singleton instance
export const tmdbScraper = new TMDBScraper();
