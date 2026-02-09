export interface ScrapingSourceConfig {
  name: string;
  type: "api" | "scraper";
  baseUrl: string;
  apiKey?: string;
  rateLimit?: number; // requests per minute
  endpoints?: Record<string, string>;
}

export const TMDB_CONFIG: ScrapingSourceConfig = {
  name: "TMDB",
  type: "api",
  baseUrl: "https://api.themoviedb.org/3",
  apiKey: process.env.TMDB_API_KEY,
  rateLimit: 40, // 40 requests per 10 seconds
  endpoints: {
    popular: "/movie/popular",
    topRated: "/movie/top_rated",
    nowPlaying: "/movie/now_playing",
    upcoming: "/movie/upcoming",
    details: "/movie/{id}",
    credits: "/movie/{id}/credits",
    images: "/movie/{id}/images",
    search: "/search/movie",
  },
};

export const TMDB_IMAGE_BASE_URL = "https://image.tmdb.org/t/p";

export const TMDB_IMAGE_SIZES = {
  poster: {
    small: "w185",
    medium: "w342",
    large: "w500",
    original: "original",
  },
  backdrop: {
    small: "w300",
    medium: "w780",
    large: "w1280",
    original: "original",
  },
  profile: {
    small: "w45",
    medium: "w185",
    large: "h632",
    original: "original",
  },
};

/**
 * Build TMDB image URL
 */
export function buildTMDBImageUrl(
  path: string | null | undefined,
  type: "poster" | "backdrop" | "profile" = "poster",
  size: "small" | "medium" | "large" | "original" = "large"
): string | null {
  if (!path) return null;
  return `${TMDB_IMAGE_BASE_URL}/${TMDB_IMAGE_SIZES[type][size]}${path}`;
}

/**
 * Build TMDB API URL
 */
export function buildTMDBApiUrl(
  endpoint: string,
  params: Record<string, string> = {}
): string {
  const url = new URL(`${TMDB_CONFIG.baseUrl}${endpoint}`);
  url.searchParams.set("api_key", TMDB_CONFIG.apiKey || "");
  
  Object.entries(params).forEach(([key, value]) => {
    url.searchParams.set(key, value);
  });

  return url.toString();
}
