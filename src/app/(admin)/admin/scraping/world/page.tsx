"use client";

import { useState, useRef, useEffect } from "react";
import { Header } from "@/components/admin/Header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Globe,
  Loader2,
  Check,
  X,
  Film,
  Download,
  Play,
  Pause,
  ArrowLeft,
  Zap,
} from "lucide-react";
import Link from "next/link";

interface DiscoveredMovie {
  title: string;
  url: string;
  year?: string;
}

interface ScrapingMovie {
  title: string;
  url: string;
  status: "pending" | "scraping" | "success" | "error" | "skipped";
  error?: string;
  savedId?: number;
  linksCount?: number;
}

const CATEGORIES = [
  { name: "Dual Audio 1080p", url: "https://worldfree4u.ist/category/dual-audio-1080p-movies/" },
  { name: "Dual Audio 720p", url: "https://worldfree4u.ist/category/dual-audio-720p-movies/" },
  { name: "Dual Audio 300MB", url: "https://worldfree4u.ist/category/dual-audio-300mb-movies/" },
  { name: "Bollywood 1080p", url: "https://worldfree4u.ist/category/bollywood-1080p-movies/" },
  { name: "Bollywood 720p", url: "https://worldfree4u.ist/category/bollywood-720p-movies/" },
  { name: "Bollywood 300MB", url: "https://worldfree4u.ist/category/bollywood-300mb-movies/" },
  { name: "Hollywood 1080p", url: "https://worldfree4u.ist/category/hollywood-1080p-movies/" },
  { name: "Hollywood 720p", url: "https://worldfree4u.ist/category/hollywood-720p-movies/" },
  { name: "Hollywood 300MB", url: "https://worldfree4u.ist/category/hollywood-300mb-movies/" },
  { name: "South Hindi 1080p", url: "https://worldfree4u.ist/category/south-hindi-dubbed-1080p/" },
  { name: "South Hindi 720p", url: "https://worldfree4u.ist/category/south-hindi-dubbed-720p-movies/" },
  { name: "Web Series", url: "https://worldfree4u.ist/category/web-series/" },
];

export default function WorldScraperPage() {
  const [step, setStep] = useState<"select" | "importing" | "done">("select");
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [customUrl, setCustomUrl] = useState("");
  const [importCount, setImportCount] = useState("50");
  const [skipDuplicates, setSkipDuplicates] = useState(true);

  const [discovering, setDiscovering] = useState(false);
  const [discoveredMovies, setDiscoveredMovies] = useState<DiscoveredMovie[]>([]);

  const [scrapingQueue, setScrapingQueue] = useState<ScrapingMovie[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isScraping, setIsScraping] = useState(false);
  const [isPaused, setIsPaused] = useState(false);

  const [error, setError] = useState("");

  // Refs to fix closure issues in async functions
  const skipDuplicatesRef = useRef(skipDuplicates);
  const isPausedRef = useRef(isPaused);

  useEffect(() => {
    skipDuplicatesRef.current = skipDuplicates;
  }, [skipDuplicates]);

  useEffect(() => {
    isPausedRef.current = isPaused;
  }, [isPaused]);

  // Normalize title for duplicate detection - STRICT MODE (no year)
  const normalizeTitle = (title: string): string => {
    return title.toLowerCase()
      // Remove years in all formats
      .replace(/\(\d{4}\)/g, '')
      .replace(/\[\d{4}\]/g, '')
      .replace(/\b(19|20)\d{2}\b/g, '')
      // Remove all quality/format markers
      .replace(/hindi|dubbed|hd|netflix|complete|season|dual\s*audio|hdrip|bluray|webrip|camrip|hdtc|hdts|hdcam|dvdrip|brrip|web-dl|amzn|nf|hmax/gi, '')
      .replace(/v2|v3|v4|proper|x264|x265|hevc|10bit|esub|msubs|aac/gi, '')
      .replace(/480p|720p|1080p|2160p|4k|300mb|400mb|500mb|600mb|700mb|800mb|1gb|2gb/gi, '')
      // Remove download/movie keywords
      .replace(/download|movie|film|free|watch|online|stream|full/gi, '')
      // Remove worldfree4u specific
      .replace(/worldfree4u/gi, '')
      // Remove all non-alphanumeric
      .replace(/[^a-z0-9]/g, '')
      .trim();
  };

  // Extract core title for search - more aggressive cleaning for WorldFree4u
  const extractCoreTitle = (title: string): string => {
    let core = title
      // Remove everything after quality/format markers
      .replace(/\s*(dual\s*audio|hindi\s*dubbed|hindi|dubbed|hdrip|bluray|webrip|camrip|hdtc|hdts|hdcam|300mb|400mb|480p|720p|1080p|2160p|download|movie).*/i, '')
      // Keep year in parentheses but remove rest
      .replace(/\s*\(\d{4}\).*/, match => {
        const yearMatch = match.match(/\(\d{4}\)/);
        return yearMatch ? '' : match; // Remove year for search
      })
      .replace(/\s*\|\|.*/, '')
      .replace(/\s*\b(19|20)\d{2}\b.*/, '') // Remove year and everything after
      .trim();
    return core.length > 2 ? core : title.split(/\s+/).slice(0, 3).join(' '); // Fallback to first 3 words
  };

  // Check duplicate - STRICT with multiple search variations
  const checkDuplicateMovie = async (title: string): Promise<boolean> => {
    try {
      const coreTitle = extractCoreTitle(title);
      const normalizedInput = normalizeTitle(title);
      console.log(`[DUPLICATE CHECK] Title: "${title}"`);
      console.log(`[DUPLICATE CHECK] Core: "${coreTitle}" | Normalized: "${normalizedInput}"`);

      // Search with multiple variations
      const searchTerms = [
        coreTitle,
        // Also try first 2-3 words only
        coreTitle.split(' ').slice(0, 3).join(' '),
        coreTitle.split(' ').slice(0, 2).join(' '),
      ].filter(t => t.length >= 2);

      for (const searchTerm of searchTerms) {
        const res = await fetch(`/api/movies/search?q=${encodeURIComponent(searchTerm)}&limit=50&all=true`);
        const data = await res.json();

        if (data.success && data.data?.length > 0) {
          console.log(`[DUPLICATE CHECK] Search "${searchTerm}" found ${data.data.length} results`);

          for (const m of data.data) {
            const normalizedDb = normalizeTitle(m.title);

            // EXACT match only - no more partial matching to avoid false positives
            // "Mardaani" should NOT match "Mardaani 3"
            if (normalizedDb === normalizedInput) {
              console.log(`[DUPLICATE CHECK] EXACT MATCH: "${m.title}"`);
              return true;
            }
          }
        }
      }

      console.log(`[DUPLICATE CHECK] No duplicate found`);
      return false;
    } catch (err) {
      console.error(`[DUPLICATE CHECK] Error:`, err);
      return false;
    }
  };

  // Discover movies from category
  const handleDiscover = async () => {
    const categoryUrl = selectedCategory || customUrl;
    if (!categoryUrl) {
      setError("Please select a category or enter a URL");
      return;
    }

    setDiscovering(true);
    setError("");
    setDiscoveredMovies([]);

    try {
      const count = parseInt(importCount) || 50;
      const movies: DiscoveredMovie[] = [];
      let page = 1;
      const maxPages = Math.ceil(count / 20) + 2;

      while (movies.length < count && page <= maxPages) {
        const pageUrl = page === 1 ? categoryUrl : `${categoryUrl.replace(/\/$/, '')}/page/${page}/`;

        const res = await fetch("/api/scraping/world/discover", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ url: pageUrl }),
        });

        const data = await res.json();
        if (data.success && data.data?.length > 0) {
          movies.push(...data.data);
        } else {
          break;
        }
        page++;
      }

      const limited = movies.slice(0, count);
      setDiscoveredMovies(limited);

      // Start importing
      const queue: ScrapingMovie[] = limited.map(m => ({
        title: m.title,
        url: m.url,
        status: "pending" as const,
      }));
      setScrapingQueue(queue);
      setCurrentIndex(0);
      setStep("importing");
      setIsScraping(true);
      scrapeNextMovie(queue, 0);

    } catch (err) {
      setError(err instanceof Error ? err.message : "Discovery failed");
    } finally {
      setDiscovering(false);
    }
  };

  // Scrape next movie
  const scrapeNextMovie = async (queue: ScrapingMovie[], index: number) => {
    // Use ref to get current pause state (fixes closure issue)
    if (index >= queue.length || isPausedRef.current) {
      setIsScraping(false);
      if (index >= queue.length) {
        setStep("done");
      }
      return;
    }

    setScrapingQueue(prev => {
      const updated = [...prev];
      updated[index] = { ...updated[index], status: "scraping" };
      return updated;
    });

    // Pre-check for duplicates
    if (skipDuplicatesRef.current) {
      const isDuplicate = await checkDuplicateMovie(queue[index].title);
      if (isDuplicate) {
        setScrapingQueue(prev => {
          const updated = [...prev];
          updated[index] = { ...updated[index], status: "skipped", error: "Duplicate" };
          return updated;
        });
        setCurrentIndex(index + 1);
        setTimeout(() => scrapeNextMovie(queue, index + 1), 200);
        return;
      }
    }

    try {
      // Scrape using WorldFree4u specific endpoint
      const scrapeRes = await fetch("/api/scraping/world/scrape", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ url: queue[index].url }),
      });
      const scrapeData = await scrapeRes.json();

      if (scrapeData.success) {
        const scraped = scrapeData.data;

        // Save to database
        const saveRes = await fetch("/api/movies", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({
            title: scraped.title || queue[index].title,
            description: scraped.description,
            metaDescription: scraped.description?.slice(0, 160),
            posterUrl: scraped.posterUrl,
            genres: scraped.genres,
            releaseDate: scraped.releaseYear ? `${scraped.releaseYear}-01-01` : null,
            runtime: scraped.runtime ? parseInt(scraped.runtime) : null,
            rating: scraped.rating ? parseFloat(scraped.rating) : null,
            director: scraped.director,
            status: "DRAFT",
          }),
        });
        const saveData = await saveRes.json();

        if (saveRes.status === 409) {
          setScrapingQueue(prev => {
            const updated = [...prev];
            updated[index] = { ...updated[index], status: "skipped", error: "Exists" };
            return updated;
          });
          setCurrentIndex(index + 1);
          setTimeout(() => scrapeNextMovie(queue, index + 1), 300);
          return;
        }

        if (saveData.success) {
          const movieId = saveData.data.id;
          let linksCount = 0;

          // Add download links
          for (const link of scraped.downloadLinks || []) {
            if (link.url) {
              const linkRes = await fetch(`/api/movies/${movieId}/links`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                credentials: "include",
                body: JSON.stringify({
                  quality: link.quality || "720p",
                  language: link.language || "Dual Audio",
                  linkUrl: link.url,
                  sourceName: link.source || "WorldFree4u",
                }),
              });
              if (linkRes.ok) linksCount++;
            }
          }

          setScrapingQueue(prev => {
            const updated = [...prev];
            updated[index] = { ...updated[index], status: "success", savedId: movieId, linksCount };
            return updated;
          });
        } else {
          throw new Error(saveData.error || "Failed to save");
        }
      } else {
        throw new Error(scrapeData.error || "Failed to scrape");
      }
    } catch (err) {
      setScrapingQueue(prev => {
        const updated = [...prev];
        updated[index] = {
          ...updated[index],
          status: "error",
          error: err instanceof Error ? err.message : "Unknown error",
        };
        return updated;
      });
    }

    setCurrentIndex(index + 1);
    setTimeout(() => scrapeNextMovie(queue, index + 1), 1500);
  };

  const togglePause = () => {
    if (isPaused) {
      setIsPaused(false);
      setIsScraping(true);
      scrapeNextMovie(scrapingQueue, currentIndex);
    } else {
      setIsPaused(true);
    }
  };

  const stats = {
    total: scrapingQueue.length,
    success: scrapingQueue.filter(m => m.status === "success").length,
    skipped: scrapingQueue.filter(m => m.status === "skipped").length,
    failed: scrapingQueue.filter(m => m.status === "error").length,
    pending: scrapingQueue.filter(m => m.status === "pending" || m.status === "scraping").length,
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container mx-auto px-4 py-8">
        <div className="mb-6">
          <Link href="/admin/scraping" className="flex items-center gap-2 text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-4 w-4" />
            Back to Scraping
          </Link>
        </div>

        <Card>
          <CardHeader className="bg-gradient-to-r from-orange-500/20 to-red-500/20">
            <CardTitle className="flex items-center gap-3">
              <Globe className="h-6 w-6 text-orange-500" />
              WorldFree4u Scraper
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            {error && (
              <div className="mb-4 p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-red-500">
                {error}
              </div>
            )}

            {step === "select" && (
              <div className="space-y-6">
                {/* Skip Duplicates */}
                <label className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg cursor-pointer">
                  <input
                    type="checkbox"
                    checked={skipDuplicates}
                    onChange={(e) => setSkipDuplicates(e.target.checked)}
                    className="h-5 w-5 rounded accent-primary"
                  />
                  <div>
                    <p className="font-medium">Skip Duplicate Movies</p>
                    <p className="text-sm text-muted-foreground">Auto-skip existing movies</p>
                  </div>
                </label>

                {/* Categories */}
                <div>
                  <h3 className="font-semibold mb-3">Select Category</h3>
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
                    {CATEGORIES.map(cat => (
                      <Button
                        key={cat.url}
                        variant={selectedCategory === cat.url ? "default" : "outline"}
                        size="sm"
                        onClick={() => {
                          setSelectedCategory(cat.url);
                          setCustomUrl("");
                        }}
                        className="justify-start"
                      >
                        {cat.name}
                      </Button>
                    ))}
                  </div>
                </div>

                {/* Custom URL */}
                <div>
                  <h3 className="font-semibold mb-2">Or Enter Custom URL</h3>
                  <Input
                    placeholder="https://worldfree4u.ist/category/..."
                    value={customUrl}
                    onChange={(e) => {
                      setCustomUrl(e.target.value);
                      setSelectedCategory(null);
                    }}
                  />
                </div>

                {/* Count */}
                <div>
                  <h3 className="font-semibold mb-2">Number of Movies</h3>
                  <div className="flex gap-2 flex-wrap">
                    {[25, 50, 100, 200, 500].map(n => (
                      <Button
                        key={n}
                        variant={importCount === n.toString() ? "default" : "outline"}
                        size="sm"
                        onClick={() => setImportCount(n.toString())}
                      >
                        {n}
                      </Button>
                    ))}
                    <Input
                      type="number"
                      className="w-24"
                      value={importCount}
                      onChange={(e) => setImportCount(e.target.value)}
                      min="1"
                    />
                  </div>
                </div>

                {/* Start Button */}
                <Button
                  onClick={handleDiscover}
                  disabled={discovering || (!selectedCategory && !customUrl)}
                  size="lg"
                  className="w-full bg-gradient-to-r from-orange-500 to-red-500 text-lg"
                >
                  {discovering ? (
                    <>
                      <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                      Discovering Movies...
                    </>
                  ) : (
                    <>
                      <Zap className="mr-2 h-5 w-5" />
                      Start Import ({importCount} movies)
                    </>
                  )}
                </Button>
              </div>
            )}

            {(step === "importing" || step === "done") && (
              <div className="space-y-4">
                {/* Stats */}
                <div className="grid grid-cols-5 gap-2 text-center">
                  <div className="p-3 bg-muted rounded-lg">
                    <div className="text-2xl font-bold">{stats.total}</div>
                    <div className="text-xs text-muted-foreground">Total</div>
                  </div>
                  <div className="p-3 bg-green-500/20 rounded-lg">
                    <div className="text-2xl font-bold text-green-500">{stats.success}</div>
                    <div className="text-xs text-muted-foreground">Success</div>
                  </div>
                  <div className="p-3 bg-yellow-500/20 rounded-lg">
                    <div className="text-2xl font-bold text-yellow-500">{stats.skipped}</div>
                    <div className="text-xs text-muted-foreground">Skipped</div>
                  </div>
                  <div className="p-3 bg-red-500/20 rounded-lg">
                    <div className="text-2xl font-bold text-red-500">{stats.failed}</div>
                    <div className="text-xs text-muted-foreground">Failed</div>
                  </div>
                  <div className="p-3 bg-blue-500/20 rounded-lg">
                    <div className="text-2xl font-bold text-blue-500">{stats.pending}</div>
                    <div className="text-xs text-muted-foreground">Pending</div>
                  </div>
                </div>

                {/* Progress */}
                <div className="w-full bg-muted rounded-full h-2">
                  <div
                    className="bg-gradient-to-r from-orange-500 to-red-500 h-2 rounded-full transition-all"
                    style={{ width: `${(currentIndex / stats.total) * 100}%` }}
                  />
                </div>
                <p className="text-sm text-muted-foreground">
                  {currentIndex} of {stats.total} processed
                </p>

                {/* Controls */}
                {step === "importing" && (
                  <Button onClick={togglePause} variant="outline">
                    {isPaused ? <Play className="mr-2 h-4 w-4" /> : <Pause className="mr-2 h-4 w-4" />}
                    {isPaused ? "Resume" : "Pause"}
                  </Button>
                )}

                {step === "done" && (
                  <div className="flex gap-2">
                    <Button onClick={() => { setStep("select"); setScrapingQueue([]); }}>
                      Import More
                    </Button>
                    <Link href="/admin/movies">
                      <Button variant="outline">View All Movies</Button>
                    </Link>
                  </div>
                )}

                {/* Movie List */}
                <div className="max-h-96 overflow-y-auto space-y-1">
                  {scrapingQueue.map((movie, i) => (
                    <div
                      key={i}
                      className={`flex items-center gap-3 p-2 rounded-lg ${
                        movie.status === "scraping" ? "bg-blue-500/10" :
                        movie.status === "success" ? "bg-green-500/10" :
                        movie.status === "skipped" ? "bg-yellow-500/10" :
                        movie.status === "error" ? "bg-red-500/10" : "bg-muted/30"
                      }`}
                    >
                      {movie.status === "scraping" && <Loader2 className="h-4 w-4 animate-spin text-blue-500" />}
                      {movie.status === "success" && <Check className="h-4 w-4 text-green-500" />}
                      {movie.status === "skipped" && <X className="h-4 w-4 text-yellow-500" />}
                      {movie.status === "error" && <X className="h-4 w-4 text-red-500" />}
                      {movie.status === "pending" && <Film className="h-4 w-4 text-muted-foreground" />}
                      <span className="flex-1 truncate text-sm">{movie.title}</span>
                      {movie.linksCount !== undefined && movie.linksCount > 0 && (
                        <span className="text-xs text-green-500">{movie.linksCount} links</span>
                      )}
                      {movie.error && <span className="text-xs text-muted-foreground">{movie.error}</span>}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
