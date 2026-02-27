"use client";

import Link from "next/link";
import { Film, Search, X, Clapperboard, Play, Tv, Star, Video } from "lucide-react";
import { Input } from "@/components/ui/input";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

interface SiteSettings {
  siteName: string;
  logoType: string;
  logoText: string;
  logoUrl: string;
  logoIcon: string;
}

const iconMap: Record<string, React.ElementType> = {
  Film: Film,
  Clapperboard: Clapperboard,
  Play: Play,
  TV: Tv,
  Star: Star,
  Video: Video,
};

export function Header() {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [showSearch, setShowSearch] = useState(false);
  const [settings, setSettings] = useState<SiteSettings>({
    siteName: "MovPix",
    logoType: "text",
    logoText: "MovPix",
    logoUrl: "",
    logoIcon: "Film",
  });

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

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (search.trim()) {
      router.push(`/search?q=${encodeURIComponent(search)}`);
      setShowSearch(false);
    }
  };

  const LogoIcon = iconMap[settings.logoIcon] || Film;

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
      <div className="container flex h-14 items-center justify-between md:h-16">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2">
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
              <LogoIcon className="h-6 w-6 text-primary" />
              <span className="text-lg font-bold md:text-xl">{settings.logoText || settings.siteName}</span>
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
          {/* Mobile Search Toggle */}
          <button
            onClick={() => setShowSearch(!showSearch)}
            className="rounded-full p-2 hover:bg-muted md:hidden"
          >
            {showSearch ? <X className="h-5 w-5" /> : <Search className="h-5 w-5" />}
          </button>

          {/* Desktop Search */}
          <form onSubmit={handleSearch} className="hidden md:block">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                type="search"
                placeholder="Search movies..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-48 pl-9 lg:w-64"
              />
            </div>
          </form>
        </div>
      </div>

      {/* Mobile Search Bar */}
      {showSearch && (
        <div className="border-t p-3 md:hidden">
          <form onSubmit={handleSearch}>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                type="search"
                placeholder="Search movies..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-9"
                autoFocus
              />
            </div>
          </form>
        </div>
      )}
    </header>
  );
}
