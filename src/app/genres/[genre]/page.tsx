import prisma from "@/lib/db/prisma";
import { Header } from "@/components/shared/Header";
import { Footer } from "@/components/shared/Footer";
import { MobileNav } from "@/components/shared/MobileNav";
import { MovieCard } from "@/components/public/MovieCard";
import { generateGenreMetadata } from "@/lib/seo/meta-generator";
import { Layers, ChevronLeft } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Metadata } from "next";

export const dynamic = "force-dynamic";

interface PageProps {
  params: Promise<{ genre: string }>;
}

// Map slug to display name
const genreMap: Record<string, string> = {
  "action": "Action",
  "comedy": "Comedy",
  "drama": "Drama",
  "horror": "Horror",
  "romance": "Romance",
  "thriller": "Thriller",
  "sci-fi": "Sci-Fi",
  "fantasy": "Fantasy",
  "animation": "Animation",
  "adventure": "Adventure",
  "crime": "Crime",
  "documentary": "Documentary",
  "family": "Family",
  "mystery": "Mystery",
  "war": "War",
  "western": "Western",
};

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { genre: genreSlug } = await params;
  const genreName = genreMap[genreSlug] || genreSlug;

  return generateGenreMetadata(genreName);
}

async function getMoviesByGenre(genreName: string) {
  // Search for movies containing this genre in their genres JSON string
  const movies = await prisma.movie.findMany({
    where: {
      isActive: true,
      status: "PUBLISHED",
      genres: {
        contains: genreName,
      },
    },
    orderBy: [{ rating: "desc" }, { createdAt: "desc" }],
    take: 48,
  });
  
  return movies;
}

export default async function GenrePage({ params }: PageProps) {
  const { genre: genreSlug } = await params;
  const genreName = genreMap[genreSlug];

  if (!genreName) {
    notFound();
  }

  const movies = await getMoviesByGenre(genreName);

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <Header />

      <main className="flex-1">
        <div className="container py-6 md:py-12">
          {/* Header */}
          <div className="mb-6 flex items-center gap-2">
            <Layers className="h-6 w-6 text-primary" />
            <h1 className="text-2xl font-bold md:text-3xl">{genreName} Movies</h1>
          </div>

          {/* Back to genres */}
          <Link
            href="/genres"
            className="mb-6 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
          >
            <ChevronLeft className="h-4 w-4" />
            All Genres
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
              <Layers className="mb-2 h-8 w-8 text-muted-foreground" />
              <p className="text-muted-foreground">No {genreName} movies found</p>
              <Link href="/genres" className="mt-2 text-sm text-primary hover:underline">
                Browse other genres
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
