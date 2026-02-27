import { Movie } from "@prisma/client";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";

interface CastMember {
  name: string;
  character?: string;
}

/**
 * Generate JSON-LD schema for a movie
 */
export function generateMovieSchema(movie: Movie) {
  const year = movie.releaseDate ? new Date(movie.releaseDate).getFullYear() : undefined;
  
  // Parse JSON strings from SQLite
  let genres: string[] = [];
  let cast: CastMember[] = [];
  
  try {
    genres = typeof movie.genres === 'string' ? JSON.parse(movie.genres) : (movie.genres || []);
  } catch { genres = []; }
  
  try {
    cast = typeof movie.cast === 'string' ? JSON.parse(movie.cast) : (movie.cast || []);
  } catch { cast = []; }

  const schema: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": "Movie",
    name: movie.title,
    url: `${SITE_URL}/movie/${movie.slug}`,
  };

  if (movie.description) {
    schema.description = movie.description;
  }

  if (movie.posterUrl) {
    schema.image = movie.posterUrl;
  }

  if (movie.releaseDate) {
    schema.datePublished = new Date(movie.releaseDate).toISOString().split("T")[0];
  }

  if (movie.director) {
    schema.director = {
      "@type": "Person",
      name: movie.director,
    };
  }

  if (genres.length > 0) {
    schema.genre = genres;
  }

  if (cast.length > 0) {
    schema.actor = cast.slice(0, 10).map((member) => ({
      "@type": "Person",
      name: member.name,
    }));
  }

  if (movie.runtime) {
    schema.duration = `PT${movie.runtime}M`;
  }

  if (movie.rating) {
    schema.aggregateRating = {
      "@type": "AggregateRating",
      ratingValue: Number(movie.rating).toFixed(1),
      bestRating: "10",
      worstRating: "0",
      ratingCount: 1000, // Placeholder - should be actual count if available
    };
  }

  return schema;
}

/**
 * Generate JSON-LD schema for the website
 */
export function generateWebsiteSchema() {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: process.env.NEXT_PUBLIC_SITE_NAME || "MovPix",
    url: SITE_URL,
    potentialAction: {
      "@type": "SearchAction",
      target: {
        "@type": "EntryPoint",
        urlTemplate: `${SITE_URL}/search?q={search_term_string}`,
      },
      "query-input": "required name=search_term_string",
    },
  };
}

/**
 * Generate JSON-LD schema for breadcrumbs
 */
export function generateBreadcrumbSchema(
  items: { name: string; url: string }[]
) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.name,
      item: item.url,
    })),
  };
}

/**
 * Generate JSON-LD schema for organization
 */
export function generateOrganizationSchema() {
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: process.env.NEXT_PUBLIC_SITE_NAME || "MovPix",
    url: SITE_URL,
    logo: `${SITE_URL}/logo.png`,
  };
}

/**
 * Convert schema object to script tag content
 */
export function schemaToScript(schema: Record<string, unknown>): string {
  return JSON.stringify(schema);
}
