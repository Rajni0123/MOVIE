import { MetadataRoute } from "next";
import prisma from "@/lib/db/prisma";

export const dynamic = "force-dynamic";
export const revalidate = 3600; // Revalidate every hour

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://movpix.xyz";

// Genre list for sitemap
const GENRES = [
  "action", "comedy", "drama", "horror", "romance", "thriller",
  "sci-fi", "fantasy", "animation", "adventure", "crime",
  "documentary", "family", "mystery", "war", "western"
];

// Generate years from current to 1980
function getYears(): number[] {
  const currentYear = new Date().getFullYear();
  const years: number[] = [];
  for (let y = currentYear; y >= 1980; y--) {
    years.push(y);
  }
  return years;
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();

  // Get all published movies - prioritize recent and high-rated
  const movies = await prisma.movie.findMany({
    where: {
      status: "PUBLISHED",
      isActive: true,
    },
    select: {
      slug: true,
      updatedAt: true,
      createdAt: true,
      rating: true,
      isFeatured: true,
    },
    orderBy: [
      { isFeatured: "desc" },
      { createdAt: "desc" },
    ],
  });

  // Static pages - HIGH PRIORITY
  const staticPages: MetadataRoute.Sitemap = [
    {
      url: SITE_URL,
      lastModified: now,
      changeFrequency: "hourly",
      priority: 1.0,
    },
    {
      url: `${SITE_URL}/movies`,
      lastModified: now,
      changeFrequency: "hourly",
      priority: 0.95,
    },
    {
      url: `${SITE_URL}/genres`,
      lastModified: now,
      changeFrequency: "daily",
      priority: 0.9,
    },
    {
      url: `${SITE_URL}/years`,
      lastModified: now,
      changeFrequency: "daily",
      priority: 0.9,
    },
    {
      url: `${SITE_URL}/search`,
      lastModified: now,
      changeFrequency: "daily",
      priority: 0.8,
    },
  ];

  // Genre pages
  const genrePages: MetadataRoute.Sitemap = GENRES.map((genre) => ({
    url: `${SITE_URL}/genres/${genre}`,
    lastModified: now,
    changeFrequency: "daily" as const,
    priority: 0.85,
  }));

  // Year pages (last 10 years have higher priority)
  const currentYear = new Date().getFullYear();
  const yearPages: MetadataRoute.Sitemap = getYears().slice(0, 20).map((year) => ({
    url: `${SITE_URL}/years/${year}`,
    lastModified: now,
    changeFrequency: year >= currentYear - 2 ? "daily" as const : "weekly" as const,
    priority: year >= currentYear - 2 ? 0.85 : 0.7,
  }));

  // Movie pages - Featured and recent movies get higher priority
  const moviePages: MetadataRoute.Sitemap = movies.map((movie) => {
    const isRecent = movie.createdAt > new Date(Date.now() - 7 * 24 * 60 * 60 * 1000); // Last 7 days
    const isHighRated = movie.rating && Number(movie.rating) >= 7;

    let priority = 0.8;
    if (movie.isFeatured) priority = 0.95;
    else if (isRecent) priority = 0.9;
    else if (isHighRated) priority = 0.85;

    return {
      url: `${SITE_URL}/movie/${movie.slug}`,
      lastModified: movie.updatedAt,
      changeFrequency: isRecent ? "daily" as const : "weekly" as const,
      priority,
    };
  });

  return [...staticPages, ...genrePages, ...yearPages, ...moviePages];
}
