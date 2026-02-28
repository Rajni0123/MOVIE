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
  
  // Year-based keywords
  if (year) {
    keywords.push(`${movie.title} ${year}`);
    keywords.push(`${movie.title} ${year} download`);
    keywords.push(`${movie.title} ${year} full movie`);
    keywords.push(`${year} movies download`);
  }

  // Quality keywords
  keywords.push(`${movie.title} 480p`);
  keywords.push(`${movie.title} 720p`);
  keywords.push(`${movie.title} 1080p`);
  keywords.push(`${movie.title} HD`);
  keywords.push(`${movie.title} HD download`);

  // Genre keywords
  genres.forEach(genre => {
    keywords.push(`${genre} movies`);
    keywords.push(`${genre} movies download`);
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

  // General keywords
  keywords.push("free movie download");
  keywords.push("HD movies");
  keywords.push("latest movies");

  return keywords;
}

/**
 * Generate metadata for a movie page
 */
export function generateMovieMetadata(movie: Movie, genres: string[] = []): Metadata {
  const year = movie.releaseDate ? new Date(movie.releaseDate).getFullYear() : "";
  const title = movie.metaTitle || `Download ${movie.title}${year ? ` (${year})` : ""} - Full Movie HD | ${SITE_NAME}`;
  const description = movie.metaDescription || 
    `Download ${movie.title}${year ? ` (${year})` : ""} full movie for free in HD quality (480p, 720p, 1080p). ${movie.description?.slice(0, 100) || `Watch ${movie.title} online free.`}`;
  
  const keywords = generateMovieKeywords(movie, genres);

  return {
    title,
    description,
    keywords: keywords.join(", "),
    openGraph: {
      title,
      description,
      type: "video.movie",
      url: `${SITE_URL}/movie/${movie.slug}`,
      siteName: SITE_NAME,
      images: movie.posterUrl ? [
        {
          url: movie.posterUrl,
          width: 500,
          height: 750,
          alt: `${movie.title} Poster`,
        },
      ] : [],
    },
    twitter: {
      card: "summary_large_image",
      title,
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
 */
export function generateHomeMetadata(): Metadata {
  const currentYear = new Date().getFullYear();
  const keywords = [
    "download movies free",
    "free movie download",
    "HD movies download",
    "latest movies download",
    `${currentYear} movies`,
    "480p movies",
    "720p movies",
    "1080p movies",
    "dual audio movies",
    "Hindi movies download",
    "English movies download",
    "Hollywood movies",
    "Bollywood movies",
    "free HD movies",
    "movie download site",
  ].join(", ");

  return {
    title: `${SITE_NAME} - Download Movies Free HD 480p 720p 1080p`,
    description: `Download latest movies for free in HD quality. Get 480p, 720p, 1080p movies with fast download links. Best free movie download site ${currentYear}.`,
    keywords,
    openGraph: {
      title: `${SITE_NAME} - Download Movies Free HD`,
      description: `Download latest movies for free in HD quality. 480p, 720p, 1080p available.`,
      type: "website",
      url: SITE_URL,
      siteName: SITE_NAME,
      images: [
        {
          url: `${SITE_URL}/icon-512.png`,
          width: 1200,
          height: 630,
          alt: `${SITE_NAME} - Free Movie Downloads`,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title: `${SITE_NAME} - Download Movies Free HD`,
      description: `Download latest movies for free in HD quality.`,
      images: [`${SITE_URL}/icon-512.png`],
    },
    alternates: {
      canonical: SITE_URL,
    },
  };
}

/**
 * Generate metadata for year page
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
  ].join(", ");

  return {
    title: `${year} Movies - Download Free HD Movies | ${SITE_NAME}`,
    description: `Browse and download ${year} movies for free in HD quality (480p, 720p, 1080p). Find the best movies released in ${year}.`,
    keywords,
    openGraph: {
      title: `${year} Movies - Download Free HD Movies | ${SITE_NAME}`,
      description: `Browse and download ${year} movies for free in HD quality (480p, 720p, 1080p).`,
      type: "website",
      url: `${SITE_URL}/years/${year}`,
      siteName: SITE_NAME,
      images: [
        {
          url: `${SITE_URL}/icon-512.png`,
          width: 1200,
          height: 630,
          alt: `${year} Movies - ${SITE_NAME}`,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title: `${year} Movies - Download Free HD Movies`,
      description: `Browse and download ${year} movies for free in HD quality.`,
      images: [`${SITE_URL}/icon-512.png`],
    },
    alternates: {
      canonical: `${SITE_URL}/years/${year}`,
    },
  };
}

/**
 * Generate metadata for trending page
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
  ].join(", ");

  return {
    title: `Trending Movies - Download Popular Movies Free | ${SITE_NAME}`,
    description: `Download trending and most popular movies for free in HD quality. Get the hottest movies everyone is watching.`,
    keywords,
    openGraph: {
      title: `Trending Movies - Download Popular Movies Free | ${SITE_NAME}`,
      description: `Download trending and most popular movies for free in HD quality.`,
      type: "website",
      url: `${SITE_URL}/trending`,
      siteName: SITE_NAME,
      images: [
        {
          url: `${SITE_URL}/icon-512.png`,
          width: 1200,
          height: 630,
          alt: `Trending Movies - ${SITE_NAME}`,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title: `Trending Movies - Download Popular Movies Free`,
      description: `Download trending and most popular movies for free in HD quality.`,
      images: [`${SITE_URL}/icon-512.png`],
    },
    alternates: {
      canonical: `${SITE_URL}/trending`,
    },
  };
}

/**
 * Generate metadata for movies listing page
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
  ].join(", ");

  return {
    title: `All Movies - Download Free HD Movies | ${SITE_NAME}`,
    description: `Browse our complete collection of movies. Download any movie for free in HD quality (480p, 720p, 1080p).`,
    keywords,
    openGraph: {
      title: `All Movies - Download Free HD Movies | ${SITE_NAME}`,
      description: `Browse our complete collection of movies. Download any movie for free in HD quality.`,
      type: "website",
      url: `${SITE_URL}/movies`,
      siteName: SITE_NAME,
      images: [
        {
          url: `${SITE_URL}/icon-512.png`,
          width: 1200,
          height: 630,
          alt: `All Movies - ${SITE_NAME}`,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title: `All Movies - Download Free HD Movies`,
      description: `Browse our complete collection of movies. Download any movie for free in HD quality.`,
      images: [`${SITE_URL}/icon-512.png`],
    },
    alternates: {
      canonical: `${SITE_URL}/movies`,
    },
  };
}

/**
 * Generate metadata for genre page
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
  ].join(", ");

  return {
    title: `${capitalizedGenre} Movies - Download Free HD Movies | ${SITE_NAME}`,
    description: `Browse and download ${genre} movies for free in HD quality (480p, 720p, 1080p). Find the best ${genre} movies.`,
    keywords,
    openGraph: {
      title: `${capitalizedGenre} Movies - Download Free HD Movies | ${SITE_NAME}`,
      description: `Browse and download ${genre} movies for free in HD quality (480p, 720p, 1080p).`,
      type: "website",
      url: `${SITE_URL}/genres/${genre.toLowerCase()}`,
      siteName: SITE_NAME,
      images: [
        {
          url: `${SITE_URL}/icon-512.png`,
          width: 1200,
          height: 630,
          alt: `${capitalizedGenre} Movies - ${SITE_NAME}`,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title: `${capitalizedGenre} Movies - Download Free HD Movies`,
      description: `Browse and download ${genre} movies for free in HD quality.`,
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
  ].join(", ");

  return {
    title: `Popular Movies - Most Watched Movies | ${SITE_NAME}`,
    description: `Download the most popular and watched movies for free in HD quality. Discover fan favorites and top-rated films.`,
    keywords,
    openGraph: {
      title: `Popular Movies - Most Watched Movies | ${SITE_NAME}`,
      description: `Download the most popular and watched movies for free in HD quality.`,
      type: "website",
      url: `${SITE_URL}/popular`,
      siteName: SITE_NAME,
      images: [
        {
          url: `${SITE_URL}/icon-512.png`,
          width: 1200,
          height: 630,
          alt: `Popular Movies - ${SITE_NAME}`,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title: `Popular Movies - Most Watched Movies`,
      description: `Download the most popular and watched movies for free in HD quality.`,
      images: [`${SITE_URL}/icon-512.png`],
    },
    alternates: {
      canonical: `${SITE_URL}/popular`,
    },
  };
}

/**
 * Generate default metadata
 */
export function generateDefaultMetadata(): Metadata {
  const currentYear = new Date().getFullYear();
  return {
    metadataBase: new URL(SITE_URL),
    title: {
      default: `${SITE_NAME} - Free Movie Downloads`,
      template: `%s | ${SITE_NAME}`,
    },
    description: `Discover and download movies for free with ${SITE_NAME}. HD quality 480p, 720p, 1080p available.`,
    keywords: `free movies, download movies, HD movies, ${currentYear} movies, movie download site`,
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
  };
}
