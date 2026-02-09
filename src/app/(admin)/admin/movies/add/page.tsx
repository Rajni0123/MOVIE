"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Header } from "@/components/admin/Header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, Save, Loader2, Download, Plus, Trash2, Search, Tags, Link as LinkIcon } from "lucide-react";
import Link from "next/link";

const GENRES = [
  "Action", "Adventure", "Animation", "Comedy", "Crime", "Documentary",
  "Drama", "Family", "Fantasy", "History", "Horror", "Music", "Mystery",
  "Romance", "Science Fiction", "Thriller", "War", "Western"
];

interface DownloadLink {
  sourceName: string;
  quality: string;
  language: string;
  linkUrl: string;
}

export default function AddMoviePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [importing, setImporting] = useState(false);
  const [error, setError] = useState("");
  const [tmdbSearchId, setTmdbSearchId] = useState("");
  const [downloadLinks, setDownloadLinks] = useState<DownloadLink[]>([]);
  
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    releaseDate: "",
    runtime: "",
    genres: [] as string[],
    director: "",
    rating: "",
    posterUrl: "",
    backdropUrl: "",
    trailerUrl: "",
    status: "DRAFT",
    tmdbId: "",
    imdbId: "",
    metaTitle: "",
    metaDescription: "",
    metaKeywords: "",
  });

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleGenreChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const selectedGenres = Array.from(e.target.selectedOptions, (option) => option.value);
    setFormData((prev) => ({
      ...prev,
      genres: selectedGenres,
    }));
  };

  // Import from TMDB
  const handleImportTMDB = async () => {
    if (!tmdbSearchId) {
      alert("Please enter a TMDB ID");
      return;
    }

    setImporting(true);
    setError("");

    try {
      const res = await fetch(`/api/scraping/tmdb?tmdbId=${tmdbSearchId}`, {
        credentials: "include",
      });
      const data = await res.json();

      if (data.success && data.data) {
        const movie = data.data;
        setFormData({
          title: movie.title || "",
          description: movie.description || "",
          releaseDate: movie.releaseDate || "",
          runtime: movie.runtime?.toString() || "",
          genres: movie.genres || [],
          director: movie.director || "",
          rating: movie.rating?.toString() || "",
          posterUrl: movie.posterUrl || "",
          backdropUrl: movie.backdropUrl || "",
          trailerUrl: movie.trailerUrl || "",
          status: "DRAFT",
          tmdbId: movie.tmdbId || tmdbSearchId,
          imdbId: movie.imdbId || "",
          metaTitle: "",
          metaDescription: "",
          metaKeywords: "",
        });
        alert("Movie data imported from TMDB!");
      } else {
        setError(data.error || "Failed to import from TMDB");
      }
    } catch (err) {
      setError("Failed to import from TMDB. Check if the ID is correct.");
    } finally {
      setImporting(false);
    }
  };

  // Download Links Management
  const addDownloadLink = () => {
    setDownloadLinks([
      ...downloadLinks,
      { sourceName: "Direct", quality: "720p", language: "Hindi", linkUrl: "" },
    ]);
  };

  const updateDownloadLink = (index: number, field: keyof DownloadLink, value: string) => {
    const updated = [...downloadLinks];
    updated[index] = { ...updated[index], [field]: value };
    setDownloadLinks(updated);
  };

  const removeDownloadLink = (index: number) => {
    setDownloadLinks(downloadLinks.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      // Create movie
      const response = await fetch("/api/movies", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          ...formData,
          runtime: formData.runtime ? parseInt(formData.runtime) : undefined,
          rating: formData.rating ? parseFloat(formData.rating) : undefined,
        }),
      });

      const data = await response.json();

      if (data.success) {
        const movieId = data.data.id;

        // Add download links if any
        for (const link of downloadLinks) {
          if (link.linkUrl) {
            await fetch(`/api/movies/${movieId}/links`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              credentials: "include",
              body: JSON.stringify(link),
            });
          }
        }

        router.push("/admin/movies");
      } else {
        setError(data.error || "Failed to create movie");
      }
    } catch (err) {
      setError("An error occurred. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <Header title="Add Movie" />

      <div className="p-6">
        <div className="mb-6">
          <Link href="/admin/movies">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Movies
            </Button>
          </Link>
        </div>

        {/* Import from TMDB */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Download className="h-5 w-5" />
              Import from TMDB
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex gap-2">
              <Input
                value={tmdbSearchId}
                onChange={(e) => setTmdbSearchId(e.target.value)}
                placeholder="Enter TMDB ID (e.g., 603)"
                className="max-w-xs"
              />
              <Button onClick={handleImportTMDB} disabled={importing}>
                {importing ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Search className="mr-2 h-4 w-4" />
                )}
                {importing ? "Importing..." : "Import"}
              </Button>
            </div>
            <p className="mt-2 text-xs text-muted-foreground">
              Find TMDB ID from themoviedb.org URL (e.g., themoviedb.org/movie/<strong>603</strong>-the-matrix)
            </p>
          </CardContent>
        </Card>

        <form onSubmit={handleSubmit}>
          <div className="grid gap-6 lg:grid-cols-2">
            {/* Basic Info */}
            <Card>
              <CardHeader>
                <CardTitle>Basic Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label className="mb-2 block text-sm font-medium">Title *</label>
                  <Input
                    name="title"
                    value={formData.title}
                    onChange={handleChange}
                    required
                    placeholder="Movie title"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium">Description</label>
                  <Textarea
                    name="description"
                    value={formData.description}
                    onChange={handleChange}
                    placeholder="Movie description"
                    rows={4}
                  />
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label className="mb-2 block text-sm font-medium">Release Date</label>
                    <Input
                      type="date"
                      name="releaseDate"
                      value={formData.releaseDate}
                      onChange={handleChange}
                    />
                  </div>
                  <div>
                    <label className="mb-2 block text-sm font-medium">Runtime (minutes)</label>
                    <Input
                      type="number"
                      name="runtime"
                      value={formData.runtime}
                      onChange={handleChange}
                      placeholder="120"
                    />
                  </div>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label className="mb-2 block text-sm font-medium">Director</label>
                    <Input
                      name="director"
                      value={formData.director}
                      onChange={handleChange}
                      placeholder="Director name"
                    />
                  </div>
                  <div>
                    <label className="mb-2 block text-sm font-medium">Rating (0-10)</label>
                    <Input
                      type="number"
                      name="rating"
                      value={formData.rating}
                      onChange={handleChange}
                      min="0"
                      max="10"
                      step="0.1"
                      placeholder="7.5"
                    />
                  </div>
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium">Genres</label>
                  <Select
                    multiple
                    name="genres"
                    value={formData.genres}
                    onChange={handleGenreChange}
                    className="h-32"
                  >
                    {GENRES.map((genre) => (
                      <option key={genre} value={genre}>{genre}</option>
                    ))}
                  </Select>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Hold Ctrl/Cmd to select multiple genres
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Media & IDs */}
            <Card>
              <CardHeader>
                <CardTitle>Media & External IDs</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label className="mb-2 block text-sm font-medium">Poster URL</label>
                  <Input
                    name="posterUrl"
                    value={formData.posterUrl}
                    onChange={handleChange}
                    placeholder="https://image.tmdb.org/..."
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium">Backdrop URL</label>
                  <Input
                    name="backdropUrl"
                    value={formData.backdropUrl}
                    onChange={handleChange}
                    placeholder="https://image.tmdb.org/..."
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium">Trailer URL</label>
                  <Input
                    name="trailerUrl"
                    value={formData.trailerUrl}
                    onChange={handleChange}
                    placeholder="https://youtube.com/watch?v=..."
                  />
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label className="mb-2 block text-sm font-medium">TMDB ID</label>
                    <Input
                      name="tmdbId"
                      value={formData.tmdbId}
                      onChange={handleChange}
                      placeholder="12345"
                    />
                  </div>
                  <div>
                    <label className="mb-2 block text-sm font-medium">IMDB ID</label>
                    <Input
                      name="imdbId"
                      value={formData.imdbId}
                      onChange={handleChange}
                      placeholder="tt1234567"
                    />
                  </div>
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium">Status</label>
                  <Select name="status" value={formData.status} onChange={handleChange}>
                    <option value="DRAFT">Draft</option>
                    <option value="PUBLISHED">Published</option>
                    <option value="UNPUBLISHED">Unpublished</option>
                  </Select>
                </div>
              </CardContent>
            </Card>

            {/* Download Links */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span className="flex items-center gap-2">
                    <LinkIcon className="h-5 w-5" />
                    Download Links
                  </span>
                  <Button type="button" onClick={addDownloadLink} size="sm">
                    <Plus className="mr-1 h-4 w-4" />
                    Add Link
                  </Button>
                </CardTitle>
              </CardHeader>
              <CardContent>
                {downloadLinks.length === 0 ? (
                  <p className="py-4 text-center text-sm text-muted-foreground">
                    No download links. Click "Add Link" to add one.
                  </p>
                ) : (
                  <div className="space-y-4">
                    {downloadLinks.map((link, index) => (
                      <div key={index} className="rounded-lg border p-3">
                        <div className="mb-2 flex items-center justify-between">
                          <span className="text-sm font-medium">Link #{index + 1}</span>
                          <button
                            type="button"
                            onClick={() => removeDownloadLink(index)}
                            className="text-red-500 hover:text-red-600"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                        <div className="space-y-2">
                          <Input
                            value={link.linkUrl}
                            onChange={(e) => updateDownloadLink(index, "linkUrl", e.target.value)}
                            placeholder="https://..."
                          />
                          <div className="grid grid-cols-3 gap-2">
                            <select
                              value={link.quality}
                              onChange={(e) => updateDownloadLink(index, "quality", e.target.value)}
                              className="rounded-md border bg-background px-2 py-1.5 text-sm"
                            >
                              <option value="480p">480p</option>
                              <option value="720p">720p</option>
                              <option value="1080p">1080p</option>
                              <option value="4K">4K</option>
                            </select>
                            <select
                              value={link.language}
                              onChange={(e) => updateDownloadLink(index, "language", e.target.value)}
                              className="rounded-md border bg-background px-2 py-1.5 text-sm"
                            >
                              <option value="Hindi">Hindi</option>
                              <option value="English">English</option>
                              <option value="Dual Audio">Dual Audio</option>
                              <option value="Tamil">Tamil</option>
                              <option value="Telugu">Telugu</option>
                            </select>
                            <Input
                              value={link.sourceName}
                              onChange={(e) => updateDownloadLink(index, "sourceName", e.target.value)}
                              placeholder="Source"
                              className="text-sm"
                            />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* SEO Settings */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Tags className="h-5 w-5" />
                  SEO Settings
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label className="mb-2 block text-sm font-medium">Meta Title</label>
                  <Input
                    name="metaTitle"
                    value={formData.metaTitle}
                    onChange={handleChange}
                    placeholder="Custom SEO title (optional)"
                  />
                  <p className="mt-1 text-xs text-muted-foreground">
                    Leave empty to auto-generate
                  </p>
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium">Meta Description</label>
                  <Textarea
                    name="metaDescription"
                    value={formData.metaDescription}
                    onChange={handleChange}
                    placeholder="Custom SEO description (optional)"
                    rows={2}
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium">Keywords</label>
                  <Textarea
                    name="metaKeywords"
                    value={formData.metaKeywords}
                    onChange={handleChange}
                    placeholder="movie download, movie 720p, movie hindi..."
                    rows={3}
                  />
                  <p className="mt-1 text-xs text-muted-foreground">
                    Comma-separated keywords for SEO
                  </p>
                </div>

                {formData.title && (
                  <div className="rounded-lg bg-muted/50 p-3">
                    <p className="text-xs font-medium">Auto-generated keywords:</p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {formData.title} download, {formData.title} full movie, {formData.title} 480p, {formData.title} 720p, {formData.title} 1080p, {formData.title} Hindi, download {formData.title} free
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {error && (
            <div className="mt-6 rounded-lg bg-destructive/10 p-4 text-destructive">
              {error}
            </div>
          )}

          <div className="mt-6 flex justify-end gap-4">
            <Link href="/admin/movies">
              <Button type="button" variant="outline">Cancel</Button>
            </Link>
            <Button type="submit" disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="mr-2 h-4 w-4" />
                  Save Movie
                </>
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
