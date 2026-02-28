"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
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
  Calendar,
  Download,
  Play,
  Pause,
  ArrowLeft,
  RefreshCw,
} from "lucide-react";
import Link from "next/link";

interface DiscoveredMovie {
  title: string;
  url: string;
  year?: string;
  posterUrl?: string;
}

interface ScrapedMovie {
  title: string;
  url: string;
  description: string;
  posterUrl: string;
  backdropUrl: string;
  trailerUrl: string;
  screenshots: string[];
  downloadLinks: { quality: string; language: string; url: string }[];
  genres: string[];
  releaseYear: string;
  runtime: string;
  rating: string;
  director: string;
  keywords: string[];
  status: "pending" | "scraping" | "success" | "error";
  error?: string;
  savedId?: number;
}

// Category options for quick access
const CATEGORY_OPTIONS = [
  { label: "Bollywood", value: "bollywood", keywords: ["bollywood", "hindi"] },
  { label: "Hollywood", value: "hollywood", keywords: ["hollywood", "english"] },
  { label: "South Indian", value: "south", keywords: ["tamil", "telugu", "malayalam", "kannada", "south"] },
  { label: "Web Series", value: "webseries", keywords: ["web-series", "webseries", "series", "netflix", "amazon"] },
  { label: "Trending", value: "trending", keywords: ["trending", "popular", "latest", "new"] },
  { label: "Dubbed", value: "dubbed", keywords: ["dubbed", "dual-audio", "hindi-dubbed"] },
];

export default function BulkScrapingPage() {
  const router = useRouter();
  const [step, setStep] = useState<"input" | "years" | "movies" | "scraping" | "done">("input");
  
  // Step 1: Website URL
  const [websiteUrl, setWebsiteUrl] = useState("");
  const [discovering, setDiscovering] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState("");
  const [scrapeMode, setScrapeMode] = useState<"years" | "direct" | "category">("years");
  
  // Step 2: Years
  const [availableYears, setAvailableYears] = useState<{ year: string; count: number; url: string }[]>([]);
  const [selectedYear, setSelectedYear] = useState("");
  
  // Step 3: Movies List
  const [discoveredMovies, setDiscoveredMovies] = useState<DiscoveredMovie[]>([]);
  const [selectedMovies, setSelectedMovies] = useState<Set<string>>(new Set());
  const [loadingMovies, setLoadingMovies] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [loadingMoreMovies, setLoadingMoreMovies] = useState(false);
  const [loadingAllPages, setLoadingAllPages] = useState(false);
  const [quantityInput, setQuantityInput] = useState("");
  const [selectedYearUrl, setSelectedYearUrl] = useState("");
  const [existingMovieTitles, setExistingMovieTitles] = useState<Set<string>>(new Set());
  const [hideDuplicates, setHideDuplicates] = useState(true);
  const [paginationInfo, setPaginationInfo] = useState<{
    hasNextPage: boolean;
    nextPageUrl: string | null;
    currentPage: number;
    totalPages: number | null;
    pagePattern: string | null;
  } | null>(null);
  const [totalCount, setTotalCount] = useState<number | null>(null);
  
  // Step 4: Scraping
  const [scrapingQueue, setScrapingQueue] = useState<ScrapedMovie[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isScraping, setIsScraping] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // Fetch existing movies to detect duplicates - fetch ALL movies
  const fetchExistingMovies = async () => {
    try {
      // Fetch all movies in batches
      let allMovies: { title: string; slug: string }[] = [];
      let page = 1;
      let hasMore = true;

      while (hasMore) {
        const res = await fetch(`/api/movies?page=${page}&pageSize=100`, {
          credentials: "include",
        });
        const data = await res.json();
        
        if (data.success && data.data.movies) {
          allMovies = [...allMovies, ...data.data.movies];
          hasMore = data.data.movies.length === 100 && page < data.data.totalPages;
          page++;
        } else {
          hasMore = false;
        }
      }

      // Create normalized sets for both titles and slugs
      const titles = new Set<string>();
      const slugs = new Set<string>();

      allMovies.forEach((m: { title: string; slug: string }) => {
        // Normalize title - remove special chars, year, quality info
        const normalizedTitle = m.title
          .toLowerCase()
          .replace(/\(\d{4}\)|\[\d{4}\]/g, "") // Remove years
          .replace(/\s*(480p|720p|1080p|4k|hdrip|webrip|bluray|hindi|english|dual audio|dubbed|season|complete).*$/gi, "") // Remove quality/language
          .replace(/[^a-z0-9]/g, "")
          .trim();
        
        if (normalizedTitle) {
          titles.add(normalizedTitle);
        }

        // Also check by slug
        if (m.slug) {
          slugs.add(m.slug.toLowerCase());
        }
      });

      setExistingMovieTitles(titles);
      // Store slugs in a separate state or combine
      (window as any).__existingMovieSlugs = slugs;
      
      console.log(`Loaded ${allMovies.length} existing movies for duplicate detection`);
    } catch (err) {
      console.error("Failed to fetch existing movies:", err);
    }
  };

  // Extract genre from URL (same logic as backend)
  const extractGenreFromUrl = (url: string): string | null => {
    try {
      const genrePatterns = [
        /\/genre\/([^\/\?]+)\/?/i,
        /\/category\/([^\/\?]+)\/?/i,
        /\/tag\/([^\/\?]+)\/?/i,
        /\/movies\/([^\/\?]+)\/?/i,
      ];
      
      for (const pattern of genrePatterns) {
        const match = url.match(pattern);
        if (match) {
          const genre = match[1].toLowerCase();
          if (!/^\d{4}$/.test(genre)) {
            return genre;
          }
        }
      }
      return null;
    } catch {
      return null;
    }
  };

  // Extract year from URL (same logic as backend)
  const extractYearFromUrl = (url: string): number | null => {
    try {
      const yearPatterns = [
        /\/release\/(\d{4})\//i,
        /\/(\d{4})\//,
        /\/year\/(\d{4})\//i,
        /\/movies\/(\d{4})\//i,
        /\/film\/(\d{4})\//i,
        /\/(\d{4})\/?$/i,
      ];
      
      for (const pattern of yearPatterns) {
        const match = url.match(pattern);
        if (match) {
          const year = parseInt(match[1]);
          if (year >= 1900 && year <= 2100) {
            return year;
          }
        }
      }
      
      try {
        const urlObj = new URL(url);
        const yearParam = urlObj.searchParams.get("year") || urlObj.searchParams.get("y");
        if (yearParam) {
          const year = parseInt(yearParam);
          if (year >= 1900 && year <= 2100) {
            return year;
          }
        }
      } catch {
        // Not a valid URL
      }
      
      return null;
    } catch {
      return null;
    }
  };

  // Check if movie already exists - improved matching
  const isMovieDuplicate = (title: string, url?: string): boolean => {
    // Normalize title the same way
    const normalizedTitle = title
      .toLowerCase()
      .replace(/\(\d{4}\)|\[\d{4}\]/g, "") // Remove years
      .replace(/\s*(480p|720p|1080p|4k|hdrip|webrip|bluray|hindi|english|dual audio|dubbed|season|complete).*$/gi, "") // Remove quality/language
      .replace(/[^a-z0-9]/g, "")
      .trim();
    
    if (normalizedTitle && existingMovieTitles.has(normalizedTitle)) {
      return true;
    }

    // Also check by slug if we can generate it
    if (url) {
      try {
        // Try to extract slug from URL or generate from title
        const urlSlug = url.split('/').filter(Boolean).pop()?.toLowerCase() || '';
        const titleSlug = title
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, '-')
          .replace(/^-|-$/g, '');
        
        const existingSlugs = (window as any).__existingMovieSlugs as Set<string> || new Set();
        if (existingSlugs.has(urlSlug) || existingSlugs.has(titleSlug)) {
          return true;
        }
      } catch (e) {
        // Ignore slug check errors
      }
    }

    return false;
  };

  // Filter out duplicates from discovered movies - always hide by default
  const filteredMovies = hideDuplicates 
    ? discoveredMovies.filter(m => !isMovieDuplicate(m.title, m.url))
    : discoveredMovies;
  
  const duplicateCount = discoveredMovies.length - filteredMovies.length;

  // Step 1: Discover years from website
  const handleDiscoverYears = async () => {
    if (!websiteUrl.trim()) {
      setError("Please enter a website URL");
      return;
    }

    setDiscovering(true);
    setError("");
    
    // Fetch existing movies for duplicate detection
    await fetchExistingMovies();

    try {
      const res = await fetch("/api/scraping/bulk/discover", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ url: websiteUrl, type: "years" }),
      });
      const data = await res.json();

      if (data.success && data.years?.length > 0) {
        setAvailableYears(data.years);
        setStep("years");
      } else {
        setError(data.error || "Could not find year categories on this website");
      }
    } catch (err) {
      setError("Failed to analyze website. Please check the URL.");
    } finally {
      setDiscovering(false);
    }
  };

  // Direct scraping - skip year selection
  const handleDirectScrape = async () => {
    if (!websiteUrl.trim()) {
      setError("Please enter a website URL");
      return;
    }

    setDiscovering(true);
    setError("");
    setSelectedYear("Direct");
    setSelectedYearUrl(websiteUrl);
    setCurrentPage(1);
    
    // Fetch existing movies for duplicate detection
    await fetchExistingMovies();

    try {
      const res = await fetch("/api/scraping/bulk/discover", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ url: websiteUrl, type: "movies", page: 1 }),
      });
      const data = await res.json();

      if (data.success && data.movies?.length > 0) {
        setDiscoveredMovies(data.movies);
        setSelectedMovies(new Set());
        setPaginationInfo(data.pagination || null);
        setTotalCount(data.totalCount || null);
        setStep("movies");
        setError(""); // Clear any previous errors
        
        // Show year filter info if applied
        if (data.yearFilter) {
          setSuccess(`✅ Year ${data.yearFilter} detected! Showing only ${data.yearFilter} movies. Found ${data.movies.length} movies on this page. Use "Import All Files" to scrape all pages.`);
        }
      } else {
        const errorMsg = data.error || "Could not find movies on this page";
        let detailedError = errorMsg;
        
        if (data.debug) {
          detailedError += ` (Found ${data.debug.linkCount || 0} links on page)`;
        }
        
        setError(detailedError);
        console.error("Movie discovery failed:", data);
      }
    } catch (err) {
      setError("Failed to discover movies. Please check the URL.");
    } finally {
      setDiscovering(false);
    }
  };

  // Category-based scraping
  const handleCategoryScrape = async (category: string) => {
    if (!websiteUrl.trim()) {
      setError("Please enter a website URL first");
      return;
    }

    setDiscovering(true);
    setError("");
    setSelectedCategory(category);
    setSelectedYear(category.charAt(0).toUpperCase() + category.slice(1));
    setCurrentPage(1);
    
    // Fetch existing movies for duplicate detection
    await fetchExistingMovies();

    // Try common URL patterns for the category
    const baseUrl = websiteUrl.replace(/\/$/, "");
    const categoryUrls = [
      `${baseUrl}/${category}`,
      `${baseUrl}/category/${category}`,
      `${baseUrl}/genre/${category}`,
      `${baseUrl}/tag/${category}`,
      `${baseUrl}/${category}-movies`,
    ];

    let foundMovies = false;
    for (const url of categoryUrls) {
      try {
        const res = await fetch("/api/scraping/bulk/discover", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ url, type: "movies", page: 1 }),
        });
        const data = await res.json();

        if (data.success && data.movies?.length > 0) {
          setDiscoveredMovies(data.movies);
          setSelectedMovies(new Set());
          setSelectedYearUrl(url);
          setPaginationInfo(data.pagination || null);
          setTotalCount(data.totalCount || null);
          setStep("movies");
          foundMovies = true;
          break;
        }
      } catch {
        continue;
      }
    }

    if (!foundMovies) {
      setError(`Could not find ${category} category on this website. Try using direct scrape.`);
    }
    
    setDiscovering(false);
  };

  // Step 2: Load movies for selected year
  const handleSelectYear = async (year: string, yearUrl: string) => {
    setSelectedYear(year);
    setSelectedYearUrl(yearUrl);
    setLoadingMovies(true);
    setError("");
    setCurrentPage(1);
    
    // Fetch existing movies for duplicate detection
    await fetchExistingMovies();

    try {
      const res = await fetch("/api/scraping/bulk/discover", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ url: yearUrl, type: "movies", page: 1 }),
      });
      const data = await res.json();

      if (data.success && data.movies?.length > 0) {
        setDiscoveredMovies(data.movies);
        setSelectedMovies(new Set()); // Don't auto-select all
        setPaginationInfo(data.pagination || null);
        setTotalCount(data.totalCount || null);
        setStep("movies");
        setError(""); // Clear any previous errors
      } else {
        const errorMsg = data.error || "Could not find movies for this year";
        let detailedError = errorMsg;
        
        if (data.debug) {
          detailedError += ` (Found ${data.debug.linkCount || 0} links on page)`;
        }
        
        setError(detailedError);
        console.error("Movie discovery failed:", data);
      }
    } catch (err) {
      setError("Failed to load movies");
    } finally {
      setLoadingMovies(false);
    }
  };

  // Load more movies (next page) - improved with pagination detection
  const handleLoadMoreMovies = async () => {
    if (!selectedYearUrl) {
      setError("No URL selected");
      return;
    }
    
    setLoadingMoreMovies(true);
    setError(""); // Clear previous errors
    setSuccess(""); // Clear previous success
    const nextPage = currentPage + 1;

    console.log("Loading page:", nextPage);
    console.log("Current URL:", selectedYearUrl);
    console.log("Pagination info:", paginationInfo);

    try {
      // Build pagination URLs based on detected pattern
      let paginationUrls: string[] = [];
      
      if (paginationInfo?.nextPageUrl) {
        // Use detected next page URL
        paginationUrls = [paginationInfo.nextPageUrl];
        console.log("Using detected next page URL:", paginationInfo.nextPageUrl);
      } else if (paginationInfo?.pagePattern === "query") {
        // Query parameter pattern: ?page=2
        const urlObj = new URL(selectedYearUrl);
        urlObj.searchParams.set("page", nextPage.toString());
        paginationUrls = [urlObj.toString()];
        console.log("Using query pattern:", urlObj.toString());
      } else if (paginationInfo?.pagePattern === "movies-path") {
        // Movies path pattern: /movies/page/2/
        const cleanUrl = selectedYearUrl.replace(/\/movies\/page\/\d+/i, '').replace(/\/page\/\d+/i, '').replace(/\/$/, '');
        paginationUrls = [`${cleanUrl}/movies/page/${nextPage}/`];
        console.log("Using movies-path pattern:", paginationUrls[0]);
      } else if (paginationInfo?.pagePattern === "genre-path" ||
                 selectedYearUrl.includes('/genre/') ||
                 selectedYearUrl.includes('/category/') ||
                 selectedYearUrl.includes('/tag/')) {
        // Genre path pattern: /genre/hindi-dubbed/page/2/
        const cleanUrl = selectedYearUrl.replace(/\/page\/\d+\/?/i, '').replace(/\/$/, '');
        paginationUrls = [`${cleanUrl}/page/${nextPage}/`];
        console.log("Using genre-path pattern:", paginationUrls[0]);
      } else if (paginationInfo?.pagePattern === "path") {
        // Path pattern: /page/2 or /page/2/
        const cleanUrl = selectedYearUrl.replace(/\/page[\/\-]?\d+/i, '').replace(/\/$/, '');
        paginationUrls = [`${cleanUrl}/page/${nextPage}/`, `${cleanUrl}/page/${nextPage}`];
        console.log("Using path pattern:", paginationUrls[0]);
      } else {
        // Try common pagination patterns as fallback - more aggressive
        const baseUrl = selectedYearUrl.split('?')[0].replace(/\/$/, ''); // Remove query params and trailing slash
        const urlObj = new URL(selectedYearUrl);
        
        // Check if URL has /movies/ or /genre/ in it
        const hasMoviesPath = baseUrl.includes('/movies/');
        const hasGenrePath = baseUrl.includes('/genre/') || baseUrl.includes('/category/');
        
        paginationUrls = [
          // Movies path patterns: /movies/page/2/
          ...(hasMoviesPath ? [
            `${baseUrl.replace(/\/page\/\d+.*$/, '')}/movies/page/${nextPage}/`,
            `${baseUrl.replace(/\/page\/\d+.*$/, '')}/page/${nextPage}/`,
          ] : []),
          // Genre path patterns: /genre/hindi-dubbed/page/2/
          ...(hasGenrePath ? [
            `${baseUrl.replace(/\/page\/\d+.*$/, '')}/page/${nextPage}/`,
          ] : []),
          // Standard path-based patterns
          `${baseUrl}/page/${nextPage}/`,
          `${baseUrl}/page/${nextPage}`,
          `${baseUrl}/page-${nextPage}`,
          `${baseUrl}/page${nextPage}`,
          `${baseUrl}/${nextPage}/`,
          `${baseUrl}/${nextPage}`,
          `${baseUrl}/p${nextPage}`,
          `${baseUrl}/p/${nextPage}/`,
          // Query-based patterns
          `${baseUrl}?page=${nextPage}`,
          `${baseUrl}?p=${nextPage}`,
          `${baseUrl}?paged=${nextPage}`,
          // With existing query params
          urlObj.search ? `${selectedYearUrl}&page=${nextPage}` : `${selectedYearUrl}?page=${nextPage}`,
          urlObj.search ? `${selectedYearUrl}&p=${nextPage}` : `${selectedYearUrl}?p=${nextPage}`,
          urlObj.search ? `${selectedYearUrl}&paged=${nextPage}` : `${selectedYearUrl}?paged=${nextPage}`,
          // WordPress patterns
          `${baseUrl}/?paged=${nextPage}`,
        ];
        console.log("Trying fallback patterns:", paginationUrls.slice(0, 3));
      }

      let foundMovies = false;
      let lastError = "";

      for (const url of paginationUrls) {
        try {
          console.log("Trying URL:", url);
          const res = await fetch("/api/scraping/bulk/discover", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            credentials: "include",
            body: JSON.stringify({ url, type: "movies", page: nextPage }),
          });
          const data = await res.json();
          console.log("Response:", { success: data.success, moviesCount: data.movies?.length, error: data.error });

          if (data.success) {
            // Update pagination info even if no movies found
            if (data.pagination) {
              setPaginationInfo(data.pagination);
            }
            
            if (data.movies?.length > 0) {
              // Apply year filter if specified
              let filteredMovies = data.movies;
              if (data.yearFilter) {
                filteredMovies = data.movies.filter((m: DiscoveredMovie) => {
                  // Check year in URL
                  const movieYearFromUrl = extractYearFromUrl(m.url);
                  if (movieYearFromUrl && movieYearFromUrl === data.yearFilter) {
                    return true;
                  }
                  
                  // Check year in title
                  const movieYearFromTitle = m.title.match(/\b(19|20)\d{2}\b/);
                  if (movieYearFromTitle && parseInt(movieYearFromTitle[0]) === data.yearFilter) {
                    return true;
                  }
                  
                  // Check year field
                  if (m.year && parseInt(m.year) === data.yearFilter) {
                    return true;
                  }
                  
                  return false;
                });
                
                if (filteredMovies.length < data.movies.length) {
                  console.log(`Year filter ${data.yearFilter}: ${data.movies.length} -> ${filteredMovies.length} movies`);
                }
              }
              
              // Filter out duplicates by URL and by title
              const existingUrls = new Set(discoveredMovies.map(m => m.url));
              const newMovies = filteredMovies.filter((m: DiscoveredMovie) => {
                // Check URL duplicate
                if (existingUrls.has(m.url)) return false;
                // Check title duplicate if hideDuplicates is enabled
                if (hideDuplicates && isMovieDuplicate(m.title, m.url)) return false;
                return true;
              });
              
              if (newMovies.length > 0) {
                setDiscoveredMovies(prev => [...prev, ...newMovies]);
                setCurrentPage(nextPage);
                setPaginationInfo(data.pagination || paginationInfo);
                foundMovies = true;
                setError(""); // Clear error on success
                setSuccess(`Loaded ${newMovies.length} new movies from page ${nextPage}`);
                break;
              } else if (data.movies.length > 0) {
                // Movies found but all were duplicates
                lastError = `Page ${nextPage} found ${data.movies.length} movies, but all are duplicates`;
                // Still update page number even if all duplicates
                setCurrentPage(nextPage);
                setPaginationInfo(data.pagination || paginationInfo);
              }
            } else {
              // No movies found - might be end of pagination
              lastError = `Page ${nextPage} returned no movies`;
            }
          } else if (data.error) {
            lastError = data.error;
          }
        } catch (fetchErr) {
          lastError = `Failed to fetch: ${url}`;
          continue; // Try next URL pattern
        }
      }

      if (!foundMovies) {
        if (lastError) {
          setError(lastError);
        } else {
          setError(`No more movies found on page ${nextPage}. Try a different page number or check if pagination exists.`);
        }
      }
    } catch (err) {
      setError(`Failed to load more movies: ${err instanceof Error ? err.message : 'Unknown error'}`);
    } finally {
      setLoadingMoreMovies(false);
    }
  };

  // Import all files - automatically load all pages
  const handleImportAllFiles = async () => {
    if (!selectedYearUrl) return;
    
    if (!confirm(`This will automatically load ALL pages from the website. This may take a while. Continue?`)) {
      return;
    }

    setLoadingAllPages(true);
    setError("");
    let allMovies: DiscoveredMovie[] = [...discoveredMovies];
    let page = currentPage;
    let hasMore = true;
    const maxPages = paginationInfo?.totalPages || 1000; // Safety limit
    const existingUrls = new Set(discoveredMovies.map(m => m.url));
    let consecutiveEmptyPages = 0; // Track consecutive pages with no new movies
    const maxConsecutiveEmpty = 5; // Stop after 5 consecutive empty/duplicate pages

    try {
      while (hasMore && page < maxPages) {
        const nextPage = page + 1;
        
        // Build URL for next page
        let nextPageUrl = "";
        // Clean the URL - remove existing page patterns and trailing slashes
        const baseUrl = selectedYearUrl
          .split('?')[0]
          .replace(/\/page\/\d+\/?$/i, '')
          .replace(/\/page-\d+\/?$/i, '')
          .replace(/\/\d+\/?$/, '')
          .replace(/\/$/, '');
        const hasMoviesPath = baseUrl.includes('/movies/');
        const hasGenrePath = baseUrl.includes('/genre/') || baseUrl.includes('/category/') || baseUrl.includes('/tag/');

        console.log(`Building pagination URL: page=${nextPage}, baseUrl=${baseUrl}, pattern=${paginationInfo?.pagePattern}, hasGenrePath=${hasGenrePath}`);

        if (paginationInfo?.pagePattern === "query") {
          const urlObj = new URL(selectedYearUrl);
          urlObj.searchParams.set("page", nextPage.toString());
          nextPageUrl = urlObj.toString();
        } else if (paginationInfo?.pagePattern === "movies-path") {
          nextPageUrl = `${baseUrl}/movies/page/${nextPage}/`;
        } else if (paginationInfo?.pagePattern === "genre-path" || hasGenrePath) {
          // For genre/category pages, use /page/N/ pattern
          nextPageUrl = `${baseUrl}/page/${nextPage}/`;
        } else if (paginationInfo?.pagePattern === "path") {
          nextPageUrl = `${baseUrl}/page/${nextPage}/`;
        } else if (hasMoviesPath) {
          nextPageUrl = `${baseUrl}/movies/page/${nextPage}/`;
        } else {
          nextPageUrl = `${baseUrl}/page/${nextPage}/`;
        }

        console.log(`Next page URL: ${nextPageUrl}`);

        try {
          const res = await fetch("/api/scraping/bulk/discover", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            credentials: "include",
            body: JSON.stringify({ url: nextPageUrl, type: "movies", page: nextPage }),
          });
          const data = await res.json();

          if (data.success && data.movies?.length > 0) {
            // Apply year filter if specified
            let filteredMovies = data.movies;
            if (data.yearFilter) {
              filteredMovies = data.movies.filter((m: DiscoveredMovie) => {
                const movieYearFromUrl = extractYearFromUrl(m.url);
                if (movieYearFromUrl && movieYearFromUrl === data.yearFilter) return true;
                
                const movieYearFromTitle = m.title.match(/\b(19|20)\d{2}\b/);
                if (movieYearFromTitle && parseInt(movieYearFromTitle[0]) === data.yearFilter) return true;
                
                if (m.year && parseInt(m.year) === data.yearFilter) return true;
                return false;
              });
            }
            
            // Filter duplicates
            const newMovies = filteredMovies.filter((m: DiscoveredMovie) => {
              if (existingUrls.has(m.url)) return false;
              if (hideDuplicates && isMovieDuplicate(m.title, m.url)) return false;
              existingUrls.add(m.url);
              return true;
            });

            if (newMovies.length > 0) {
              allMovies = [...allMovies, ...newMovies];
              setDiscoveredMovies(allMovies);
              setCurrentPage(nextPage);
              setPaginationInfo(data.pagination || paginationInfo);
              consecutiveEmptyPages = 0; // Reset counter when we find new movies
            } else {
              // Page had movies but all were duplicates
              consecutiveEmptyPages++;
              console.log(`Page ${nextPage}: all ${data.movies.length} movies are duplicates (${consecutiveEmptyPages}/${maxConsecutiveEmpty} consecutive)`);
            }

            // Check if there's a next page - continue even if current page had all duplicates
            if (data.pagination?.hasNextPage === false) {
              hasMore = false;
            } else if (consecutiveEmptyPages >= maxConsecutiveEmpty) {
              console.log(`Stopping: ${maxConsecutiveEmpty} consecutive pages with no new movies`);
              hasMore = false;
            } else {
              page = nextPage;
            }
          } else {
            // No more pages
            hasMore = false;
          }
        } catch (fetchErr) {
          // Try alternative URL patterns
          const altUrls = [
            `${selectedYearUrl}?page=${nextPage}`,
            `${selectedYearUrl}/page${nextPage}`,
            `${selectedYearUrl}/${nextPage}`,
          ];

          let found = false;
          for (const altUrl of altUrls) {
            try {
              const res = await fetch("/api/scraping/bulk/discover", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                credentials: "include",
                body: JSON.stringify({ url: altUrl, type: "movies", page: nextPage }),
              });
              const data = await res.json();

              if (data.success && data.movies?.length > 0) {
                // Apply year filter if specified
                let filteredMovies = data.movies;
                if (data.yearFilter) {
                  filteredMovies = data.movies.filter((m: DiscoveredMovie) => {
                    const movieYearFromUrl = extractYearFromUrl(m.url);
                    if (movieYearFromUrl && movieYearFromUrl === data.yearFilter) return true;
                    
                    const movieYearFromTitle = m.title.match(/\b(19|20)\d{2}\b/);
                    if (movieYearFromTitle && parseInt(movieYearFromTitle[0]) === data.yearFilter) return true;
                    
                    if (m.year && parseInt(m.year) === data.yearFilter) return true;
                    return false;
                  });
                }
                
                const newMovies = filteredMovies.filter((m: DiscoveredMovie) => {
                  if (existingUrls.has(m.url)) return false;
                  if (hideDuplicates && isMovieDuplicate(m.title, m.url)) return false;
                  existingUrls.add(m.url);
                  return true;
                });

                if (newMovies.length > 0) {
                  allMovies = [...allMovies, ...newMovies];
                  setDiscoveredMovies(allMovies);
                  setCurrentPage(nextPage);
                  setPaginationInfo(data.pagination || paginationInfo);
                  consecutiveEmptyPages = 0;
                  page = nextPage;
                  found = true;
                  break;
                } else {
                  // Page had movies but all duplicates - continue to next
                  consecutiveEmptyPages++;
                  console.log(`Alt URL page ${nextPage}: all duplicates (${consecutiveEmptyPages}/${maxConsecutiveEmpty})`);
                  page = nextPage;
                  found = true; // Consider it found so we continue
                  break;
                }
              }
            } catch {
              continue;
            }
          }

          if (!found) {
            consecutiveEmptyPages++;
            if (consecutiveEmptyPages >= maxConsecutiveEmpty) {
              console.log(`Alt URL: Stopping after ${maxConsecutiveEmpty} consecutive empty pages`);
              hasMore = false;
            } else {
              page = nextPage; // Still move to next page
            }
          }
        }

        // Small delay to avoid overwhelming the server
        await new Promise(resolve => setTimeout(resolve, 500));
      }

      setSuccess(`Successfully loaded ${allMovies.length} movies from ${page} pages!`);
    } catch (err) {
      setError(`Error loading all pages: ${err instanceof Error ? err.message : 'Unknown error'}`);
    } finally {
      setLoadingAllPages(false);
      if (allMovies.length > discoveredMovies.length) {
        setSuccess(`✅ Imported ${allMovies.length - discoveredMovies.length} additional movies from ${page - currentPage} pages. Total: ${allMovies.length} movies.`);
      }
    }
  };

  // Select first N movies (from filtered list)
  const selectFirstN = (n: number) => {
    const urls = filteredMovies.slice(0, n).map(m => m.url);
    setSelectedMovies(new Set(urls));
  };

  // Select last N movies (from filtered list)
  const selectLastN = (n: number) => {
    const urls = filteredMovies.slice(-n).map(m => m.url);
    setSelectedMovies(new Set(urls));
  };

  // Select by quantity input
  const handleSelectByQuantity = () => {
    const qty = parseInt(quantityInput);
    if (isNaN(qty) || qty <= 0) {
      setError("Please enter a valid number");
      return;
    }
    selectFirstN(Math.min(qty, filteredMovies.length));
    setQuantityInput("");
  };

  // Toggle movie selection
  const toggleMovieSelection = (url: string) => {
    const newSelection = new Set(selectedMovies);
    if (newSelection.has(url)) {
      newSelection.delete(url);
    } else {
      newSelection.add(url);
    }
    setSelectedMovies(newSelection);
  };

  // Select/Deselect all (from filtered list)
  const toggleSelectAll = () => {
    if (filteredMovies.length === 0) {
      setError("No movies available to select");
      return;
    }
    
    if (selectedMovies.size === filteredMovies.length && 
        filteredMovies.every(m => selectedMovies.has(m.url))) {
      // Deselect all
      setSelectedMovies(new Set());
    } else {
      // Select all from filtered list
      const allUrls = new Set(filteredMovies.map(m => m.url));
      setSelectedMovies(allUrls);
      setSuccess(`Selected ${allUrls.size} movies`);
    }
  };

  // Start bulk scraping
  const handleStartScraping = () => {
    const moviesToScrape = discoveredMovies
      .filter(m => selectedMovies.has(m.url))
      .map(m => ({
        title: m.title,
        url: m.url,
        description: "",
        posterUrl: m.posterUrl || "",
        backdropUrl: "",
        trailerUrl: "",
        screenshots: [],
        downloadLinks: [],
        genres: [],
        releaseYear: m.year || selectedYear,
        runtime: "",
        rating: "",
        director: "",
        keywords: [],
        status: "pending" as const,
      }));

    setScrapingQueue(moviesToScrape);
    setCurrentIndex(0);
    setIsScraping(true);
    setIsPaused(false);
    setStep("scraping");
    
    // Start scraping first movie
    scrapeNextMovie(moviesToScrape, 0);
  };

  // Scrape next movie in queue
  const scrapeNextMovie = async (queue: ScrapedMovie[], index: number) => {
    if (index >= queue.length || isPaused) {
      setIsScraping(false);
      if (index >= queue.length) {
        setStep("done");
      }
      return;
    }

    const movie = queue[index];
    
    // Update status to scraping
    setScrapingQueue(prev => {
      const updated = [...prev];
      updated[index] = { ...updated[index], status: "scraping" };
      return updated;
    });

    try {
      // Scrape movie details
      const scrapeRes = await fetch("/api/scraping/url", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ url: movie.url }),
      });
      const scrapeData = await scrapeRes.json();

      if (scrapeData.success) {
        const scraped = scrapeData.data;

        // Generate meta description (truncate for SEO - max 160 chars)
        const metaDesc = scraped.description
          ? scraped.description.slice(0, 160).trim() + (scraped.description.length > 160 ? "..." : "")
          : "";

        // Save to database
        const saveRes = await fetch("/api/movies", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({
            title: scraped.title || movie.title,
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
          // Movie already exists - mark as skipped (success with note)
          setScrapingQueue(prev => {
            const updated = [...prev];
            updated[index] = {
              ...updated[index],
              ...scraped,
              status: "success",
              savedId: saveData.data.existingId,
              error: "Already exists - skipped",
            };
            return updated;
          });
          // Continue with next movie
          setCurrentIndex(index + 1);
          setTimeout(() => {
            scrapeNextMovie(queue, index + 1);
          }, 500); // Faster for skipped movies
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

          // Update status to success
          setScrapingQueue(prev => {
            const updated = [...prev];
            updated[index] = { 
              ...updated[index], 
              ...scraped,
              status: "success",
              savedId: movieId,
            };
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

    // Continue with next movie
    setCurrentIndex(index + 1);
    setTimeout(() => {
      scrapeNextMovie(queue, index + 1);
    }, 2000); // 2 second delay between requests
  };

  // Pause/Resume scraping
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
  const pendingCount = scrapingQueue.filter(m => m.status === "pending").length;

  return (
    <div>
      <Header title="Bulk Scraping" />

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

        {/* Error/Success Messages */}
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

        {/* Step 1: Enter Website URL */}
        {step === "input" && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Globe className="h-5 w-5" />
                Step 1: Enter Movie Website URL
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* URL Input */}
              <div>
                <Input
                  value={websiteUrl}
                  onChange={(e) => setWebsiteUrl(e.target.value)}
                  placeholder="Enter movie website URL (e.g., https://example.com)"
                  className="text-lg"
                />
                <p className="mt-2 text-sm text-muted-foreground">
                  Enter the homepage or any listing page URL of a movie website.
                </p>
              </div>

              {/* Scraping Options */}
              <div className="space-y-4 rounded-lg border bg-muted/30 p-4">
                <p className="font-medium">Choose Scraping Method:</p>
                
                {/* Method 1: Year-wise */}
                <div className="flex flex-wrap gap-2">
                  <Button onClick={handleDiscoverYears} disabled={discovering || !websiteUrl} size="lg">
                    {discovering ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <Calendar className="mr-2 h-4 w-4" />
                    )}
                    Discover by Year
                  </Button>
                  
                  {/* Method 2: Direct */}
                  <Button 
                    onClick={handleDirectScrape} 
                    disabled={discovering || !websiteUrl}
                    variant="outline"
                    size="lg"
                  >
                    {discovering ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <Download className="mr-2 h-4 w-4" />
                    )}
                    Direct Scrape (Skip Years)
                  </Button>
                </div>

                {/* Category Quick Access */}
                <div className="border-t pt-4">
                  <p className="mb-2 text-sm font-medium text-muted-foreground">Quick Category Access:</p>
                  <div className="flex flex-wrap gap-2">
                    {CATEGORY_OPTIONS.map((cat) => (
                      <Button
                        key={cat.value}
                        variant="outline"
                        size="sm"
                        onClick={() => handleCategoryScrape(cat.value)}
                        disabled={discovering || !websiteUrl}
                        className={cat.value === "trending" ? "border-orange-500 text-orange-500 hover:bg-orange-500/10" : ""}
                      >
                        {cat.value === "bollywood" && "🎬 "}
                        {cat.value === "hollywood" && "🎥 "}
                        {cat.value === "south" && "🎭 "}
                        {cat.value === "webseries" && "📺 "}
                        {cat.value === "trending" && "🔥 "}
                        {cat.value === "dubbed" && "🗣️ "}
                        {cat.label}
                      </Button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Info */}
              <div className="rounded-lg bg-blue-500/10 p-3 text-sm text-blue-500">
                <p className="font-medium">💡 Tips:</p>
                <ul className="mt-1 list-inside list-disc text-xs">
                  <li><strong>Discover by Year</strong> - Best for large sites with year archives</li>
                  <li><strong>Direct Scrape</strong> - Scrape any page directly without year selection</li>
                  <li><strong>Categories</strong> - Quick access to common categories</li>
                  <li>Already scraped movies will be automatically hidden</li>
                </ul>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Step 2: Select Year */}
        {step === "years" && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                Step 2: Select Year
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="mb-4 text-muted-foreground">
                Select a year to see available movies:
              </p>
              <div className="grid grid-cols-4 gap-3 sm:grid-cols-6 md:grid-cols-8">
                {availableYears.map((item) => (
                  <button
                    key={item.year}
                    onClick={() => handleSelectYear(item.year, item.url)}
                    disabled={loadingMovies}
                    className="flex flex-col items-center rounded-lg border p-3 transition-colors hover:border-primary hover:bg-primary/5"
                  >
                    <span className="text-lg font-bold">{item.year}</span>
                    {item.count > 0 && (
                      <span className="text-xs text-muted-foreground">{item.count} movies</span>
                    )}
                  </button>
                ))}
              </div>
              {loadingMovies && (
                <div className="mt-4 flex items-center gap-2 text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Loading movies for {selectedYear}...
                </div>
              )}
              <Button
                variant="outline"
                onClick={() => setStep("input")}
                className="mt-4"
              >
                Change Website
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Step 3: Select Movies */}
        {step === "movies" && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <Film className="h-5 w-5" />
                  Select Movies ({selectedYear})
                </span>
                <span className="text-sm font-normal text-muted-foreground">
                  {selectedMovies.size} of {filteredMovies.length} selected
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {/* Website Statistics */}
              <div className="mb-4 space-y-2 rounded-lg border bg-muted/30 p-4">
                <div className="flex items-center justify-between">
                  <span className="font-medium">Website Statistics:</span>
                  {totalCount !== null && (
                    <span className="text-lg font-bold text-primary">
                      📊 {totalCount.toLocaleString()} Total Files
                    </span>
                  )}
                </div>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-muted-foreground">Discovered:</span>
                    <span className="ml-2 font-medium">{discoveredMovies.length}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">New (after filtering):</span>
                    <span className="ml-2 font-medium">{filteredMovies.length}</span>
                  </div>
                  {(() => {
                    const yearFromUrl = extractYearFromUrl(selectedYearUrl);
                    const genreFromUrl = extractGenreFromUrl(selectedYearUrl);
                    return yearFromUrl || genreFromUrl ? (
                      <div className="col-span-2 space-y-1 rounded-lg bg-blue-500/10 p-2">
                        {yearFromUrl && (
                          <div>
                            <span className="text-muted-foreground">Year Filter:</span>
                            <span className="ml-2 font-bold text-blue-500">📅 {yearFromUrl} Only</span>
                          </div>
                        )}
                        {genreFromUrl && (
                          <div>
                            <span className="text-muted-foreground">Genre Filter:</span>
                            <span className="ml-2 font-bold text-purple-500">🎭 {genreFromUrl.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}</span>
                          </div>
                        )}
                        <div className="text-xs text-muted-foreground">
                          {yearFromUrl && genreFromUrl 
                            ? `Only ${yearFromUrl} ${genreFromUrl} movies will be imported`
                            : yearFromUrl 
                            ? `Only movies from ${yearFromUrl} will be imported`
                            : `Only ${genreFromUrl} movies will be imported`}
                        </div>
                      </div>
                    ) : null;
                  })()}
                  {paginationInfo && (
                    <>
                      <div>
                        <span className="text-muted-foreground">Current Page:</span>
                        <span className="ml-2 font-medium">{paginationInfo.currentPage}</span>
                      </div>
                      {paginationInfo.totalPages && (
                        <div>
                          <span className="text-muted-foreground">Total Pages:</span>
                          <span className="ml-2 font-medium">{paginationInfo.totalPages}</span>
                        </div>
                      )}
                    </>
                  )}
                </div>
              </div>

              {/* Duplicate Detection Info */}
              {duplicateCount > 0 && (
                <div className="mb-4 flex items-center justify-between rounded-lg bg-yellow-500/10 p-3">
                  <div className="flex items-center gap-2 text-yellow-600">
                    <span className="text-sm">
                      ⚠️ {duplicateCount} movies already exist in database
                    </span>
                  </div>
                  <label className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={hideDuplicates}
                      onChange={(e) => setHideDuplicates(e.target.checked)}
                      className="h-4 w-4"
                    />
                    Hide duplicates
                  </label>
                </div>
              )}

              {/* Selection Controls */}
              <div className="mb-4 space-y-4 rounded-lg border bg-muted/30 p-4">
                <p className="text-sm font-medium">Quick Selection Options:</p>
                
                {/* Quantity Input */}
                <div className="flex flex-wrap items-center gap-2">
                  <Input
                    type="number"
                    min="1"
                    max={filteredMovies.length}
                    value={quantityInput}
                    onChange={(e) => setQuantityInput(e.target.value)}
                    placeholder="Enter quantity"
                    className="w-32"
                  />
                  <Button size="sm" onClick={handleSelectByQuantity}>
                    Select First N
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => {
                    const qty = parseInt(quantityInput);
                    if (!isNaN(qty) && qty > 0) selectLastN(Math.min(qty, filteredMovies.length));
                  }}>
                    Select Last N
                  </Button>
                </div>

                {/* Quick Select Buttons */}
                <div className="flex flex-wrap gap-2">
                  <Button size="sm" variant="outline" onClick={() => selectFirstN(10)}>
                    First 10
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => selectFirstN(25)}>
                    First 25
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => selectFirstN(50)}>
                    First 50
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => selectFirstN(100)}>
                    First 100
                  </Button>
                  <Button size="sm" variant="outline" onClick={toggleSelectAll}>
                    {selectedMovies.size === filteredMovies.length ? "Deselect All" : "Select All"}
                  </Button>
                  {selectedMovies.size > 0 && (
                    <Button size="sm" variant="ghost" onClick={() => setSelectedMovies(new Set())}>
                      Clear Selection
                    </Button>
                  )}
                </div>

                {/* Pagination Controls */}
                <div className="space-y-3 border-t pt-4">
                  <div className="flex flex-wrap items-center gap-3">
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={handleLoadMoreMovies}
                      disabled={loadingMoreMovies || loadingAllPages}
                    >
                      {loadingMoreMovies ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      ) : (
                        <RefreshCw className="mr-2 h-4 w-4" />
                      )}
                      Load Next Page ({currentPage + 1})
                    </Button>
                    
                    <Button
                      size="sm"
                      variant="default"
                      onClick={handleImportAllFiles}
                      disabled={loadingMoreMovies || loadingAllPages}
                      className="bg-green-600 hover:bg-green-700"
                    >
                      {loadingAllPages ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Loading All Pages...
                        </>
                      ) : (
                        <>
                          <Download className="mr-2 h-4 w-4" />
                          Import All Files
                        </>
                      )}
                    </Button>
                    
                    <span className="text-xs text-muted-foreground">
                      Page {currentPage}{paginationInfo?.totalPages ? ` of ${paginationInfo.totalPages}` : ''} • {discoveredMovies.length} discovered • {filteredMovies.length} new
                      {paginationInfo?.hasNextPage && " • More pages available"}
                    </span>
                  </div>
                  
                  {loadingAllPages && (
                    <div className="rounded-lg bg-blue-500/10 p-3 text-sm text-blue-500">
                      <div className="flex items-center gap-2">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        <span>
                          Loading all pages automatically... Currently on page {currentPage}
                          {paginationInfo?.totalPages && ` of ${paginationInfo.totalPages}`}
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Start Scraping Button */}
              <div className="mb-4 flex items-center justify-between rounded-lg bg-primary/5 p-3">
                <div>
                  <p className="font-medium">{selectedMovies.size} movies selected</p>
                  <p className="text-xs text-muted-foreground">
                    Estimated time: ~{Math.ceil(selectedMovies.size * 3 / 60)} minutes
                  </p>
                </div>
                <Button
                  onClick={handleStartScraping}
                  disabled={selectedMovies.size === 0}
                  size="lg"
                >
                  <Download className="mr-2 h-4 w-4" />
                  Start Scraping
                </Button>
              </div>

              {/* Movie List */}
              <div className="max-h-[400px] space-y-2 overflow-y-auto">
                {filteredMovies.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-8 text-center">
                    <p className="text-muted-foreground">All movies have already been scraped!</p>
                    <Button
                      variant="outline"
                      size="sm"
                      className="mt-2"
                      onClick={() => setHideDuplicates(false)}
                    >
                      Show All Movies
                    </Button>
                  </div>
                ) : (
                  filteredMovies.map((movie, index) => (
                    <div
                      key={movie.url}
                      className={`flex items-center gap-3 rounded-lg border p-3 transition-colors ${
                        selectedMovies.has(movie.url) ? "border-primary bg-primary/5" : ""
                      }`}
                    >
                      <span className="w-8 text-center text-xs text-muted-foreground">
                        #{index + 1}
                      </span>
                      <input
                        type="checkbox"
                        checked={selectedMovies.has(movie.url)}
                        onChange={() => toggleMovieSelection(movie.url)}
                        className="h-4 w-4"
                      />
                      {movie.posterUrl ? (
                        <img src={movie.posterUrl} alt="" className="h-12 w-8 rounded object-cover" />
                      ) : (
                        <div className="flex h-12 w-8 items-center justify-center rounded bg-muted">
                          <Film className="h-4 w-4" />
                        </div>
                      )}
                      <div className="flex-1">
                        <p className="font-medium">{movie.title}</p>
                        <p className="text-xs text-muted-foreground">{movie.year || selectedYear}</p>
                      </div>
                    </div>
                  ))
                )}
              </div>

              <Button
                variant="outline"
                onClick={() => setStep("input")}
                className="mt-4"
              >
                Back to Years
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Step 4: Scraping Progress */}
        {(step === "scraping" || step === "done") && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <Download className="h-5 w-5" />
                  {step === "done" ? "Scraping Complete" : "Scraping in Progress..."}
                </span>
                {step === "scraping" && (
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
              {/* Progress Stats */}
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
                  <p className="text-2xl font-bold text-yellow-500">{pendingCount}</p>
                  <p className="text-xs text-muted-foreground">Pending</p>
                </div>
              </div>

              {/* Progress Bar */}
              <div className="mb-4">
                <div className="h-2 overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full bg-primary transition-all"
                    style={{ width: `${((successCount + errorCount) / scrapingQueue.length) * 100}%` }}
                  />
                </div>
                <p className="mt-1 text-xs text-muted-foreground">
                  {successCount + errorCount} of {scrapingQueue.length} processed
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
                      <p className="font-medium">{movie.title}</p>
                      {movie.status === "error" && (
                        <p className="text-xs text-red-500">{movie.error}</p>
                      )}
                      {movie.status === "success" && (
                        <div className="flex flex-wrap items-center gap-2">
                          {movie.downloadLinks.length > 0 && (
                            <span className="rounded bg-green-500/10 px-1.5 py-0.5 text-[10px] text-green-500">
                              {movie.downloadLinks.length} links
                            </span>
                          )}
                          {movie.screenshots.length > 0 && (
                            <span className="rounded bg-blue-500/10 px-1.5 py-0.5 text-[10px] text-blue-500">
                              {movie.screenshots.length} screenshots
                            </span>
                          )}
                          {movie.savedId && (
                            <Link
                              href={`/admin/movies/${movie.savedId}/edit`}
                              className="text-xs text-primary hover:underline"
                            >
                              Edit →
                            </Link>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              {step === "done" && (
                <div className="mt-6 space-y-4">
                  {/* Publish All Button */}
                  {successCount > 0 && (
                    <Button
                      className="w-full bg-green-600 hover:bg-green-700"
                      onClick={async () => {
                        const ids = scrapingQueue
                          .filter(m => m.status === "success" && m.savedId)
                          .map(m => m.savedId as number);
                        
                        if (ids.length === 0) return;
                        
                        if (!confirm(`Publish all ${ids.length} scraped movies?`)) return;
                        
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
                        } catch (err) {
                          alert("Failed to publish movies");
                        }
                      }}
                    >
                      <Check className="mr-2 h-4 w-4" />
                      Publish All {successCount} Scraped Movies
                    </Button>
                  )}
                  
                  <div className="flex gap-2">
                    <Button onClick={() => router.push("/admin/movies")}>
                      View All Movies
                    </Button>
                    <Button variant="outline" onClick={() => {
                      setStep("input");
                      setScrapingQueue([]);
                      setDiscoveredMovies([]);
                      setAvailableYears([]);
                    }}>
                      <RefreshCw className="mr-2 h-4 w-4" />
                      Start New Batch
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
