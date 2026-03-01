import { Metadata } from "next";
import { Movie } from "@prisma/client";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
const SITE_NAME = process.env.NEXT_PUBLIC_SITE_NAME || "MovPix";

/**
 * Generate dynamic SEO keywords for a movie
 */
export function generateMovieKeywords(movie: Movie, genres: string[] = []): string[] {
  const year = movie.releaseDate ? new Date(movie.releaseDate).getFullYear() : null;
  const keywords: string[] = [];

  // Base movie keywords
  keywords.push(movie.title);
  keywords.push(`${movie.title} download`);
  keywords.push(`${movie.title} full movie`);
  keywords.push(`${movie.title} free download`);
  keywords.push(`download ${movie.title}`);

  // Watch/Stream keywords (NEW - for SEO variation)
  keywords.push(`watch ${movie.title} online`);
  keywords.push(`${movie.title} watch online free`);
  keywords.push(`${movie.title} stream`);
  keywords.push(`${movie.title} streaming`);
  keywords.push(`${movie.title} online`);

  // Year-based keywords
  if (year) {
    keywords.push(`${movie.title} ${year}`);
    keywords.push(`${movie.title} ${year} download`);
    keywords.push(`${movie.title} ${year} full movie`);
    keywords.push(`watch ${movie.title} ${year}`);
    keywords.push(`${year} movies download`);
  }

  // Quality keywords
  keywords.push(`${movie.title} 480p`);
  keywords.push(`${movie.title} 720p`);
  keywords.push(`${movie.title} 1080p`);
  keywords.push(`${movie.title} 4K`);
  keywords.push(`${movie.title} HD`);
  keywords.push(`${movie.title} HD download`);

  // Genre keywords
  genres.forEach(genre => {
    keywords.push(`${genre} movies`);
    keywords.push(`${genre} movies download`);
    keywords.push(`watch ${genre} movies`);
    if (year) {
      keywords.push(`${genre} movies ${year}`);
    }
  });

  // Director keywords
  if (movie.director) {
    keywords.push(`${movie.director} movies`);
    keywords.push(`${movie.director} films`);
  }

  // Language keywords
  keywords.push(`${movie.title} Hindi`);
  keywords.push(`${movie.title} English`);
  keywords.push(`${movie.title} dual audio`);
  keywords.push(`${movie.title} Hindi dubbed`);

  // General keywords
  keywords.push("free movie download");
  keywords.push("HD movies");
  keywords.push("latest movies");
  keywords.push("watch movies online");

  return keywords;
}

/**
 * Generate metadata for a movie page
 * Title format: "Movie Name (Year) Download - 480p, 720p, 1080p HD"
 * This format is optimized for:
 * - Click-through rate (CTR)
 * - Keyword targeting (download, quality options)
 * - Search intent matching
 */
export function generateMovieMetadata(movie: Movie, genres: string[] = []): Metadata {
  const year = movie.releaseDate ? new Date(movie.releaseDate).getFullYear() : "";
  const currentYear = new Date().getFullYear();

  // Clean title - remove existing year in parentheses to avoid duplication
  const cleanTitle = movie.title
    .replace(/\s*\(\d{4}\)\s*/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  // Get primary genre for description
  const primaryGenre = genres.length > 0 ? genres[0] : "Movie";

  // SEO-optimized title (without site name - template adds it)
  // Format: "Movie Name (Year) Download - 480p, 720p, 1080p HD"
  const title = movie.metaTitle ||
    `${cleanTitle}${year ? ` (${year})` : ""} Download - 480p, 720p, 1080p HD`;

  // SEO-optimized description with call-to-action
  // Includes: Movie name, year, quality options, genres, and CTA
  const shortDesc = movie.description
    ? movie.description.slice(0, 100).trim() + "..."
    : "";

  // Get secondary genre if available
  const secondaryGenre = genres.length > 1 ? genres[1] : "";

  // Enhanced description with more content depth and keyword variation
  const description = movie.metaDescription ||
    `⬇️ Download ${cleanTitle}${year ? ` (${year})` : ""} full ${primaryGenre}${secondaryGenre ? ` ${secondaryGenre}` : ""} movie in HD quality. Watch online or download in 480p, 720p, 1080p, 4K. ${shortDesc}${movie.director ? ` Directed by ${movie.director}.` : ""} Free streaming & fast download links!`;

  // Full title with site name for OG/Twitter (these don't use template)
  const fullTitle = `${title} | ${SITE_NAME}`;

  const keywords = generateMovieKeywords(movie, genres);

  return {
    title, // Template will add "| MovPix"
    description,
    keywords: keywords.join(", "),
    openGraph: {
      title: fullTitle,
      description,
      type: "video.movie",
      url: `${SITE_URL}/movie/${movie.slug}`,
      siteName: SITE_NAME,
      images: movie.posterUrl ? [
        {
          url: movie.posterUrl,
          width: 500,
          height: 750,
          alt: `${cleanTitle}${year ? ` (${year})` : ""} Movie Poster - Download HD`,
        },
      ] : [],
    },
    twitter: {
      card: "summary_large_image",
      title: fullTitle,
      description,
      images: movie.posterUrl ? [movie.posterUrl] : [],
    },
    alternates: {
      canonical: `${SITE_URL}/movie/${movie.slug}`,
    },
  };
}

/**
 * Generate metadata for the homepage
 * Optimized for high CTR and keyword targeting
 */
export function generateHomeMetadata(): Metadata {
  const currentYear = new Date().getFullYear();
  const keywords = [
    // Download keywords
    "download movies free",
    "free movie download",
    "HD movies download",
    "latest movies download",
    `${currentYear} movies download`,
    `new movies ${currentYear}`,
    // Quality keywords
    "480p movies download",
    "720p movies download",
    "1080p movies download",
    "4K movies download",
    // Streaming/Watch keywords
    "watch movies online free",
    "stream movies free",
    "watch online movies HD",
    "free streaming movies",
    "online movies watch",
    // Language keywords
    "dual audio movies",
    "Hindi movies download",
    "English movies download",
    "Hindi dubbed movies",
    "South Indian movies Hindi",
    // Industry keywords
    "Hollywood movies download",
    "Bollywood movies download",
    "South movies download",
    "latest Hollywood movies",
    "latest Bollywood movies",
    // General keywords
    "free HD movies",
    "movie download site",
    "best movie website",
    "movie download hub",
  ].join(", ");

  // Homepage title without site name (template adds it)
  const title = `Download Latest Movies Free - HD 480p 720p 1080p ${currentYear}`;
  const fullTitle = `${SITE_NAME} - ${title}`;

  const description = `⬇️ Download & watch latest Bollywood, Hollywood & South movies FREE in HD quality (480p, 720p, 1080p, 4K). New ${currentYear} releases updated daily. Stream online or download with fast links, no signup required!`;

  return {
    title: fullTitle, // Full title for homepage
    description,
    keywords,
    openGraph: {
      title: fullTitle,
      description,
      type: "website",
      url: SITE_URL,
      siteName: SITE_NAME,
      images: [
        {
          url: `${SITE_URL}/icon-512.png`,
          width: 1200,
          height: 630,
          alt: `${SITE_NAME} - Free HD Movie Downloads ${currentYear}`,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title: fullTitle,
      description,
      images: [`${SITE_URL}/icon-512.png`],
    },
    alternates: {
      canonical: SITE_URL,
    },
  };
}

/**
 * Generate metadata for year page
 * Optimized for year-specific movie searches
 */
export function generateYearMetadata(year: number): Metadata {
  const keywords = [
    `${year} movies`,
    `${year} movies download`,
    `${year} HD movies`,
    `best ${year} movies`,
    `latest ${year} movies`,
    `${year} Hollywood movies`,
    `${year} Bollywood movies`,
    `download ${year} movies free`,
    `${year} movies 480p`,
    `${year} movies 720p`,
    `${year} movies 1080p`,
    `new movies ${year}`,
    `${year} movie download`,
    `${year} Hindi movies`,
    `${year} English movies`,
  ].join(", ");

  // Title without site name (template adds it)
  const title = `${year} Movies Download - Latest HD 480p 720p 1080p`;
  const fullTitle = `${title} | ${SITE_NAME}`;

  const description = `⬇️ Download ${year} movies FREE in HD quality. Best ${year} Bollywood & Hollywood releases in 480p, 720p, 1080p. Updated collection with fast download links!`;

  return {
    title,
    description,
    keywords,
    openGraph: {
      title: fullTitle,
      description,
      type: "website",
      url: `${SITE_URL}/years/${year}`,
      siteName: SITE_NAME,
      images: [
        {
          url: `${SITE_URL}/icon-512.png`,
          width: 1200,
          height: 630,
          alt: `${year} Movies Download - ${SITE_NAME}`,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title: fullTitle,
      description,
      images: [`${SITE_URL}/icon-512.png`],
    },
    alternates: {
      canonical: `${SITE_URL}/years/${year}`,
    },
  };
}

/**
 * Generate metadata for trending page
 * Optimized for viral/trending searches
 */
export function generateTrendingMetadata(): Metadata {
  const currentYear = new Date().getFullYear();
  const keywords = [
    "trending movies",
    "popular movies download",
    "top movies",
    "best movies download",
    `trending movies ${currentYear}`,
    "most downloaded movies",
    "viral movies",
    "hot movies download",
    "new releases",
    `latest movies ${currentYear}`,
    "box office hits",
  ].join(", ");

  // Title without site name (template adds it)
  const title = `Trending Movies Download - Viral HD ${currentYear}`;
  const fullTitle = `${title} | ${SITE_NAME}`;

  const description = `🔥 Download trending & viral movies FREE in HD. Hottest ${currentYear} releases everyone is watching! 480p, 720p, 1080p with fast download links!`;

  return {
    title,
    description,
    keywords,
    openGraph: {
      title: fullTitle,
      description,
      type: "website",
      url: `${SITE_URL}/trending`,
      siteName: SITE_NAME,
      images: [
        {
          url: `${SITE_URL}/icon-512.png`,
          width: 1200,
          height: 630,
          alt: `Trending Movies Download - ${SITE_NAME}`,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title: fullTitle,
      description,
      images: [`${SITE_URL}/icon-512.png`],
    },
    alternates: {
      canonical: `${SITE_URL}/trending`,
    },
  };
}

/**
 * Generate metadata for movies listing page
 * Optimized for browsing/collection searches
 */
export function generateMoviesListMetadata(): Metadata {
  const currentYear = new Date().getFullYear();
  const keywords = [
    "all movies download",
    "free movies",
    "HD movies collection",
    "movie library",
    `movies ${currentYear}`,
    "download movies",
    "free movie download site",
    "480p 720p 1080p movies",
    "latest movies download",
    "new movie releases",
    "Hollywood movies",
    "Bollywood movies",
    "movie download website",
  ].join(", ");

  // Title without site name (template adds it)
  const title = `All Movies Download - Latest HD Collection ${currentYear}`;
  const fullTitle = `${title} | ${SITE_NAME}`;

  const description = `⬇️ Browse & download all movies FREE in HD quality. 1000+ Bollywood & Hollywood movies in 480p, 720p, 1080p. Updated daily with new ${currentYear} releases!`;

  return {
    title,
    description,
    keywords,
    openGraph: {
      title: fullTitle,
      description,
      type: "website",
      url: `${SITE_URL}/movies`,
      siteName: SITE_NAME,
      images: [
        {
          url: `${SITE_URL}/icon-512.png`,
          width: 1200,
          height: 630,
          alt: `All Movies Download - ${SITE_NAME}`,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title: fullTitle,
      description,
      images: [`${SITE_URL}/icon-512.png`],
    },
    alternates: {
      canonical: `${SITE_URL}/movies`,
    },
  };
}

/**
 * Generate metadata for genre page
 * Optimized for genre-specific searches
 */
export function generateGenreMetadata(genre: string): Metadata {
  const currentYear = new Date().getFullYear();
  const capitalizedGenre = genre.charAt(0).toUpperCase() + genre.slice(1);
  const keywords = [
    `${genre} movies`,
    `${genre} movies download`,
    `${genre} HD movies`,
    `best ${genre} movies`,
    `latest ${genre} movies`,
    `${genre} movies ${currentYear}`,
    `download ${genre} movies free`,
    `${genre} movies 480p`,
    `${genre} movies 720p`,
    `${genre} movies 1080p`,
    `top ${genre} movies`,
    `${genre} movies Hindi`,
    `${genre} movies English`,
    `new ${genre} movies ${currentYear}`,
  ].join(", ");

  // Title without site name (template adds it)
  const title = `${capitalizedGenre} Movies Download - Best HD 480p 720p 1080p`;
  const fullTitle = `${title} | ${SITE_NAME}`;

  const description = `⬇️ Download best ${capitalizedGenre} movies FREE in HD quality. Latest ${currentYear} ${genre} films in 480p, 720p, 1080p. Hollywood & Bollywood ${genre} movies with fast links!`;

  return {
    title,
    description,
    keywords,
    openGraph: {
      title: fullTitle,
      description,
      type: "website",
      url: `${SITE_URL}/genres/${genre.toLowerCase()}`,
      siteName: SITE_NAME,
      images: [
        {
          url: `${SITE_URL}/icon-512.png`,
          width: 1200,
          height: 630,
          alt: `${capitalizedGenre} Movies Download - ${SITE_NAME}`,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title: fullTitle,
      description,
      images: [`${SITE_URL}/icon-512.png`],
    },
    alternates: {
      canonical: `${SITE_URL}/genres/${genre.toLowerCase()}`,
    },
  };
}

/**
 * Generate metadata for search page
 */
export function generateSearchMetadata(query?: string): Metadata {
  const title = query
    ? `Search: ${query} - ${SITE_NAME}`
    : `Search Movies - ${SITE_NAME}`;
  const description = query
    ? `Search results for "${query}". Download ${query} movies in HD quality (480p, 720p, 1080p).`
    : `Search and download movies for free in HD quality. Find any movie you want.`;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      type: "website",
      url: `${SITE_URL}/search`,
      siteName: SITE_NAME,
    },
    twitter: {
      card: "summary",
      title,
      description,
    },
    alternates: {
      canonical: `${SITE_URL}/search`,
    },
  };
}

/**
 * Generate metadata for popular page
 * Optimized for trending/popular searches
 */
export function generatePopularMetadata(): Metadata {
  const currentYear = new Date().getFullYear();
  const keywords = [
    "popular movies",
    "most watched movies",
    "top movies download",
    "best movies",
    `popular movies ${currentYear}`,
    "highest rated movies",
    "fan favorite movies",
    "trending movies download",
    "top rated movies",
    "blockbuster movies",
    `best movies ${currentYear}`,
    "IMDb top movies",
  ].join(", ");

  // Title without site name (template adds it)
  const title = `Popular Movies Download - Top Rated HD ${currentYear}`;
  const fullTitle = `${title} | ${SITE_NAME}`;

  const description = `🔥 Download most popular & trending movies FREE in HD. Top-rated ${currentYear} blockbusters in 480p, 720p, 1080p. IMDb highest rated movies with fast download links!`;

  return {
    title,
    description,
    keywords,
    openGraph: {
      title: fullTitle,
      description,
      type: "website",
      url: `${SITE_URL}/popular`,
      siteName: SITE_NAME,
      images: [
        {
          url: `${SITE_URL}/icon-512.png`,
          width: 1200,
          height: 630,
          alt: `Popular Movies Download - ${SITE_NAME}`,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title: fullTitle,
      description,
      images: [`${SITE_URL}/icon-512.png`],
    },
    alternates: {
      canonical: `${SITE_URL}/popular`,
    },
  };
}

/**
 * Generate default metadata
 * This sets up the base configuration for all pages
 */
export function generateDefaultMetadata(): Metadata {
  const currentYear = new Date().getFullYear();
  return {
    metadataBase: new URL(SITE_URL),
    title: {
      default: `${SITE_NAME} - Download Free HD Movies 480p 720p 1080p`,
      template: `%s | ${SITE_NAME}`,
    },
    description: `⬇️ Download latest movies FREE in HD quality. Bollywood, Hollywood, South movies in 480p, 720p, 1080p. Fast download links, updated daily ${currentYear}!`,
    keywords: `free movies, download movies, HD movies, ${currentYear} movies, movie download site, free movie download, 480p movies, 720p movies, 1080p movies, Bollywood movies, Hollywood movies`,
    authors: [{ name: SITE_NAME }],
    creator: SITE_NAME,
    publisher: SITE_NAME,
    robots: {
      index: true,
      follow: true,
      googleBot: {
        index: true,
        follow: true,
        "max-video-preview": -1,
        "max-image-preview": "large",
        "max-snippet": -1,
      },
    },
    verification: {
      // Add your verification codes here
      // google: "your-google-verification-code",
    },
    other: {
      "revisit-after": "1 day",
      "distribution": "global",
      "rating": "general",
    },
  };
}
