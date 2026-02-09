import prisma from "@/lib/db/prisma";
import { Header } from "@/components/shared/Header";
import { Footer } from "@/components/shared/Footer";
import { MobileNav } from "@/components/shared/MobileNav";
import { MovieCard } from "@/components/public/MovieCard";
import { Calendar, ChevronLeft, ChevronRight } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Metadata } from "next";
import { generateYearMetadata } from "@/lib/seo/meta-generator";

export const dynamic = "force-dynamic";

interface PageProps {
  params: Promise<{ year: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { year } = await params;
  return generateYearMetadata(parseInt(year));
}

async function getMoviesByYear(year: number) {
  const startDate = new Date(`${year}-01-01`);
  const endDate = new Date(`${year + 1}-01-01`);

  return prisma.movie.findMany({
    where: {
      isActive: true,
      releaseDate: {
        gte: startDate,
        lt: endDate,
      },
    },
    orderBy: [{ rating: "desc" }, { createdAt: "desc" }],
    take: 48,
  });
}

export default async function YearPage({ params }: PageProps) {
  const { year: yearParam } = await params;
  const year = parseInt(yearParam);

  // Validate year
  const currentYear = new Date().getFullYear();
  if (isNaN(year) || year < 1900 || year > currentYear + 1) {
    notFound();
  }

  const movies = await getMoviesByYear(year);

  const prevYear = year > 1980 ? year - 1 : null;
  const nextYear = year < currentYear ? year + 1 : null;

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <Header />

      <main className="flex-1">
        <div className="container py-6 md:py-12">
          {/* Header with navigation */}
          <div className="mb-6 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Calendar className="h-6 w-6 text-primary" />
              <h1 className="text-2xl font-bold md:text-3xl">{year} Movies</h1>
            </div>

            {/* Year Navigation */}
            <div className="flex items-center gap-1">
              {prevYear && (
                <Link
                  href={`/years/${prevYear}`}
                  className="flex items-center gap-1 rounded-lg border px-2 py-1 text-sm transition-all hover:bg-muted active:scale-95 md:px-3 md:py-1.5"
                >
                  <ChevronLeft className="h-4 w-4" />
                  <span className="hidden sm:inline">{prevYear}</span>
                </Link>
              )}
              {nextYear && (
                <Link
                  href={`/years/${nextYear}`}
                  className="flex items-center gap-1 rounded-lg border px-2 py-1 text-sm transition-all hover:bg-muted active:scale-95 md:px-3 md:py-1.5"
                >
                  <span className="hidden sm:inline">{nextYear}</span>
                  <ChevronRight className="h-4 w-4" />
                </Link>
              )}
            </div>
          </div>

          {/* Back to all years */}
          <Link
            href="/years"
            className="mb-6 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
          >
            <ChevronLeft className="h-4 w-4" />
            All Years
          </Link>

          {/* Movies Grid */}
          {movies.length > 0 ? (
            <div className="grid grid-cols-3 gap-2 sm:grid-cols-3 md:grid-cols-4 md:gap-4 lg:grid-cols-6">
              {movies.map((movie) => (
                <MovieCard key={movie.id} movie={movie} />
              ))}
            </div>
          ) : (
            <div className="flex h-48 flex-col items-center justify-center rounded-lg border border-dashed">
              <Calendar className="mb-2 h-8 w-8 text-muted-foreground" />
              <p className="text-muted-foreground">No movies found for {year}</p>
              <Link href="/years" className="mt-2 text-sm text-primary hover:underline">
                Browse other years
              </Link>
            </div>
          )}
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
