"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Header } from "@/components/admin/Header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Globe,
  Search,
  Loader2,
  Check,
  X,
  Film,
  Download,
  Play,
  Pause,
  ArrowLeft,
  Database,
  Zap,
  Clock,
  ChevronRight,
  FolderOpen,
  Calendar,
  Tag,
} from "lucide-react";

interface WebsiteAnalysis {
  websiteTitle: string;
  websiteLogo: string | null;
  baseUrl: string;
  analyzedUrl: string;
  moviesOnCurrentPage: number;
  totalLifetimeEstimate: number;
  estimateMethod: string;
  pagination: {
    hasPages: boolean;
    totalPages: number | null;
    lastPageNumber: number | null;
    itemsPerPage: number;
  };
  categories: { name: string; url: string; count?: number }[];
  years: { year: string; url: string; count?: number }[];
  importOptions: {
    canImportAll: boolean;
    estimatedTime: number;
  };
}

interface DiscoveredMovie {
  title: string;
  url: string;
  year?: string;
  posterUrl?: string;
}

interface ScrapingMovie {
  title: string;
  url: string;
  status: "pending" | "scraping" | "success" | "error";
  error?: string;
  savedId?: number;
}

export default function UniversalScraperPage() {
  const router = useRouter();

  // Step state
  const [step, setStep] = useState<"input" | "analyzed" | "importing" | "done">("input");

  // Input state
  const [websiteUrl, setWebsiteUrl] = useState("");
  const [analyzing, setAnalyzing] = useState(false);
  const [analysis, setAnalysis] = useState<WebsiteAnalysis | null>(null);

  // Import options
  const [importCount, setImportCount] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedYear, setSelectedYear] = useState<string | null>(null);
  const [skipDuplicates, setSkipDuplicates] = useState(true);

  // Discovery state
  const [discovering, setDiscovering] = useState(false);
  const [discoveredMovies, setDiscoveredMovies] = useState<DiscoveredMovie[]>([]);
  const [totalDiscovered, setTotalDiscovered] = useState(0);

  // Scraping state
  const [scrapingQueue, setScrapingQueue] = useState<ScrapingMovie[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isScraping, setIsScraping] = useState(false);
  const [isPaused, setIsPaused] = useState(false);

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // Analyze website
  const handleAnalyze = async () => {
    if (!websiteUrl.trim()) {
      setError("Please enter a website URL");
      return;
    }

    setAnalyzing(true);
    setError("");
    setSuccess("");
    setAnalysis(null);

    try {
      const res = await fetch("/api/scraping/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ url: websiteUrl }),
      });
      const data = await res.json();

      if (data.success) {
        setAnalysis(data.data);
        setStep("analyzed");
        setSuccess(`Website analyzed! Found approximately ${data.data.totalLifetimeEstimate.toLocaleString()} total files.`);
      } else {
        setError(data.error || "Failed to analyze website");
      }
    } catch (err) {
      setError("Failed to analyze website. Please check the URL and try again.");
    } finally {
      setAnalyzing(false);
    }
  };

  // Discover all movies from all pages
  const discoverAllMovies = async (targetUrl: string, maxCount?: number) => {
    setDiscovering(true);
    setError("");
    setSuccess("");
    const allMovies: DiscoveredMovie[] = [];
    const seenUrls = new Set<string>();
    let page = 1;
    let hasMore = true;
    let consecutiveEmpty = 0;
    const maxPages = 1000; // Safety limit
    const maxConsecutiveEmpty = 5; // Stop after 5 empty pages (increased for reliability)
    let lastMovieCount = 0; // Track if we're getting new movies

    // Detect if URL is a genre/category page
    const isGenrePage = /\/genre\/[^\/]+\/?$/i.test(targetUrl) ||
                        /\/category\/[^\/]+\/?$/i.test(targetUrl) ||
                        /\/tag\/[^\/]+\/?$/i.test(targetUrl);

    console.log(`Starting discovery: ${targetUrl}, isGenrePage: ${isGenrePage}, maxCount: ${maxCount}`);

    try {
      while (hasMore && page <= maxPages && consecutiveEmpty < maxConsecutiveEmpty) {
        // Build pagination URL - handle different patterns
        let pageUrl = targetUrl;
        if (page > 1) {
          // Clean the base URL - remove any existing page patterns
          const baseUrl = targetUrl
            .split("?")[0]
            .replace(/\/page\/\d+\/?$/i, "")
            .replace(/\/page-\d+\/?$/i, "")
            .replace(/\/$/, "");

          // Build the page URL
          pageUrl = `${baseUrl}/page/${page}/`;
        }

        console.log(`Fetching page ${page}: ${pageUrl}`);

        setSuccess(`Discovering page ${page}... Found ${allMovies.length} movies so far`);

        const res = await fetch("/api/scraping/bulk/discover", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ url: pageUrl, type: "movies", page }),
        });
        const data = await res.json();

        console.log(`Page ${page} response: success=${data.success}, movies=${data.movies?.length || 0}`);

        if (data.success && data.movies?.length > 0) {
          // Filter duplicates by URL
          const newMovies = data.movies.filter((m: DiscoveredMovie) => {
            if (seenUrls.has(m.url)) return false;
            seenUrls.add(m.url);
            return true;
          });

          console.log(`Page ${page}: ${data.movies.length} total, ${newMovies.length} new unique`);

          if (newMovies.length > 0) {
            consecutiveEmpty = 0; // Reset counter only if we got new movies
            allMovies.push(...newMovies);
            setDiscoveredMovies([...allMovies]);
            setTotalDiscovered(allMovies.length);
            lastMovieCount = allMovies.length;
          } else {
            // Got movies but all were duplicates - pagination might be broken
            consecutiveEmpty++;
            console.log(`Page ${page}: All ${data.movies.length} movies were duplicates (consecutive empty: ${consecutiveEmpty})`);
          }

          // Check if we've reached the target count
          if (maxCount && allMovies.length >= maxCount) {
            console.log(`Reached target count: ${allMovies.length} >= ${maxCount}`);
            break;
          }

          // Continue to next page
          page++;
          // Small delay to avoid rate limiting
          await new Promise(resolve => setTimeout(resolve, 300));
        } else {
          // No movies found on this page
          console.log(`Page ${page}: No movies found (error: ${data.error})`);

          if (page === 1) {
            // First page failed completely - try different URL patterns
            console.log("First page failed, stopping");
            hasMore = false;
          } else {
            consecutiveEmpty++;
            if (consecutiveEmpty < maxConsecutiveEmpty) {
              // Try next page anyway
              page++;
              await new Promise(resolve => setTimeout(resolve, 300));
            } else {
              console.log(`Stopping: ${maxConsecutiveEmpty} consecutive empty pages`);
              hasMore = false;
            }
          }
        }
      }

      console.log(`Discovery finished: ${allMovies.length} movies from ${page - 1} pages`);

      setSuccess(`Discovery complete! Found ${allMovies.length} movies from ${page - 1} pages`);
      return allMovies;
    } catch (err) {
      console.error("Discovery error:", err);
      setError(`Discovery error: ${err instanceof Error ? err.message : 'Unknown error'}`);
      return allMovies;
    } finally {
      setDiscovering(false);
    }
  };

  // Start import process
  const handleStartImport = async (count?: number) => {
    if (!analysis) return;

    setStep("importing");
    setError("");
    setSuccess("");

    // Determine target URL
    let targetUrl = analysis.analyzedUrl;

    // If user selected a category or year, use that
    if (selectedCategory) {
      const cat = analysis.categories.find(c => c.name === selectedCategory);
      if (cat) targetUrl = cat.url;
    }
    if (selectedYear) {
      const year = analysis.years.find(y => y.year === selectedYear);
      if (year) targetUrl = year.url;
    }

    // If homepage has no pagination and categories exist, use first category
    if (!selectedCategory && !selectedYear &&
        !analysis.pagination.hasPages &&
        analysis.categories.length > 0) {
      // Find a good category to use (prefer bollywood, hollywood, or first available)
      const preferredCats = ['bollywood', 'hollywood', 'movies', 'all'];
      let bestCat = analysis.categories[0];

      for (const pref of preferredCats) {
        const found = analysis.categories.find(c =>
          c.name.toLowerCase().includes(pref)
        );
        if (found) {
          bestCat = found;
          break;
        }
      }

      targetUrl = bestCat.url;
      setSuccess(`Homepage has no pagination. Using category: ${bestCat.name}`);
    }

    // Discover movies
    const movies = await discoverAllMovies(targetUrl, count);

    if (movies.length === 0) {
      setError("No movies found to import");
      setStep("analyzed");
      return;
    }

    // Limit to requested count
    const moviesToImport = count ? movies.slice(0, count) : movies;

    // Setup scraping queue
    const queue: ScrapingMovie[] = moviesToImport.map(m => ({
      title: m.title,
      url: m.url,
      status: "pending",
    }));

    setScrapingQueue(queue);
    setCurrentIndex(0);
    setIsScraping(true);
    setIsPaused(false);

    // Start scraping
    scrapeNextMovie(queue, 0);
  };

  // Normalize title for duplicate detection (same logic as backend)
  const normalizeTitle = (title: string): string => {
    const yearMatch = title.match(/\((\d{4})\)/);
    const year = yearMatch ? yearMatch[1] : '';
    const normalized = title.toLowerCase()
      .replace(/\(\d{4}\)/g, '')
      .replace(/\[\d{4}\]/g, '')
      .replace(/hindi|dubbed|hd|netflix|complete|season|jiohotstar|amzn|web-dl|webrip|hdtc|hdcam|dvdrip|bluray|brrip/gi, '')
      .replace(/v2|v3|v4|proper|x264|x265|hevc|10bit|esub|msubs|nf|hdts|predvd|scr|hdrip|camrip|telesync|ts|tc|cam|r5|dvdscr|ppvrip|hdtv|pdtv|dsr|dvbr|satrip|iptvrip|vhsrip|vodrip|web|remux|pre|dvd/gi, '')
      .replace(/480p|720p|1080p|2160p|4k/gi, '')
      .replace(/[^a-z0-9]/g, '')
      .trim();
    return normalized + year;
  };

  // Check if movie already exists (pre-scrape duplicate check)
  const checkDuplicateMovie = async (title: string): Promise<boolean> => {
    try {
      // Use all=true to check against ALL movies (not just published)
      const res = await fetch(`/api/movies/search?q=${encodeURIComponent(title)}&limit=10&all=true`);
      const data = await res.json();
      if (data.success && data.data?.length > 0) {
        const normalizedInput = normalizeTitle(title);
        return data.data.some((m: { title: string }) => normalizeTitle(m.title) === normalizedInput);
      }
      return false;
    } catch {
      return false;
    }
  };

  // Scrape next movie
  const scrapeNextMovie = async (queue: ScrapingMovie[], index: number) => {
    if (index >= queue.length || isPaused) {
      setIsScraping(false);
      if (index >= queue.length) {
        setStep("done");
      }
      return;
    }

    // Update status
    setScrapingQueue(prev => {
      const updated = [...prev];
      updated[index] = { ...updated[index], status: "scraping" };
      return updated;
    });

    // Pre-check for duplicates (if enabled)
    if (skipDuplicates) {
      const isDuplicate = await checkDuplicateMovie(queue[index].title);
      if (isDuplicate) {
        setScrapingQueue(prev => {
          const updated = [...prev];
          updated[index] = {
            ...updated[index],
            status: "success",
            error: "Skipped - duplicate detected"
          };
          return updated;
        });
        setCurrentIndex(index + 1);
        setTimeout(() => scrapeNextMovie(queue, index + 1), 300);
        return;
      }
    }

    try {
      // Scrape movie details
      const scrapeRes = await fetch("/api/scraping/url", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ url: queue[index].url }),
      });
      const scrapeData = await scrapeRes.json();

      if (scrapeData.success) {
        const scraped = scrapeData.data;

        // Save to database
        // Generate meta description from description (truncate for SEO - max 160 chars)
        const metaDesc = scraped.description
          ? scraped.description.slice(0, 160).trim() + (scraped.description.length > 160 ? "..." : "")
          : "";

        const saveRes = await fetch("/api/movies", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({
            title: scraped.title || queue[index].title,
            description: scraped.description,
            metaDescription: metaDesc,
            posterUrl: scraped.posterUrl,
            backdropUrl: scraped.backdropUrl,
            trailerUrl: scraped.trailerUrl || "",
            screenshots: JSON.stringify(scraped.screenshots || []),
            genres: scraped.genres,
            releaseDate: scraped.releaseYear ? `${scraped.releaseYear}-01-01` : null,
            runtime: scraped.runtime ? parseInt(scraped.runtime) : null,
            rating: scraped.rating ? parseFloat(scraped.rating) : null,
            director: scraped.director,
            metaKeywords: scraped.keywords?.join(", "),
            status: "DRAFT",
          }),
        });
        const saveData = await saveRes.json();

        // Handle duplicate movies - skip instead of error
        if (saveRes.status === 409 && saveData.data?.existingId) {
          // Movie already exists - mark as success (skipped)
          setScrapingQueue(prev => {
            const updated = [...prev];
            updated[index] = {
              ...updated[index],
              status: "success",
              savedId: saveData.data.existingId,
              error: "Skipped - already exists"
            };
            return updated;
          });
          // Continue faster for skipped movies
          setCurrentIndex(index + 1);
          setTimeout(() => {
            scrapeNextMovie(queue, index + 1);
          }, 500);
          return;
        }

        if (saveData.success) {
          const movieId = saveData.data.id;

          // Add download links
          for (const link of scraped.downloadLinks || []) {
            if (link.url) {
              await fetch(`/api/movies/${movieId}/links`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                credentials: "include",
                body: JSON.stringify({
                  quality: link.quality,
                  language: link.language,
                  linkUrl: link.url,
                  sourceName: "",
                }),
              });
            }
          }

          setScrapingQueue(prev => {
            const updated = [...prev];
            updated[index] = { ...updated[index], status: "success", savedId: movieId };
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

    // Continue with next
    setCurrentIndex(index + 1);
    setTimeout(() => {
      scrapeNextMovie(queue, index + 1);
    }, 2000);
  };

  // Toggle pause
  const togglePause = () => {
    if (isPaused) {
      setIsPaused(false);
      setIsScraping(true);
      scrapeNextMovie(scrapingQueue, currentIndex);
    } else {
      setIsPaused(true);
      setIsScraping(false);
    }
  };

  // Stats
  const successCount = scrapingQueue.filter(m => m.status === "success").length;
  const errorCount = scrapingQueue.filter(m => m.status === "error").length;

  return (
    <div>
      <Header title="Universal URL Scraper" />

      <div className="p-6">
        {/* Back Button */}
        <div className="mb-6">
          <Link href="/admin/scraping">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Scraping
            </Button>
          </Link>
        </div>

        {/* Messages */}
        {error && (
          <div className="mb-6 rounded-lg bg-destructive/10 p-4 text-destructive">
            {error}
          </div>
        )}
        {success && (
          <div className="mb-6 flex items-center gap-2 rounded-lg bg-green-500/10 p-4 text-green-500">
            <Check className="h-5 w-5" />
            {success}
          </div>
        )}

        {/* Step 1: Enter URL */}
        {step === "input" && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Globe className="h-6 w-6 text-primary" />
                Universal Website Scraper
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="rounded-lg bg-gradient-to-r from-primary/10 to-purple-500/10 p-6">
                <h3 className="mb-2 text-lg font-semibold">
                  🚀 Import Lifetime Content from Any Website
                </h3>
                <p className="text-sm text-muted-foreground">
                  Enter any movie website URL. We'll analyze the total content available
                  and let you import ALL files or specify a custom number.
                </p>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="mb-2 block text-sm font-medium">Website URL</label>
                  <div className="flex gap-2">
                    <Input
                      value={websiteUrl}
                      onChange={(e) => setWebsiteUrl(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && handleAnalyze()}
                      placeholder="https://example-movies.com"
                      className="flex-1 text-lg"
                    />
                    <Button
                      onClick={handleAnalyze}
                      disabled={analyzing}
                      size="lg"
                      className="min-w-[150px]"
                    >
                      {analyzing ? (
                        <>
                          <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                          Analyzing...
                        </>
                      ) : (
                        <>
                          <Search className="mr-2 h-5 w-5" />
                          Analyze
                        </>
                      )}
                    </Button>
                  </div>
                  <p className="mt-2 text-xs text-muted-foreground">
                    Enter the homepage or any listing page URL
                  </p>
                </div>
              </div>

              <div className="rounded-lg border bg-muted/30 p-4">
                <h4 className="mb-2 font-medium">How it works:</h4>
                <ol className="list-inside list-decimal space-y-1 text-sm text-muted-foreground">
                  <li>Enter any movie website URL</li>
                  <li>We analyze and show total lifetime content count</li>
                  <li>Click "Import All" or enter a specific number</li>
                  <li>Sit back while we import everything automatically!</li>
                </ol>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Step 2: Show Analysis Results */}
        {step === "analyzed" && analysis && (
          <div className="space-y-6">
            {/* Website Info Card */}
            <Card className="border-2 border-primary/50">
              <CardHeader className="bg-gradient-to-r from-primary/10 to-purple-500/10">
                <CardTitle className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    {analysis.websiteLogo && (
                      <img
                        src={analysis.websiteLogo}
                        alt=""
                        className="h-10 w-10 rounded"
                        onError={(e) => (e.currentTarget.style.display = "none")}
                      />
                    )}
                    <div>
                      <h2 className="text-xl">{analysis.websiteTitle}</h2>
                      <p className="text-sm font-normal text-muted-foreground">
                        {analysis.baseUrl}
                      </p>
                    </div>
                  </div>
                  <Button variant="outline" size="sm" onClick={() => setStep("input")}>
                    Change Website
                  </Button>
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-6">
                {/* Total Content Box */}
                <div className="mb-6 rounded-xl bg-gradient-to-r from-green-500/20 to-emerald-500/20 p-6 text-center">
                  <p className="mb-1 text-sm text-muted-foreground">Total Lifetime Content</p>
                  <p className="text-5xl font-bold text-green-500">
                    {analysis.totalLifetimeEstimate.toLocaleString()}
                  </p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Files Available
                  </p>
                </div>

                {/* Stats Grid */}
                <div className="mb-6 grid grid-cols-3 gap-4">
                  <div className="rounded-lg bg-muted/50 p-4 text-center">
                    <Database className="mx-auto mb-2 h-6 w-6 text-blue-500" />
                    <p className="text-2xl font-bold">{analysis.moviesOnCurrentPage}</p>
                    <p className="text-xs text-muted-foreground">Per Page</p>
                  </div>
                  <div className="rounded-lg bg-muted/50 p-4 text-center">
                    <FolderOpen className="mx-auto mb-2 h-6 w-6 text-purple-500" />
                    <p className="text-2xl font-bold">{analysis.pagination.totalPages || "?"}</p>
                    <p className="text-xs text-muted-foreground">Total Pages</p>
                  </div>
                  <div className="rounded-lg bg-muted/50 p-4 text-center">
                    <Clock className="mx-auto mb-2 h-6 w-6 text-orange-500" />
                    <p className="text-2xl font-bold">~{analysis.importOptions.estimatedTime}</p>
                    <p className="text-xs text-muted-foreground">Minutes to Import All</p>
                  </div>
                </div>

                {/* Import Options */}
                <div className="space-y-4">
                  <h3 className="font-semibold">Import Options</h3>

                  {/* Skip Duplicates Toggle */}
                  <label className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg cursor-pointer hover:bg-muted/70 transition-colors">
                    <input
                      type="checkbox"
                      checked={skipDuplicates}
                      onChange={(e) => setSkipDuplicates(e.target.checked)}
                      className="h-5 w-5 rounded border-2 accent-primary"
                    />
                    <div className="flex-1">
                      <p className="font-medium">Skip Duplicate Movies</p>
                      <p className="text-sm text-muted-foreground">
                        Automatically skip movies that already exist in database
                      </p>
                    </div>
                  </label>

                  {/* Import All Button */}
                  <Button
                    onClick={() => handleStartImport()}
                    disabled={discovering}
                    size="lg"
                    className="w-full bg-gradient-to-r from-green-500 to-emerald-500 text-lg hover:from-green-600 hover:to-emerald-600"
                  >
                    {discovering ? (
                      <>
                        <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                        Discovering Movies...
                      </>
                    ) : (
                      <>
                        <Zap className="mr-2 h-5 w-5" />
                        Import All {analysis.totalLifetimeEstimate.toLocaleString()} Files
                      </>
                    )}
                  </Button>

                  {/* Custom Count Input */}
                  <div className="flex gap-2">
                    <Input
                      type="number"
                      value={importCount}
                      onChange={(e) => setImportCount(e.target.value)}
                      placeholder="Enter specific number (e.g., 100)"
                      className="flex-1"
                      min="1"
                    />
                    <Button
                      onClick={() => {
                        const count = parseInt(importCount);
                        if (count > 0) handleStartImport(count);
                      }}
                      disabled={!importCount || discovering}
                      variant="outline"
                      className="min-w-[150px]"
                    >
                      <Download className="mr-2 h-4 w-4" />
                      Import {importCount || "N"}
                    </Button>
                  </div>

                  {/* Quick Select Buttons */}
                  <div className="flex flex-wrap gap-2">
                    {[10, 25, 50, 100, 250, 500].map((num) => (
                      <Button
                        key={num}
                        variant="outline"
                        size="sm"
                        onClick={() => setImportCount(num.toString())}
                        className={importCount === num.toString() ? "border-primary bg-primary/10" : ""}
                      >
                        {num}
                      </Button>
                    ))}
                  </div>
                </div>

                {/* Categories & Years */}
                {(analysis.categories.length > 0 || analysis.years.length > 0) && (
                  <div className="mt-6 space-y-4">
                    <h3 className="font-semibold">Filter by Category/Year</h3>

                    {/* Categories */}
                    {analysis.categories.length > 0 && (
                      <div>
                        <p className="mb-2 text-sm text-muted-foreground">
                          <Tag className="mr-1 inline h-4 w-4" />
                          Categories:
                        </p>
                        <div className="flex flex-wrap gap-2">
                          {analysis.categories.map((cat) => (
                            <Button
                              key={cat.name}
                              variant="outline"
                              size="sm"
                              onClick={() => setSelectedCategory(
                                selectedCategory === cat.name ? null : cat.name
                              )}
                              className={selectedCategory === cat.name ? "border-primary bg-primary/10" : ""}
                            >
                              {cat.name}
                              {cat.count && (
                                <span className="ml-1 text-xs text-muted-foreground">
                                  ({cat.count})
                                </span>
                              )}
                            </Button>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Years */}
                    {analysis.years.length > 0 && (
                      <div>
                        <p className="mb-2 text-sm text-muted-foreground">
                          <Calendar className="mr-1 inline h-4 w-4" />
                          Years:
                        </p>
                        <div className="flex flex-wrap gap-2">
                          {analysis.years.map((year) => (
                            <Button
                              key={year.year}
                              variant="outline"
                              size="sm"
                              onClick={() => setSelectedYear(
                                selectedYear === year.year ? null : year.year
                              )}
                              className={selectedYear === year.year ? "border-primary bg-primary/10" : ""}
                            >
                              {year.year}
                              {year.count && (
                                <span className="ml-1 text-xs text-muted-foreground">
                                  ({year.count})
                                </span>
                              )}
                            </Button>
                          ))}
                        </div>
                      </div>
                    )}

                    {(selectedCategory || selectedYear) && (
                      <div className="rounded-lg bg-blue-500/10 p-3 text-sm text-blue-500">
                        <strong>Filter Active:</strong> Will import from{" "}
                        {selectedCategory && <span className="font-medium">{selectedCategory}</span>}
                        {selectedCategory && selectedYear && " / "}
                        {selectedYear && <span className="font-medium">{selectedYear}</span>}
                        <Button
                          variant="ghost"
                          size="sm"
                          className="ml-2 h-auto p-1"
                          onClick={() => {
                            setSelectedCategory(null);
                            setSelectedYear(null);
                          }}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}

        {/* Step 3: Importing Progress */}
        {(step === "importing" || step === "done") && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <Download className="h-5 w-5" />
                  {step === "done" ? "Import Complete!" : "Importing..."}
                </span>
                {step === "importing" && (
                  <Button variant="outline" size="sm" onClick={togglePause}>
                    {isPaused ? (
                      <>
                        <Play className="mr-1 h-4 w-4" /> Resume
                      </>
                    ) : (
                      <>
                        <Pause className="mr-1 h-4 w-4" /> Pause
                      </>
                    )}
                  </Button>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {/* Discovery Progress */}
              {discovering && (
                <div className="mb-6 rounded-lg bg-blue-500/10 p-4">
                  <div className="flex items-center gap-3">
                    <Loader2 className="h-5 w-5 animate-spin text-blue-500" />
                    <div>
                      <p className="font-medium text-blue-500">Discovering movies...</p>
                      <p className="text-sm text-muted-foreground">
                        Found {totalDiscovered} movies so far
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Stats Grid */}
              <div className="mb-6 grid grid-cols-4 gap-4">
                <div className="rounded-lg bg-muted/50 p-3 text-center">
                  <p className="text-2xl font-bold">{scrapingQueue.length}</p>
                  <p className="text-xs text-muted-foreground">Total</p>
                </div>
                <div className="rounded-lg bg-green-500/10 p-3 text-center">
                  <p className="text-2xl font-bold text-green-500">{successCount}</p>
                  <p className="text-xs text-muted-foreground">Success</p>
                </div>
                <div className="rounded-lg bg-red-500/10 p-3 text-center">
                  <p className="text-2xl font-bold text-red-500">{errorCount}</p>
                  <p className="text-xs text-muted-foreground">Failed</p>
                </div>
                <div className="rounded-lg bg-yellow-500/10 p-3 text-center">
                  <p className="text-2xl font-bold text-yellow-500">
                    {scrapingQueue.filter(m => m.status === "pending").length}
                  </p>
                  <p className="text-xs text-muted-foreground">Pending</p>
                </div>
              </div>

              {/* Progress Bar */}
              <div className="mb-4">
                <div className="h-3 overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full bg-gradient-to-r from-green-500 to-emerald-500 transition-all"
                    style={{
                      width: `${((successCount + errorCount) / Math.max(scrapingQueue.length, 1)) * 100}%`
                    }}
                  />
                </div>
                <p className="mt-1 text-sm text-muted-foreground">
                  {successCount + errorCount} of {scrapingQueue.length} processed
                  {scrapingQueue.length > 0 && (
                    <span className="ml-2">
                      (~{Math.ceil((scrapingQueue.length - successCount - errorCount) * 3 / 60)} min remaining)
                    </span>
                  )}
                </p>
              </div>

              {/* Movie List */}
              <div className="max-h-[400px] space-y-2 overflow-y-auto">
                {scrapingQueue.map((movie, i) => (
                  <div
                    key={i}
                    className={`flex items-center gap-3 rounded-lg border p-3 ${
                      movie.status === "scraping" ? "border-primary bg-primary/5" : ""
                    }`}
                  >
                    {movie.status === "pending" && (
                      <div className="h-5 w-5 rounded-full border-2" />
                    )}
                    {movie.status === "scraping" && (
                      <Loader2 className="h-5 w-5 animate-spin text-primary" />
                    )}
                    {movie.status === "success" && (
                      <Check className="h-5 w-5 text-green-500" />
                    )}
                    {movie.status === "error" && (
                      <X className="h-5 w-5 text-red-500" />
                    )}
                    <div className="flex-1">
                      <p className="font-medium line-clamp-1">{movie.title}</p>
                      {movie.status === "error" && (
                        <p className="text-xs text-red-500">{movie.error}</p>
                      )}
                    </div>
                    {movie.savedId && (
                      <Link
                        href={`/admin/movies/${movie.savedId}/edit`}
                        className="text-xs text-primary hover:underline"
                      >
                        Edit
                      </Link>
                    )}
                  </div>
                ))}
              </div>

              {/* Done Actions */}
              {step === "done" && (
                <div className="mt-6 space-y-4">
                  {successCount > 0 && (
                    <Button
                      className="w-full bg-green-600 hover:bg-green-700"
                      onClick={async () => {
                        const ids = scrapingQueue
                          .filter(m => m.status === "success" && m.savedId)
                          .map(m => m.savedId as number);

                        if (ids.length === 0) return;
                        if (!confirm(`Publish all ${ids.length} imported movies?`)) return;

                        try {
                          const res = await fetch("/api/movies/bulk", {
                            method: "POST",
                            headers: { "Content-Type": "application/json" },
                            credentials: "include",
                            body: JSON.stringify({ action: "publish", ids }),
                          });
                          const data = await res.json();
                          if (data.success) {
                            alert(`Successfully published ${data.count} movies!`);
                          } else {
                            alert(data.error || "Failed to publish");
                          }
                        } catch {
                          alert("Failed to publish movies");
                        }
                      }}
                    >
                      <Check className="mr-2 h-4 w-4" />
                      Publish All {successCount} Movies
                    </Button>
                  )}

                  <div className="flex gap-2">
                    <Button onClick={() => router.push("/admin/movies")}>
                      View All Movies
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => {
                        setStep("input");
                        setScrapingQueue([]);
                        setAnalysis(null);
                        setDiscoveredMovies([]);
                      }}
                    >
                      Import More
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
