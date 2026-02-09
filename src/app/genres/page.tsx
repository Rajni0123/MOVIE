import Link from "next/link";
import { Header } from "@/components/shared/Header";
import { Footer } from "@/components/shared/Footer";
import { MobileNav } from "@/components/shared/MobileNav";
import { Layers } from "lucide-react";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Browse Movies by Genre - MovieHub",
  description: "Browse and download movies by genre. Find Action, Comedy, Drama, Horror, Romance, Thriller, Sci-Fi, Fantasy, Animation movies for free in HD quality.",
  keywords: "movie genres, action movies, comedy movies, drama movies, horror movies, download movies by genre",
};

const genres = [
  "Action",
  "Comedy", 
  "Drama",
  "Horror",
  "Romance",
  "Thriller",
  "Sci-Fi",
  "Fantasy",
  "Animation",
  "Adventure",
  "Crime",
  "Documentary",
  "Family",
  "Mystery",
  "War",
  "Western",
];

export default function GenresPage() {
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <Header />

      <main className="flex-1">
        <div className="container py-6 md:py-12">
          <div className="mb-6 flex items-center gap-2">
            <Layers className="h-6 w-6 text-primary" />
            <h1 className="text-2xl font-bold md:text-3xl">Browse by Genre</h1>
          </div>

          <div className="flex flex-wrap gap-2 md:gap-3">
            {genres.map((genre) => (
              <Link
                key={genre}
                href={`/genres/${genre.toLowerCase().replace(" ", "-")}`}
                className="rounded-full border bg-card px-4 py-2 text-sm font-medium transition-colors hover:bg-primary hover:text-primary-foreground active:scale-95 md:px-5 md:py-2.5 md:text-base"
              >
                {genre}
              </Link>
            ))}
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
