import prisma from "@/lib/db/prisma";
import { Header } from "@/components/shared/Header";
import { Footer } from "@/components/shared/Footer";
import { MobileNav } from "@/components/shared/MobileNav";
import { MovieCard } from "@/components/public/MovieCard";
import { BannerAd } from "@/components/public/AdDisplay";
import { generatePopularMetadata } from "@/lib/seo/meta-generator";
import { Flame, Clock, Eye } from "lucide-react";

export const dynamic = "force-dynamic";

export const metadata = generatePopularMetadata();

async function getPopularMovies() {
  const now = new Date();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

  // Get movies released in last 30 days
  const recentMovies = await prisma.movie.findMany({
    where: { 
      status: "PUBLISHED",
      releaseDate: {
        gte: thirtyDaysAgo,
      },
    },
    orderBy: [
      { viewCount: "desc" },
      { releaseDate: "desc" },
    ],
    take: 24,
  });

  // Get most viewed movies (excluding recent)
  const recentIds = recentMovies.map(m => m.id);

  const mostViewedMovies = await prisma.movie.findMany({
    where: { 
      status: "PUBLISHED",
      id: { notIn: recentIds },
    },
    orderBy: [
      { viewCount: "desc" },
      { shareCount: "desc" },
      { rating: "desc" },
    ],
    take: 24,
  });

  return {
    featured: [] as typeof recentMovies, // Will be enabled after Prisma client regeneration
    recent: recentMovies,
    mostViewed: mostViewedMovies,
  };
}

export default async function PopularPage() {
  const { featured, recent, mostViewed } = await getPopularMovies();

  // Combine all movies for display
  const allMovies = [...featured, ...recent, ...mostViewed];
  const uniqueMovies = allMovies.filter((movie, index, self) => 
    index === self.findIndex(m => m.id === movie.id)
  ).slice(0, 48);

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <Header />

      <main className="flex-1">
        <div className="container py-6 md:py-12">
          {/* Page Title */}
          <div className="mb-6 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-orange-500 to-red-600">
              <Flame className="h-5 w-5 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold md:text-3xl">Popular Movies</h1>
              <p className="text-sm text-muted-foreground">
                Latest releases & most watched films
              </p>
            </div>
          </div>

          {/* Header Ad - Desktop Only */}
          <div className="mb-6 hidden md:block">
            <BannerAd position="header" className="mx-auto" desktopOnly={true} />
          </div>

          {/* Stats Bar */}
          <div className="mb-6 flex flex-wrap gap-3">
            <div className="flex items-center gap-2 rounded-full bg-orange-500/10 px-3 py-1.5 text-sm text-orange-600">
              <Clock className="h-4 w-4" />
              <span>Last 30 Days</span>
            </div>
            <div className="flex items-center gap-2 rounded-full bg-blue-500/10 px-3 py-1.5 text-sm text-blue-600">
              <Eye className="h-4 w-4" />
              <span>Most Viewed</span>
            </div>
            {featured.length > 0 && (
              <div className="flex items-center gap-2 rounded-full bg-amber-500/10 px-3 py-1.5 text-sm text-amber-600">
                <Flame className="h-4 w-4" />
                <span>{featured.length} Featured</span>
              </div>
            )}
          </div>

          {/* Featured Section (if any) */}
          {featured.length > 0 && (
            <section className="mb-8">
              <div className="mb-4 flex items-center gap-2">
                <div className="h-6 w-1 rounded-full bg-gradient-to-b from-amber-500 to-orange-600" />
                <h2 className="text-lg font-bold md:text-xl">⭐ Editor&apos;s Choice</h2>
              </div>
              <div className="grid grid-cols-3 gap-2 sm:grid-cols-3 md:grid-cols-4 md:gap-4 lg:grid-cols-6">
                {featured.slice(0, 12).map((movie) => (
                  <MovieCard key={movie.id} movie={movie} />
                ))}
              </div>
            </section>
          )}

          {/* Recent Releases Section */}
          {recent.length > 0 && (
            <section className="mb-8">
              <div className="mb-4 flex items-center gap-2">
                <div className="h-6 w-1 rounded-full bg-gradient-to-b from-green-500 to-emerald-600" />
                <h2 className="text-lg font-bold md:text-xl">🆕 New Releases (Last 30 Days)</h2>
              </div>
              <div className="grid grid-cols-3 gap-2 sm:grid-cols-3 md:grid-cols-4 md:gap-4 lg:grid-cols-6">
                {recent.slice(0, 12).map((movie) => (
                  <MovieCard key={movie.id} movie={movie} />
                ))}
              </div>
            </section>
          )}

          {/* In-Content Ad - Desktop Only */}
          <div className="mb-8 hidden md:block">
            <BannerAd position="in-content" className="mx-auto" desktopOnly={true} />
          </div>

          {/* Most Viewed Section */}
          {mostViewed.length > 0 && (
            <section className="mb-8">
              <div className="mb-4 flex items-center gap-2">
                <div className="h-6 w-1 rounded-full bg-gradient-to-b from-blue-500 to-purple-600" />
                <h2 className="text-lg font-bold md:text-xl">🔥 Most Viewed</h2>
              </div>
              <div className="grid grid-cols-3 gap-2 sm:grid-cols-3 md:grid-cols-4 md:gap-4 lg:grid-cols-6">
                {mostViewed.slice(0, 12).map((movie) => (
                  <MovieCard key={movie.id} movie={movie} />
                ))}
              </div>
            </section>
          )}

          {/* All Popular (if no sections) */}
          {featured.length === 0 && recent.length === 0 && mostViewed.length === 0 ? (
            <div className="flex h-48 items-center justify-center rounded-lg border border-dashed">
              <p className="text-muted-foreground">No popular movies yet. Check back soon!</p>
            </div>
          ) : null}

          {/* Combined View (for when we have few in each category) */}
          {featured.length === 0 && (recent.length > 0 || mostViewed.length > 0) && (recent.length < 6 || mostViewed.length < 6) && (
            <section>
              <div className="mb-4 flex items-center gap-2">
                <div className="h-6 w-1 rounded-full bg-gradient-to-b from-orange-500 to-red-600" />
                <h2 className="text-lg font-bold md:text-xl">All Popular Movies</h2>
              </div>
              <div className="grid grid-cols-3 gap-2 sm:grid-cols-3 md:grid-cols-4 md:gap-4 lg:grid-cols-6">
                {uniqueMovies.map((movie) => (
                  <MovieCard key={movie.id} movie={movie} />
                ))}
              </div>
            </section>
          )}

          {/* Footer Ad - Desktop Only */}
          <div className="mt-8 hidden md:block">
            <BannerAd position="footer" className="mx-auto" desktopOnly={true} />
          </div>
        </div>
      </main>

      <div className="hidden md:block">
        <Footer />
      </div>
      <MobileNav />
      <div className="h-16 md:hidden" suppressHydrationWarning />
    </div>
  );
}
