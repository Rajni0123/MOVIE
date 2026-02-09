"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Header } from "@/components/admin/Header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { 
  Search, Download, Film, Check, X, Loader2, Plus, ExternalLink, 
  Globe, Link as LinkIcon, Image, FileText, Tags, Trash2, Save
} from "lucide-react";

interface ScrapedData {
  title: string;
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
  cast: string[];
  keywords: string[];
}

interface TMDBMovie {
  id: number;
  title: string;
  poster_path: string | null;
  release_date: string;
  overview: string;
  vote_average: number;
}

export default function ScrapingPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<"url" | "tmdb">("url");
  
  // URL Scraping State
  const [scrapeUrl, setScrapeUrl] = useState("");
  const [scraping, setScraping] = useState(false);
  const [scrapedData, setScrapedData] = useState<ScrapedData | null>(null);
  const [saving, setSaving] = useState(false);
  
  // TMDB State
  const [searchQuery, setSearchQuery] = useState("");
  const [searching, setSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<TMDBMovie[]>([]);
  const [importing, setImporting] = useState<number | null>(null);
  const [importedMovies, setImportedMovies] = useState<number[]>([]);
  
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // Scrape URL
  const handleScrapeUrl = async () => {
    if (!scrapeUrl.trim()) {
      setError("Please enter a URL to scrape");
      return;
    }

    setScraping(true);
    setError("");
    setSuccess("");
    setScrapedData(null);

    try {
      const res = await fetch("/api/scraping/url", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ url: scrapeUrl }),
      });
      const data = await res.json();

      if (data.success) {
        setScrapedData(data.data);
        setSuccess("Content scraped successfully! Review and edit below.");
      } else {
        setError(data.error || "Failed to scrape URL");
      }
    } catch (err) {
      setError("Failed to scrape URL. Please check the URL and try again.");
    } finally {
      setScraping(false);
    }
  };

  // Update scraped data
  const updateScrapedData = (field: keyof ScrapedData, value: unknown) => {
    if (scrapedData) {
      setScrapedData({ ...scrapedData, [field]: value });
    }
  };

  // Add download link
  const addDownloadLink = () => {
    if (scrapedData) {
      setScrapedData({
        ...scrapedData,
        downloadLinks: [...scrapedData.downloadLinks, { quality: "720p", language: "Hindi", url: "" }],
      });
    }
  };

  // Remove download link
  const removeDownloadLink = (index: number) => {
    if (scrapedData) {
      setScrapedData({
        ...scrapedData,
        downloadLinks: scrapedData.downloadLinks.filter((_, i) => i !== index),
      });
    }
  };

  // Update download link
  const updateDownloadLink = (index: number, field: string, value: string) => {
    if (scrapedData) {
      const links = [...scrapedData.downloadLinks];
      links[index] = { ...links[index], [field]: value };
      setScrapedData({ ...scrapedData, downloadLinks: links });
    }
  };

  // Save scraped movie
  const handleSaveMovie = async () => {
    if (!scrapedData || !scrapedData.title) {
      setError("Title is required");
      return;
    }

    setSaving(true);
    setError("");

    try {
      // Generate meta description (truncate for SEO - max 160 chars)
      const metaDesc = scrapedData.description
        ? scrapedData.description.slice(0, 160).trim() + (scrapedData.description.length > 160 ? "..." : "")
        : "";

      // Create movie
      const movieRes = await fetch("/api/movies", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          title: scrapedData.title,
          description: scrapedData.description,
          metaDescription: metaDesc,
          posterUrl: scrapedData.posterUrl,
          backdropUrl: scrapedData.backdropUrl,
          trailerUrl: scrapedData.trailerUrl || "",
          screenshots: JSON.stringify(scrapedData.screenshots),
          genres: scrapedData.genres,
          releaseDate: scrapedData.releaseYear ? `${scrapedData.releaseYear}-01-01` : null,
          runtime: scrapedData.runtime ? parseInt(scrapedData.runtime) : null,
          rating: scrapedData.rating ? parseFloat(scrapedData.rating) : null,
          director: scrapedData.director,
          cast: scrapedData.cast,
          metaKeywords: scrapedData.keywords.join(", "),
          status: "DRAFT",
        }),
      });

      const movieData = await movieRes.json();

      if (movieData.success) {
        const movieId = movieData.data.id;

        // Add download links
        for (const link of scrapedData.downloadLinks) {
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

        setSuccess(`"${scrapedData.title}" saved successfully!`);
        setScrapedData(null);
        setScrapeUrl("");
        
        // Redirect to edit page
        setTimeout(() => {
          router.push(`/admin/movies/${movieId}/edit`);
        }, 1500);
      } else {
        setError(movieData.error || "Failed to save movie");
      }
    } catch (err) {
      setError("Failed to save movie. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  // TMDB Search
  const handleSearch = async () => {
    if (!searchQuery.trim()) return;

    setSearching(true);
    setError("");
    setSearchResults([]);

    try {
      const res = await fetch(`/api/scraping/tmdb/search?query=${encodeURIComponent(searchQuery)}`, {
        credentials: "include",
      });
      const data = await res.json();

      if (data.success) {
        setSearchResults(data.data || []);
        if (data.data.length === 0) {
          setError("No movies found. Try a different search term.");
        }
      } else {
        setError(data.error || "Search failed");
      }
    } catch (err) {
      setError("Failed to search. Please try again.");
    } finally {
      setSearching(false);
    }
  };

  // Import from TMDB
  const handleImport = async (tmdbId: number) => {
    setImporting(tmdbId);
    setError("");

    try {
      const detailsRes = await fetch(`/api/scraping/tmdb?tmdbId=${tmdbId}`, {
        credentials: "include",
      });
      const detailsData = await detailsRes.json();

      if (!detailsData.success) {
        setError(detailsData.error || "Failed to fetch movie details");
        return;
      }

      const movie = detailsData.data;

      // Generate meta description (truncate for SEO - max 160 chars)
      const metaDesc = movie.description
        ? movie.description.slice(0, 160).trim() + (movie.description.length > 160 ? "..." : "")
        : "";

      const createRes = await fetch("/api/movies", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          title: movie.title,
          description: movie.description,
          metaDescription: metaDesc,
          releaseDate: movie.releaseDate,
          runtime: movie.runtime,
          genres: movie.genres,
          director: movie.director,
          rating: movie.rating,
          posterUrl: movie.posterUrl,
          backdropUrl: movie.backdropUrl,
          trailerUrl: movie.trailerUrl,
          tmdbId: movie.tmdbId,
          imdbId: movie.imdbId,
          status: "DRAFT",
        }),
      });

      const createData = await createRes.json();

      if (createData.success) {
        setImportedMovies((prev) => [...prev, tmdbId]);
      } else {
        setError(createData.error || "Failed to import movie");
      }
    } catch (err) {
      setError("Import failed. Please try again.");
    } finally {
      setImporting(null);
    }
  };

  return (
    <div>
      <Header title="Scraping / Import" />

      <div className="p-6">
        {/* Tabs */}
        <div className="mb-6 flex flex-wrap gap-2">
          <Button
            variant={activeTab === "url" ? "default" : "outline"}
            onClick={() => setActiveTab("url")}
          >
            <Globe className="mr-2 h-4 w-4" />
            Scrape from URL
          </Button>
          <Button
            variant={activeTab === "tmdb" ? "default" : "outline"}
            onClick={() => setActiveTab("tmdb")}
          >
            <Film className="mr-2 h-4 w-4" />
            Import from TMDB
          </Button>
          <Link href="/admin/scraping/bulk">
            <Button variant="outline" className="border-primary text-primary hover:bg-primary/10">
              <Download className="mr-2 h-4 w-4" />
              Bulk Scrape (Year Wise)
            </Button>
          </Link>
          <Link href="/admin/scraping/universal">
            <Button className="bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600">
              <Globe className="mr-2 h-4 w-4" />
              Universal Scraper (Lifetime Import)
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

        {/* URL Scraping Tab */}
        {activeTab === "url" && (
          <>
            {/* URL Input */}
            <Card className="mb-6">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Globe className="h-5 w-5" />
                  Scrape Movie from URL
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex gap-2">
                  <Input
                    value={scrapeUrl}
                    onChange={(e) => setScrapeUrl(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleScrapeUrl()}
                    placeholder="Enter movie page URL (e.g., https://example.com/movie/...)  "
                    className="flex-1"
                  />
                  <Button onClick={handleScrapeUrl} disabled={scraping}>
                    {scraping ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <Download className="mr-2 h-4 w-4" />
                    )}
                    Scrape
                  </Button>
                </div>
                <p className="mt-2 text-xs text-muted-foreground">
                  Enter the <strong>direct URL of a movie post page</strong> (not homepage). 
                  Example: https://example.com/movie/pushpa-2-download
                </p>
              </CardContent>
            </Card>

            {/* Scraped Data Editor */}
            {scrapedData && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <span className="flex items-center gap-2">
                      <FileText className="h-5 w-5" />
                      Scraped Content - Edit & Save
                    </span>
                    <Button onClick={handleSaveMovie} disabled={saving}>
                      {saving ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      ) : (
                        <Save className="mr-2 h-4 w-4" />
                      )}
                      Save Movie
                    </Button>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* Basic Info */}
                  <div className="grid gap-4 md:grid-cols-2">
                    <div>
                      <label className="mb-1 block text-sm font-medium">Title *</label>
                      <Input
                        value={scrapedData.title}
                        onChange={(e) => updateScrapedData("title", e.target.value)}
                        placeholder="Movie title"
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-sm font-medium">Release Year</label>
                      <Input
                        value={scrapedData.releaseYear}
                        onChange={(e) => updateScrapedData("releaseYear", e.target.value)}
                        placeholder="2024"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="mb-1 block text-sm font-medium">Description</label>
                    <Textarea
                      value={scrapedData.description}
                      onChange={(e) => updateScrapedData("description", e.target.value)}
                      placeholder="Movie description"
                      rows={4}
                    />
                  </div>

                  <div className="grid gap-4 md:grid-cols-3">
                    <div>
                      <label className="mb-1 block text-sm font-medium">Director</label>
                      <Input
                        value={scrapedData.director}
                        onChange={(e) => updateScrapedData("director", e.target.value)}
                        placeholder="Director name"
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-sm font-medium">Runtime (min)</label>
                      <Input
                        value={scrapedData.runtime}
                        onChange={(e) => updateScrapedData("runtime", e.target.value)}
                        placeholder="120"
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-sm font-medium">Rating</label>
                      <Input
                        value={scrapedData.rating}
                        onChange={(e) => updateScrapedData("rating", e.target.value)}
                        placeholder="7.5"
                      />
                    </div>
                  </div>

                  {/* Images */}
                  <div className="grid gap-4 md:grid-cols-2">
                    <div>
                      <label className="mb-1 block text-sm font-medium">
                        <Image className="mr-1 inline h-4 w-4" />
                        Poster URL
                      </label>
                      <Input
                        value={scrapedData.posterUrl}
                        onChange={(e) => updateScrapedData("posterUrl", e.target.value)}
                        placeholder="https://..."
                      />
                      {scrapedData.posterUrl && (
                        <img src={scrapedData.posterUrl} alt="Poster" className="mt-2 h-32 rounded object-cover" />
                      )}
                    </div>
                    <div>
                      <label className="mb-1 block text-sm font-medium">
                        <Image className="mr-1 inline h-4 w-4" />
                        Backdrop URL
                      </label>
                      <Input
                        value={scrapedData.backdropUrl}
                        onChange={(e) => updateScrapedData("backdropUrl", e.target.value)}
                        placeholder="https://..."
                      />
                      {scrapedData.backdropUrl && (
                        <img src={scrapedData.backdropUrl} alt="Backdrop" className="mt-2 h-20 w-full rounded object-cover" />
                      )}
                    </div>
                  </div>

                  {/* Trailer URL */}
                  <div>
                    <label className="mb-1 block text-sm font-medium">
                      <ExternalLink className="mr-1 inline h-4 w-4" />
                      Trailer URL (YouTube)
                    </label>
                    <Input
                      value={scrapedData.trailerUrl || ""}
                      onChange={(e) => updateScrapedData("trailerUrl", e.target.value)}
                      placeholder="https://www.youtube.com/watch?v=..."
                    />
                    {scrapedData.trailerUrl && (
                      <a 
                        href={scrapedData.trailerUrl} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="mt-1 inline-flex items-center text-xs text-primary hover:underline"
                      >
                        <ExternalLink className="mr-1 h-3 w-3" />
                        Watch Trailer
                      </a>
                    )}
                  </div>

                  {/* Screenshots */}
                  <div>
                    <label className="mb-1 block text-sm font-medium">
                      Screenshots ({scrapedData.screenshots.length})
                    </label>
                    <div className="flex gap-2 overflow-x-auto pb-2">
                      {scrapedData.screenshots.map((url, i) => (
                        <div key={i} className="relative flex-shrink-0">
                          <img src={url} alt={`Screenshot ${i + 1}`} className="h-20 w-32 rounded object-cover" />
                          <button
                            onClick={() => updateScrapedData("screenshots", scrapedData.screenshots.filter((_, idx) => idx !== i))}
                            className="absolute -right-1 -top-1 rounded-full bg-red-500 p-0.5 text-white"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Download Links */}
                  <div>
                    <div className="mb-2 flex items-center justify-between">
                      <label className="text-sm font-medium">
                        <LinkIcon className="mr-1 inline h-4 w-4" />
                        Download Links ({scrapedData.downloadLinks.length})
                      </label>
                      <Button size="sm" variant="outline" onClick={addDownloadLink}>
                        <Plus className="mr-1 h-3 w-3" />
                        Add Link
                      </Button>
                    </div>
                    <div className="space-y-2">
                      {scrapedData.downloadLinks.map((link, i) => (
                        <div key={i} className="flex gap-2 rounded border p-2">
                          <select
                            value={link.quality}
                            onChange={(e) => updateDownloadLink(i, "quality", e.target.value)}
                            className="rounded border bg-background px-2 py-1 text-sm"
                          >
                            <option value="480p">480p</option>
                            <option value="720p">720p</option>
                            <option value="1080p">1080p</option>
                            <option value="4K">4K</option>
                          </select>
                          <select
                            value={link.language}
                            onChange={(e) => updateDownloadLink(i, "language", e.target.value)}
                            className="rounded border bg-background px-2 py-1 text-sm"
                          >
                            <option value="Hindi">Hindi</option>
                            <option value="English">English</option>
                            <option value="Dual Audio">Dual Audio</option>
                            <option value="Tamil">Tamil</option>
                            <option value="Telugu">Telugu</option>
                          </select>
                          <Input
                            value={link.url}
                            onChange={(e) => updateDownloadLink(i, "url", e.target.value)}
                            placeholder="Download URL"
                            className="flex-1"
                          />
                          <Button size="sm" variant="ghost" onClick={() => removeDownloadLink(i)}>
                            <Trash2 className="h-4 w-4 text-red-500" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Genres */}
                  <div>
                    <label className="mb-1 block text-sm font-medium">Genres</label>
                    <Input
                      value={scrapedData.genres.join(", ")}
                      onChange={(e) => updateScrapedData("genres", e.target.value.split(",").map(g => g.trim()).filter(Boolean))}
                      placeholder="Action, Drama, Thriller"
                    />
                  </div>

                  {/* Keywords */}
                  <div>
                    <label className="mb-1 block text-sm font-medium">
                      <Tags className="mr-1 inline h-4 w-4" />
                      SEO Keywords
                    </label>
                    <Textarea
                      value={scrapedData.keywords.join(", ")}
                      onChange={(e) => updateScrapedData("keywords", e.target.value.split(",").map(k => k.trim()).filter(Boolean))}
                      placeholder="movie download, movie 720p, movie hindi..."
                      rows={2}
                    />
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Instructions */}
            {!scrapedData && (
              <Card className="mt-6">
                <CardHeader>
                  <CardTitle>How URL Scraping Works</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3 text-sm text-muted-foreground">
                  <p><strong>1.</strong> Go to any movie website and open a <strong>single movie post page</strong></p>
                  <p><strong>2.</strong> Copy the URL from browser address bar (e.g., https://site.com/movie/pushpa-2)</p>
                  <p><strong>3.</strong> Paste the URL here and click "Scrape"</p>
                  <p><strong>4.</strong> Review and edit the extracted data</p>
                  <p><strong>5.</strong> Click "Save Movie" to add it to your database</p>
                  
                  <div className="mt-4 rounded-lg bg-blue-500/10 p-3">
                    <p className="font-medium text-blue-600">Important:</p>
                    <ul className="mt-1 list-inside list-disc text-blue-600/80">
                      <li>Use the <strong>movie detail page URL</strong>, not the homepage</li>
                      <li>URL should be like: site.com/movie/movie-name or site.com/download/movie-name</li>
                      <li>Don't use: site.com/ or site.com/movies (these are listing pages)</li>
                    </ul>
                  </div>
                  
                  <div className="mt-4 rounded-lg bg-yellow-500/10 p-3">
                    <p className="text-yellow-600">
                      <strong>Note:</strong> Not all websites can be scraped. Results depend on the website structure.
                      You can always manually edit the extracted data before saving.
                    </p>
                  </div>
                </CardContent>
              </Card>
            )}
          </>
        )}

        {/* TMDB Tab */}
        {activeTab === "tmdb" && (
          <>
            <Card className="mb-6">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Search className="h-5 w-5" />
                  Search TMDB
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex gap-2">
                  <Input
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                    placeholder="Search movies by title (e.g., The Matrix, Inception)"
                    className="flex-1"
                  />
                  <Button onClick={handleSearch} disabled={searching}>
                    {searching ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <Search className="mr-2 h-4 w-4" />
                    )}
                    Search
                  </Button>
                </div>
              </CardContent>
            </Card>

            {searchResults.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>Search Results ({searchResults.length})</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    {searchResults.map((movie) => {
                      const isImported = importedMovies.includes(movie.id);
                      const isImporting = importing === movie.id;

                      return (
                        <div key={movie.id} className="flex gap-3 rounded-lg border p-3">
                          {movie.poster_path ? (
                            <img
                              src={`https://image.tmdb.org/t/p/w92${movie.poster_path}`}
                              alt={movie.title}
                              className="h-24 w-16 rounded object-cover"
                            />
                          ) : (
                            <div className="flex h-24 w-16 items-center justify-center rounded bg-muted">
                              <Film className="h-6 w-6 text-muted-foreground" />
                            </div>
                          )}
                          <div className="flex-1">
                            <h3 className="line-clamp-1 font-medium">{movie.title}</h3>
                            <p className="text-sm text-muted-foreground">
                              {movie.release_date ? new Date(movie.release_date).getFullYear() : "N/A"}
                            </p>
                            <div className="mt-2 flex gap-2">
                              {isImported ? (
                                <span className="inline-flex items-center gap-1 text-xs text-green-500">
                                  <Check className="h-3 w-3" />
                                  Imported
                                </span>
                              ) : (
                                <Button size="sm" onClick={() => handleImport(movie.id)} disabled={isImporting}>
                                  {isImporting ? (
                                    <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                                  ) : (
                                    <Plus className="mr-1 h-3 w-3" />
                                  )}
                                  Import
                                </Button>
                              )}
                              <a
                                href={`https://www.themoviedb.org/movie/${movie.id}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
                              >
                                <ExternalLink className="h-3 w-3" />
                                TMDB
                              </a>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            )}
          </>
        )}
      </div>
    </div>
  );
}
