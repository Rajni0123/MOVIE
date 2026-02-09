import prisma from "@/lib/db/prisma";
import { Header } from "@/components/shared/Header";
import { Footer } from "@/components/shared/Footer";
import { MobileNav } from "@/components/shared/MobileNav";
import { MovieCard } from "@/components/public/MovieCard";
import { BannerAd } from "@/components/public/AdDisplay";
import { Film } from "lucide-react";
import { generateMoviesListMetadata } from "@/lib/seo/meta-generator";
import Link from "next/link";

export const dynamic = "force-dynamic";

export const metadata = generateMoviesListMetadata();

async function getAllMovies(page: number = 1, pageSize: number = 48) {
  const skip = (page - 1) * pageSize;
  
  const [movies, total] = await Promise.all([
    prisma.movie.findMany({
      where: { 
        status: "PUBLISHED",
        isActive: true,
      },
      orderBy: { createdAt: "desc" },
      skip,
      take: pageSize,
    }),
    prisma.movie.count({
      where: { 
        status: "PUBLISHED",
        isActive: true,
      },
    }),
  ]);

  return { movies, total, page, pageSize, totalPages: Math.ceil(total / pageSize) };
}

interface MoviesPageProps {
  searchParams: Promise<{ page?: string }>;
}

export default async function MoviesPage({ searchParams }: MoviesPageProps) {
  const params = await searchParams;
  const currentPage = parseInt(params.page || "1", 10);
  const { movies, total, page, totalPages } = await getAllMovies(currentPage, 48);

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <Header />

      <main className="flex-1">
        <div className="container py-6 md:py-12">
          {/* Header Ad - Desktop Only */}
          <div className="mb-6 hidden md:block">
            <BannerAd position="header" className="mx-auto" desktopOnly={true} />
          </div>

          <div className="mb-6 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Film className="h-6 w-6 text-primary" />
              <h1 className="text-2xl font-bold md:text-3xl">Latest Movies</h1>
              <span className="text-sm text-muted-foreground">({total} movies)</span>
            </div>
          </div>

          {movies.length > 0 ? (
            <>
              <div className="mb-4 text-sm text-muted-foreground">
                Showing {movies.length} of {total} movies
              </div>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 md:gap-4 lg:grid-cols-6">
                {movies.map((movie) => (
                  <MovieCard key={movie.id} movie={movie} />
                ))}
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="mt-8 flex items-center justify-center gap-2">
                  {page > 1 && (
                    <Link
                      href={`/movies?page=${page - 1}`}
                      className="rounded-lg border bg-card px-4 py-2 text-sm font-medium transition-colors hover:bg-accent"
                    >
                      Previous
                    </Link>
                  )}
                  
                  <div className="flex gap-1">
                    {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                      let pageNum: number;
                      if (totalPages <= 5) {
                        pageNum = i + 1;
                      } else if (page <= 3) {
                        pageNum = i + 1;
                      } else if (page >= totalPages - 2) {
                        pageNum = totalPages - 4 + i;
                      } else {
                        pageNum = page - 2 + i;
                      }
                      
                      return (
                        <Link
                          key={pageNum}
                          href={`/movies?page=${pageNum}`}
                          className={`rounded-lg border px-3 py-2 text-sm font-medium transition-colors ${
                            pageNum === page
                              ? "bg-primary text-primary-foreground"
                              : "bg-card hover:bg-accent"
                          }`}
                        >
                          {pageNum}
                        </Link>
                      );
                    })}
                  </div>

                  {page < totalPages && (
                    <Link
                      href={`/movies?page=${page + 1}`}
                      className="rounded-lg border bg-card px-4 py-2 text-sm font-medium transition-colors hover:bg-accent"
                    >
                      Next
                    </Link>
                  )}
                </div>
              )}

              <div className="mt-4 text-center text-sm text-muted-foreground">
                Page {page} of {totalPages}
              </div>
            </>
          ) : (
            <div className="flex h-48 flex-col items-center justify-center rounded-lg border border-dashed">
              <Film className="h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-muted-foreground mb-2">No movies available yet.</p>
              <p className="text-xs text-muted-foreground">Check back soon for new releases!</p>
            </div>
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
