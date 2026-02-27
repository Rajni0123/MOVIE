import { Header } from "@/components/shared/Header";
import { Footer } from "@/components/shared/Footer";
import { MobileNav } from "@/components/shared/MobileNav";
import { MovieCard } from "@/components/public/MovieCard";
import { NotificationBanner } from "@/components/public/NotificationBanner";
import { BannerAd } from "@/components/public/AdDisplay";
import prisma from "@/lib/db/prisma";
import { generateHomeMetadata } from "@/lib/seo/meta-generator";
import { generateWebsiteSchema, generateOrganizationSchema, schemaToScript } from "@/lib/seo/schema-generator";
import { Film } from "lucide-react";
import Link from "next/link";
import Script from "next/script";

export const dynamic = "force-dynamic";
export const revalidate = 0; // Always fetch fresh data
export const metadata = generateHomeMetadata();

async function getLatestMovies() {
  try {
    return await prisma.movie.findMany({
      where: { 
        status: "PUBLISHED",
        isActive: true,
      },
      orderBy: { createdAt: "desc" },
      take: 18,
    });
  } catch (error) {
    console.error("Error fetching latest movies:", error);
    return [];
  }
}

async function getPopularMovies() {
  try {
    // Get movies with high engagement OR recently released
    const movies = await prisma.movie.findMany({
      where: { 
        status: "PUBLISHED",
        isActive: true,
      },
      orderBy: [
        { viewCount: "desc" },
        { shareCount: "desc" },
        { releaseDate: "desc" },
        { rating: "desc" },
      ],
      take: 50, // Get more to calculate scores
    });

    // Calculate popularity score
    const now = new Date();
    const scoredMovies = movies.map((movie) => {
      const engagement = (movie.viewCount || 0) + (movie.shareCount || 0) * 5;
      
      // Recency bonus: movies released in last 30 days get extra points
      let recencyBonus = 0;
      if (movie.releaseDate) {
        const daysSinceRelease = Math.floor(
          (now.getTime() - new Date(movie.releaseDate).getTime()) / (1000 * 60 * 60 * 24)
        );
        if (daysSinceRelease <= 7) recencyBonus = 100; // Released this week
        else if (daysSinceRelease <= 30) recencyBonus = 50; // Released this month
        else if (daysSinceRelease <= 90) recencyBonus = 25; // Released in 3 months
      }
      
      // Rating bonus
      const ratingBonus = (movie.rating || 0) * 5;
      
      const score = engagement + recencyBonus + ratingBonus;
      
      return { ...movie, popularityScore: score };
    });

    // Sort by popularity score and return top 6
    return scoredMovies
      .sort((a, b) => b.popularityScore - a.popularityScore)
      .slice(0, 6);
  } catch (error) {
    console.error("Error fetching popular movies:", error);
    return [];
  }
}

export default async function HomePage() {
  let latestMovies: Awaited<ReturnType<typeof getLatestMovies>> = [];
  let popularMovies: Awaited<ReturnType<typeof getPopularMovies>> = [];

  try {
    [latestMovies, popularMovies] = await Promise.all([
      getLatestMovies(),
      getPopularMovies(),
    ]);
    
    // If no popular movies but we have latest, use latest for popular too
    if (popularMovies.length === 0 && latestMovies.length > 0) {
      popularMovies = latestMovies.slice(0, 6).map(m => ({ ...m, popularityScore: 0 }));
    }
  } catch (error) {
    console.error("Error loading homepage:", error);
    // Try to get movies with a simpler query as fallback
    try {
      latestMovies = await prisma.movie.findMany({
        where: { isActive: true },
        orderBy: { createdAt: "desc" },
        take: 18,
      });
      if (latestMovies.length > 0 && popularMovies.length === 0) {
        popularMovies = latestMovies.map(m => ({ ...m, popularityScore: 0 }));
      }
    } catch (fallbackError) {
      console.error("Fallback query also failed:", fallbackError);
    }
  }

  // Generate schema for SEO
  const websiteSchema = generateWebsiteSchema();
  const orgSchema = generateOrganizationSchema();

  return (
    <>
      {/* JSON-LD Schema for SEO */}
      <Script
        id="website-schema"
        type="application/ld+json"
        strategy="beforeInteractive"
        dangerouslySetInnerHTML={{ __html: schemaToScript(websiteSchema) }}
      />
      <Script
        id="org-schema"
        type="application/ld+json"
        strategy="beforeInteractive"
        dangerouslySetInnerHTML={{ __html: schemaToScript(orgSchema) }}
      />

      <div className="min-h-screen bg-background">
        <Header />

        {/* Notification Banner */}
        <div className="container mt-2 md:mt-4">
          <NotificationBanner />
        </div>

      {/* Header Banner Ad - Desktop Only */}
      <div className="container mt-4 hidden md:block">
        <BannerAd position="header" className="mx-auto" desktopOnly={true} />
      </div>

      {/* Latest Movies */}
      <section className="container py-6 md:py-12">
        <div className="mb-4 flex items-center justify-between md:mb-6">
          <div className="flex items-center gap-2">
            <div className="h-6 w-1 rounded-full bg-gradient-to-b from-blue-500 to-purple-600 md:h-8" />
            <h2 className="text-lg font-bold md:text-2xl">Latest Movies</h2>
            {latestMovies.length > 0 && (
              <span className="text-sm text-muted-foreground">({latestMovies.length})</span>
            )}
          </div>
          {latestMovies.length > 0 && (
            <Link
              href="/movies"
              className="text-sm font-medium text-primary transition-colors hover:text-primary/80"
            >
              View All →
            </Link>
          )}
        </div>
        {latestMovies.length > 0 ? (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 md:gap-4 lg:grid-cols-6">
            {latestMovies.map((movie) => (
              <MovieCard key={movie.id} movie={movie} />
            ))}
          </div>
        ) : (
          <div className="flex h-64 flex-col items-center justify-center rounded-lg border border-dashed bg-muted/20">
            <Film className="h-16 w-16 text-muted-foreground mb-4" />
            <p className="text-lg font-medium text-muted-foreground mb-2">No movies yet</p>
            <p className="text-sm text-muted-foreground">Check back soon for new releases!</p>
            <Link
              href="/admin/movies/add"
              className="mt-4 text-sm text-primary hover:underline"
            >
              Add Movies →
            </Link>
          </div>
        )}
      </section>

      {/* In-Content Banner Ad - Desktop Only */}
      <div className="container py-4 hidden md:block">
        <BannerAd position="in-content" className="mx-auto" desktopOnly={true} />
      </div>

      {/* Popular Movies */}
      {popularMovies.length > 0 && (
        <section className="bg-muted/50 py-6 md:py-12">
          <div className="container">
            <div className="mb-4 flex items-center justify-between md:mb-6">
              <div className="flex items-center gap-2">
                <div className="h-6 w-1 rounded-full bg-gradient-to-b from-orange-500 to-red-600 md:h-8" />
                <h2 className="text-lg font-bold md:text-2xl">Popular Movies</h2>
              </div>
              <Link
                href="/movies?sort=popular"
                className="text-sm font-medium text-orange-500 transition-colors hover:text-orange-400"
              >
                View All →
              </Link>
            </div>
            <div className="grid grid-cols-3 gap-2 sm:grid-cols-3 md:grid-cols-4 md:gap-4 lg:grid-cols-6">
              {popularMovies.map((movie) => (
                <MovieCard key={movie.id} movie={movie} />
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Footer Banner Ad - Desktop Only */}
      <div className="container py-4 hidden md:block">
        <BannerAd position="footer" className="mx-auto" desktopOnly={true} />
      </div>

      <div className="hidden md:block">
        <Footer />
      </div>
      <MobileNav />
      {/* Bottom padding for mobile nav */}
      <div className="h-16 md:hidden" suppressHydrationWarning />
    </div>
    </>
  );
}
