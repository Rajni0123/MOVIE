"use client";

import Link from "next/link";
import { Film, Search, X, Clapperboard, Play, Tv, Star, Video, Loader2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";

interface SiteSettings {
  siteName: string;
  logoType: string;
  logoText: string;
  logoUrl: string;
  logoIcon: string;
}

interface SearchResult {
  id: number;
  title: string;
  slug: string;
  posterUrl: string | null;
  year: number | null;
  rating: number | null;
}

const iconMap: Record<string, React.ElementType> = {
  Film: Film,
  Clapperboard: Clapperboard,
  Play: Play,
  TV: Tv,
  Star: Star,
  Video: Video,
};

// Debounce hook
function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => clearTimeout(handler);
  }, [value, delay]);

  return debouncedValue;
}

export function Header() {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [showResults, setShowResults] = useState(false);
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);
  const mobileSearchRef = useRef<HTMLDivElement>(null);
  const [settings, setSettings] = useState<SiteSettings>({
    siteName: "MovPix",
    logoType: "text",
    logoText: "MovPix",
    logoUrl: "",
    logoIcon: "Film",
  });

  const debouncedSearch = useDebounce(search, 300);

  // Fetch settings
  useEffect(() => {
    fetch("/api/settings")
      .then((res) => res.json())
      .then((data) => {
        if (data.success) {
          setSettings((prev) => ({
            ...prev,
            siteName: data.data.siteName || prev.siteName,
            logoType: data.data.logoType || "text",
            logoText: data.data.logoText || data.data.siteName || prev.logoText,
            logoUrl: data.data.logoUrl || "",
            logoIcon: data.data.logoIcon || "Film",
          }));
        }
      })
      .catch(() => {});
  }, []);

  // Live search
  useEffect(() => {
    if (debouncedSearch.length < 2) {
      setResults([]);
      setShowResults(false);
      return;
    }

    const searchMovies = async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/movies/search?q=${encodeURIComponent(debouncedSearch)}&limit=8`);
        const data = await res.json();
        if (data.success) {
          setResults(data.data);
          setShowResults(data.data.length > 0);
        }
      } catch (error) {
        console.error("Search error:", error);
      } finally {
        setLoading(false);
      }
    };

    searchMovies();
  }, [debouncedSearch]);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        searchRef.current && !searchRef.current.contains(e.target as Node) &&
        mobileSearchRef.current && !mobileSearchRef.current.contains(e.target as Node)
      ) {
        setShowResults(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (search.trim()) {
      router.push(`/search?q=${encodeURIComponent(search)}`);
      setShowResults(false);
      setSearch("");
    }
  };

  const handleResultClick = (slug: string) => {
    router.push(`/movie/${slug}`);
    setShowResults(false);
    setSearch("");
  };

  const LogoIcon = iconMap[settings.logoIcon] || Film;

  const SearchDropdown = () => (
    <div className="absolute left-0 right-0 top-full z-50 mt-1 max-h-[70vh] overflow-y-auto rounded-lg border bg-background shadow-lg">
      {loading ? (
        <div className="flex items-center justify-center py-4">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </div>
      ) : results.length > 0 ? (
        <>
          {results.map((movie) => (
            <button
              key={movie.id}
              onClick={() => handleResultClick(movie.slug)}
              className="flex w-full items-center gap-3 px-3 py-2 text-left transition-colors hover:bg-muted"
            >
              {movie.posterUrl ? (
                <img
                  src={movie.posterUrl}
                  alt={movie.title}
                  className="h-12 w-8 rounded object-cover"
                />
              ) : (
                <div className="flex h-12 w-8 items-center justify-center rounded bg-muted">
                  <Film className="h-4 w-4 text-muted-foreground" />
                </div>
              )}
              <div className="flex-1 min-w-0">
                <p className="truncate font-medium text-sm">{movie.title}</p>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  {movie.year && <span>{movie.year}</span>}
                  {movie.rating && (
                    <span className="flex items-center gap-0.5">
                      <Star className="h-3 w-3 fill-yellow-500 text-yellow-500" />
                      {movie.rating.toFixed(1)}
                    </span>
                  )}
                </div>
              </div>
            </button>
          ))}
          <button
            onClick={handleSearch}
            className="flex w-full items-center justify-center gap-2 border-t py-2 text-sm text-primary hover:bg-muted"
          >
            <Search className="h-4 w-4" />
            See all results for "{search}"
          </button>
        </>
      ) : search.length >= 2 ? (
        <div className="py-4 text-center text-sm text-muted-foreground">
          No movies found for "{search}"
        </div>
      ) : null}
    </div>
  );

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
      <div className="container flex h-14 items-center justify-between md:h-16">
        {/* Logo */}
        <Link href="/" className="group flex items-center gap-2.5">
          {settings.logoType === "image" && settings.logoUrl ? (
            <img
              src={settings.logoUrl}
              alt={settings.logoText || settings.siteName}
              className="h-8 object-contain"
              onError={(e) => {
                // Fallback to text logo on error
                (e.target as HTMLImageElement).style.display = "none";
              }}
            />
          ) : (
            <>
              {/* Animated Icon */}
              <div className="relative flex items-center justify-center">
                {/* Ping animation ring */}
                <span className="absolute h-8 w-8 animate-ping rounded-lg bg-primary/20" />
                {/* Icon container */}
                <div className="relative rounded-lg bg-primary p-1.5 shadow-lg shadow-primary/25 transition-transform duration-300 group-hover:scale-110 group-hover:rotate-3">
                  <LogoIcon className="h-5 w-5 text-primary-foreground" />
                </div>
              </div>
              {/* Animated Text Logo */}
              <div className="flex items-baseline">
                <span className="text-xl font-black tracking-tight text-foreground transition-all duration-300 group-hover:tracking-wide md:text-2xl">
                  {(settings.logoText || settings.siteName).slice(0, 3)}
                </span>
                <span className="text-xl font-black tracking-tight text-primary transition-all duration-300 group-hover:tracking-wide md:text-2xl">
                  {(settings.logoText || settings.siteName).slice(3)}
                </span>
              </div>
            </>
          )}
          {/* Show text alongside image logo if image loaded */}
          {settings.logoType === "image" && settings.logoUrl && (
            <span className="sr-only">{settings.logoText || settings.siteName}</span>
          )}
        </Link>

        {/* Desktop Navigation */}
        <nav className="hidden items-center gap-6 md:flex">
          <Link
            href="/"
            className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
          >
            Home
          </Link>
          <Link
            href="/movies"
            className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
          >
            Movies
          </Link>
          <Link
            href="/genres"
            className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
          >
            Genre
          </Link>
          <Link
            href="/years"
            className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
          >
            Years
          </Link>
          <Link
            href="/popular"
            className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
          >
            Popular
          </Link>
        </nav>

        {/* Search */}
        <div className="flex items-center gap-2">
          {/* Mobile Search - Small Input */}
          <div ref={mobileSearchRef} className="relative md:hidden">
            <form onSubmit={handleSearch}>
              <div className="relative">
                <Search className="absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                <Input
                  type="search"
                  placeholder="Search..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  onFocus={() => results.length > 0 && setShowResults(true)}
                  className="h-8 w-28 pl-7 pr-2 text-sm"
                />
              </div>
            </form>
            {showResults && <SearchDropdown />}
          </div>

          {/* Desktop Search */}
          <div ref={searchRef} className="relative hidden md:block">
            <form onSubmit={handleSearch}>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  type="search"
                  placeholder="Search movies..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  onFocus={() => results.length > 0 && setShowResults(true)}
                  className="w-48 pl-9 lg:w-64"
                />
                {loading && (
                  <Loader2 className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-muted-foreground" />
                )}
              </div>
            </form>
            {showResults && <SearchDropdown />}
          </div>
        </div>
      </div>

    </header>
  );
}
