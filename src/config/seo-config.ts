export const SEO_CONFIG = {
  siteName: process.env.NEXT_PUBLIC_SITE_NAME || "MovPix",
  siteUrl: process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000",
  
  // Default meta tags
  defaultTitle: "MovPix - Download Movies Free",
  defaultDescription: "Discover and download the latest movies for free. Browse our collection of movies with high-quality download links.",
  
  // Open Graph defaults
  ogType: "website",
  ogImage: "/og-image.jpg",
  
  // Twitter defaults
  twitterCard: "summary_large_image",
  twitterSite: "@moviehub",
  
  // Meta title templates
  titleTemplates: {
    movie: "Download {title} ({year}) - Full Movie | {siteName}",
    genre: "{genre} Movies - Download {genre} Films | {siteName}",
    search: "Search Results for '{query}' | {siteName}",
  },
  
  // Description templates
  descriptionTemplates: {
    movie: "Download {title} for free. {description}",
    genre: "Browse our collection of {genre} movies. Download the best {genre} films for free.",
  },
  
  // Indexing API settings
  indexing: {
    google: {
      enabled: !!process.env.GOOGLE_INDEXING_SERVICE_ACCOUNT_JSON,
      batchSize: 100, // Max URLs per batch
    },
    indexNow: {
      enabled: !!process.env.INDEXNOW_API_KEY,
      apiKey: process.env.INDEXNOW_API_KEY,
      keyLocation: "/indexnow-key.txt",
    },
  },
  
  // Sitemap settings
  sitemap: {
    changeFrequency: {
      home: "daily",
      movies: "daily",
      movie: "weekly",
      genre: "weekly",
    },
    priority: {
      home: 1.0,
      movies: 0.9,
      movie: 0.7,
      genre: 0.8,
    },
  },
};

/**
 * Generate meta title from template
 */
export function generateTitle(
  template: keyof typeof SEO_CONFIG.titleTemplates,
  vars: Record<string, string | number>
): string {
  let title = SEO_CONFIG.titleTemplates[template];
  
  Object.entries(vars).forEach(([key, value]) => {
    title = title.replace(`{${key}}`, String(value));
  });
  
  title = title.replace("{siteName}", SEO_CONFIG.siteName);
  
  return title;
}

/**
 * Generate meta description from template
 */
export function generateDescription(
  template: keyof typeof SEO_CONFIG.descriptionTemplates,
  vars: Record<string, string>
): string {
  let description = SEO_CONFIG.descriptionTemplates[template];
  
  Object.entries(vars).forEach(([key, value]) => {
    description = description.replace(new RegExp(`{${key}}`, "g"), value);
  });
  
  // Truncate to 155 characters
  if (description.length > 155) {
    description = description.substring(0, 152) + "...";
  }
  
  return description;
}
