"use client";

import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { Header } from "@/components/shared/Header";
import { Footer } from "@/components/shared/Footer";
import { MobileNav } from "@/components/shared/MobileNav";
import { MovieCard } from "@/components/public/MovieCard";
import { Input } from "@/components/ui/input";
import { Search, Loader2 } from "lucide-react";
import { Movie } from "@prisma/client";

export default function SearchPage() {
  const searchParams = useSearchParams();
  const initialQuery = searchParams.get("q") || "";
  
  const [query, setQuery] = useState(initialQuery);
  const [movies, setMovies] = useState<Movie[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);

  useEffect(() => {
    if (initialQuery) {
      handleSearch(initialQuery);
    }
  }, [initialQuery]);

  const handleSearch = async (searchQuery: string) => {
    if (!searchQuery.trim()) return;
    
    setLoading(true);
    setSearched(true);
    
    try {
      const res = await fetch(`/api/movies?search=${encodeURIComponent(searchQuery)}&pageSize=24`);
      const data = await res.json();
      setMovies(data.data?.movies || []);
    } catch (error) {
      console.error("Search error:", error);
      setMovies([]);
    } finally {
      setLoading(false);
    }
  };

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    handleSearch(query);
  };

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <Header />

      <main className="flex-1">
        <div className="container py-6 md:py-12">
          <h1 className="mb-6 text-2xl font-bold md:text-3xl">Search Movies</h1>

          {/* Search Form */}
          <form onSubmit={onSubmit} className="mb-8">
            <div className="relative">
              <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
              <Input
                type="search"
                placeholder="Search for movies..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="h-12 pl-12 text-base md:h-14 md:text-lg"
                autoFocus
              />
            </div>
          </form>

          {/* Results */}
          {loading ? (
            <div className="flex h-48 items-center justify-center">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : movies.length > 0 ? (
            <div className="grid grid-cols-3 gap-2 sm:grid-cols-3 md:grid-cols-4 md:gap-4 lg:grid-cols-6">
              {movies.map((movie) => (
                <MovieCard key={movie.id} movie={movie} />
              ))}
            </div>
          ) : searched ? (
            <div className="flex h-48 flex-col items-center justify-center rounded-lg border border-dashed">
              <p className="text-muted-foreground">No movies found for "{query}"</p>
              <p className="mt-1 text-sm text-muted-foreground">Try a different search term</p>
            </div>
          ) : (
            <div className="flex h-48 items-center justify-center rounded-lg border border-dashed">
              <p className="text-muted-foreground">Enter a movie name to search</p>
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
