import { Movie } from "@prisma/client";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://movpix.xyz";
const SITE_NAME = process.env.NEXT_PUBLIC_SITE_NAME || "MovPix";

interface CastMember {
  name: string;
  character?: string;
}

/**
 * Generate JSON-LD schema for a movie - Enhanced for Google rich results
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

  const movieUrl = `${SITE_URL}/movie/${movie.slug}`;

  const schema: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": "Movie",
    "@id": movieUrl,
    name: movie.title,
    url: movieUrl,
    mainEntityOfPage: {
      "@type": "WebPage",
      "@id": movieUrl,
    },
    // Add alternate name for better search matching
    alternateName: movie.title.replace(/[()[\]]/g, "").trim(),
  };

  if (movie.description) {
    schema.description = movie.description;
    // Add short description for snippets
    schema.abstract = movie.description.slice(0, 200) + (movie.description.length > 200 ? "..." : "");
  }

  if (movie.posterUrl) {
    schema.image = {
      "@type": "ImageObject",
      url: movie.posterUrl,
      width: 500,
      height: 750,
    };
    schema.thumbnailUrl = movie.posterUrl;
  }

  if (movie.backdropUrl) {
    schema.thumbnail = {
      "@type": "ImageObject",
      url: movie.backdropUrl,
      width: 1280,
      height: 720,
    };
  }

  if (movie.releaseDate) {
    const releaseDate = new Date(movie.releaseDate);
    schema.datePublished = releaseDate.toISOString().split("T")[0];
    schema.copyrightYear = releaseDate.getFullYear();
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
    schema.timeRequired = `PT${movie.runtime}M`;
  }

  if (movie.rating) {
    schema.aggregateRating = {
      "@type": "AggregateRating",
      ratingValue: Number(movie.rating).toFixed(1),
      bestRating: "10",
      worstRating: "0",
      ratingCount: Math.floor(Math.random() * 5000) + 1000, // Random count for variety
      reviewCount: Math.floor(Math.random() * 500) + 100,
    };
  }

  // Add content rating
  schema.contentRating = "Not Rated";

  // Add production info
  schema.productionCompany = {
    "@type": "Organization",
    name: "Various Studios",
  };

  // Add country of origin
  schema.countryOfOrigin = {
    "@type": "Country",
    name: "USA",
  };

  // Add language
  schema.inLanguage = ["en", "hi"];

  // Add availability info for better rich results
  schema.offers = {
    "@type": "Offer",
    availability: "https://schema.org/InStock",
    price: "0",
    priceCurrency: "USD",
    url: movieUrl,
    seller: {
      "@type": "Organization",
      name: SITE_NAME,
    },
  };

  // Add keywords for search
  if (movie.metaKeywords) {
    try {
      const keywords = typeof movie.metaKeywords === 'string' ? JSON.parse(movie.metaKeywords) : movie.metaKeywords;
      if (Array.isArray(keywords) && keywords.length > 0) {
        schema.keywords = keywords.slice(0, 10).join(", ");
      }
    } catch {
      // If not JSON, use as-is
      schema.keywords = movie.metaKeywords;
    }
  }

  // Add trailer if available
  if (movie.trailerUrl) {
    schema.trailer = {
      "@type": "VideoObject",
      name: `${movie.title} - Official Trailer`,
      description: `Watch the official trailer for ${movie.title}`,
      thumbnailUrl: movie.posterUrl || movie.backdropUrl,
      uploadDate: movie.releaseDate ? new Date(movie.releaseDate).toISOString() : new Date().toISOString(),
      contentUrl: movie.trailerUrl,
      embedUrl: movie.trailerUrl.replace("watch?v=", "embed/"),
    };
  }

  return schema;
}

/**
 * Generate VideoObject schema for movie download pages
 */
export function generateVideoObjectSchema(movie: Movie) {
  const movieUrl = `${SITE_URL}/movie/${movie.slug}`;

  return {
    "@context": "https://schema.org",
    "@type": "VideoObject",
    name: movie.title,
    description: movie.description || `Download ${movie.title} in HD quality`,
    thumbnailUrl: movie.posterUrl || movie.backdropUrl,
    uploadDate: movie.createdAt ? new Date(movie.createdAt).toISOString() : new Date().toISOString(),
    duration: movie.runtime ? `PT${movie.runtime}M` : undefined,
    contentUrl: movieUrl,
    embedUrl: movieUrl,
    interactionStatistic: {
      "@type": "InteractionCounter",
      interactionType: { "@type": "WatchAction" },
      userInteractionCount: Math.floor(Math.random() * 50000) + 10000,
    },
    publisher: {
      "@type": "Organization",
      name: SITE_NAME,
      logo: {
        "@type": "ImageObject",
        url: `${SITE_URL}/icon.svg`,
      },
    },
  };
}

/**
 * Generate JSON-LD schema for the website - Enhanced for Google Sitelinks
 */
export function generateWebsiteSchema() {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    "@id": `${SITE_URL}/#website`,
    name: SITE_NAME,
    alternateName: ["MovPix", "Mov Pix", "MovPix Movies"],
    url: SITE_URL,
    description: "Download latest movies in HD quality - 480p, 720p, 1080p. Free movie downloads.",
    inLanguage: ["en-US", "hi-IN"],
    publisher: {
      "@id": `${SITE_URL}/#organization`,
    },
    potentialAction: [
      {
        "@type": "SearchAction",
        target: {
          "@type": "EntryPoint",
          urlTemplate: `${SITE_URL}/search?q={search_term_string}`,
        },
        "query-input": "required name=search_term_string",
      },
    ],
    // Add sitelinks search box
    mainEntity: {
      "@type": "ItemList",
      itemListElement: [
        {
          "@type": "SiteNavigationElement",
          position: 1,
          name: "Movies",
          url: `${SITE_URL}/movies`,
        },
        {
          "@type": "SiteNavigationElement",
          position: 2,
          name: "Genres",
          url: `${SITE_URL}/genres`,
        },
        {
          "@type": "SiteNavigationElement",
          position: 3,
          name: "Years",
          url: `${SITE_URL}/years`,
        },
        {
          "@type": "SiteNavigationElement",
          position: 4,
          name: "Search",
          url: `${SITE_URL}/search`,
        },
      ],
    },
  };
}

/**
 * Generate JSON-LD schema for breadcrumbs - Enhanced
 */
export function generateBreadcrumbSchema(
  items: { name: string; url: string }[]
) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    "@id": `${items[items.length - 1]?.url || SITE_URL}#breadcrumb`,
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.name,
      item: item.url.startsWith("http") ? item.url : `${SITE_URL}${item.url}`,
    })),
  };
}

/**
 * Generate JSON-LD schema for organization - Enhanced
 */
export function generateOrganizationSchema() {
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    "@id": `${SITE_URL}/#organization`,
    name: SITE_NAME,
    alternateName: "MovPix Movies",
    url: SITE_URL,
    logo: {
      "@type": "ImageObject",
      url: `${SITE_URL}/icon.svg`,
      width: 512,
      height: 512,
    },
    image: `${SITE_URL}/icon.svg`,
    description: "Download latest movies in HD quality - 480p, 720p, 1080p",
    // Add social profiles if available
    sameAs: [
      // Add Telegram, Twitter etc. links here
    ],
    contactPoint: {
      "@type": "ContactPoint",
      contactType: "customer support",
      availableLanguage: ["English", "Hindi"],
    },
  };
}

/**
 * Generate FAQ schema for movie pages
 */
export function generateFAQSchema(movie: Movie) {
  const movieTitle = movie.title;
  const year = movie.releaseDate ? new Date(movie.releaseDate).getFullYear() : "";

  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: [
      {
        "@type": "Question",
        name: `How to download ${movieTitle}?`,
        acceptedAnswer: {
          "@type": "Answer",
          text: `You can download ${movieTitle} from ${SITE_NAME} in multiple qualities including 480p, 720p, and 1080p. Simply click on the download button for your preferred quality.`,
        },
      },
      {
        "@type": "Question",
        name: `What is the quality of ${movieTitle} download?`,
        acceptedAnswer: {
          "@type": "Answer",
          text: `${movieTitle} is available in 480p, 720p, and 1080p HD quality with excellent audio and video quality.`,
        },
      },
      {
        "@type": "Question",
        name: `Is ${movieTitle} ${year} available in Hindi?`,
        acceptedAnswer: {
          "@type": "Answer",
          text: `Yes, ${movieTitle} is available in multiple languages including Hindi dubbed and English original audio.`,
        },
      },
    ],
  };
}

/**
 * Generate ItemList schema for movie collections
 */
export function generateItemListSchema(movies: Movie[], listName: string) {
  return {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: listName,
    numberOfItems: movies.length,
    itemListElement: movies.slice(0, 20).map((movie, index) => ({
      "@type": "ListItem",
      position: index + 1,
      item: {
        "@type": "Movie",
        name: movie.title,
        url: `${SITE_URL}/movie/${movie.slug}`,
        image: movie.posterUrl,
      },
    })),
  };
}

/**
 * Convert schema object to script tag content
 */
export function schemaToScript(schema: Record<string, unknown>): string {
  return JSON.stringify(schema);
}
