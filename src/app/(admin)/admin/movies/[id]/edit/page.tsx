"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Header } from "@/components/admin/Header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ArrowLeft, Save, Plus, Trash2, Link as LinkIcon, Tags } from "lucide-react";
import Link from "next/link";

interface DownloadLink {
  id?: number;
  sourceName: string;
  quality: string;
  language: string;
  linkUrl: string;
  isActive: boolean;
}

interface Movie {
  id: number;
  title: string;
  slug: string;
  description: string;
  releaseDate: string;
  runtime: number;
  genres: string;
  director: string;
  rating: number;
  posterUrl: string;
  backdropUrl: string;
  trailerUrl: string;
  status: string;
  metaTitle: string;
  metaDescription: string;
  metaKeywords: string;
  streamingLinks: DownloadLink[];
}

export default function EditMoviePage() {
  const params = useParams();
  const router = useRouter();
  const movieId = params.id as string;

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [movie, setMovie] = useState<Movie | null>(null);
  const [downloadLinks, setDownloadLinks] = useState<DownloadLink[]>([]);

  useEffect(() => {
    fetchMovie();
  }, [movieId]);

  const fetchMovie = async () => {
    try {
      const res = await fetch(`/api/movies/${movieId}`, {
        credentials: "include",
      });
      const data = await res.json();
      if (data.success) {
        setMovie(data.data);
        setDownloadLinks(data.data.streamingLinks || []);
      }
    } catch (error) {
      console.error("Failed to fetch movie:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!movie) return;
    setSaving(true);

    try {
      // Update movie details
      const res = await fetch(`/api/movies/${movieId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          title: movie.title,
          description: movie.description,
          director: movie.director,
          runtime: movie.runtime,
          rating: movie.rating,
          posterUrl: movie.posterUrl,
          backdropUrl: movie.backdropUrl,
          trailerUrl: movie.trailerUrl,
          status: movie.status,
          metaTitle: movie.metaTitle,
          metaDescription: movie.metaDescription,
          metaKeywords: movie.metaKeywords,
        }),
      });

      const data = await res.json();
      if (data.success) {
        alert("Movie updated successfully!");
      } else {
        alert(data.error || "Failed to update movie");
      }
    } catch (error) {
      console.error("Failed to save movie:", error);
      alert("Failed to save movie");
    } finally {
      setSaving(false);
    }
  };

  const addDownloadLink = () => {
    setDownloadLinks([
      ...downloadLinks,
      {
        sourceName: "Direct",
        quality: "720p",
        language: "Hindi",
        linkUrl: "",
        isActive: true,
      },
    ]);
  };

  const updateDownloadLink = (index: number, field: keyof DownloadLink, value: string | boolean) => {
    const updated = [...downloadLinks];
    updated[index] = { ...updated[index], [field]: value };
    setDownloadLinks(updated);
  };

  const saveDownloadLink = async (index: number) => {
    const link = downloadLinks[index];
    
    if (!link.linkUrl) {
      alert("Please enter a link URL");
      return;
    }

    try {
      if (link.id) {
        // Update existing link
        const res = await fetch(`/api/movies/${movieId}/links/${link.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify(link),
        });
        const data = await res.json();
        if (data.success) {
          alert("Link updated!");
        }
      } else {
        // Create new link
        const res = await fetch(`/api/movies/${movieId}/links`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify(link),
        });
        const data = await res.json();
        if (data.success) {
          const updated = [...downloadLinks];
          updated[index] = { ...updated[index], id: data.data.id };
          setDownloadLinks(updated);
          alert("Link added!");
        }
      }
    } catch (error) {
      console.error("Failed to save link:", error);
      alert("Failed to save link");
    }
  };

  const deleteDownloadLink = async (index: number) => {
    const link = downloadLinks[index];
    
    if (link.id) {
      if (!confirm("Are you sure you want to delete this link?")) return;
      
      try {
        await fetch(`/api/movies/${movieId}/links/${link.id}`, {
          method: "DELETE",
          credentials: "include",
        });
      } catch (error) {
        console.error("Failed to delete link:", error);
      }
    }
    
    setDownloadLinks(downloadLinks.filter((_, i) => i !== index));
  };

  if (loading) {
    return (
      <div>
        <Header title="Edit Movie" />
        <div className="p-6">Loading...</div>
      </div>
    );
  }

  if (!movie) {
    return (
      <div>
        <Header title="Edit Movie" />
        <div className="p-6">Movie not found</div>
      </div>
    );
  }

  return (
    <div>
      <Header title={`Edit: ${movie.title}`} />

      <div className="p-6">
        {/* Back Button */}
        <Link
          href="/admin/movies"
          className="mb-6 inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Movies
        </Link>

        <div className="grid gap-6 lg:grid-cols-2">
          {/* Movie Details */}
          <Card>
            <CardHeader>
              <CardTitle>Movie Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="mb-1 block text-sm font-medium">Title</label>
                <Input
                  value={movie.title}
                  onChange={(e) => setMovie({ ...movie, title: e.target.value })}
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium">Description</label>
                <Textarea
                  value={movie.description || ""}
                  onChange={(e) => setMovie({ ...movie, description: e.target.value })}
                  rows={4}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="mb-1 block text-sm font-medium">Director</label>
                  <Input
                    value={movie.director || ""}
                    onChange={(e) => setMovie({ ...movie, director: e.target.value })}
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium">Runtime (min)</label>
                  <Input
                    type="number"
                    value={movie.runtime || ""}
                    onChange={(e) => setMovie({ ...movie, runtime: parseInt(e.target.value) })}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="mb-1 block text-sm font-medium">Rating</label>
                  <Input
                    type="number"
                    step="0.1"
                    value={movie.rating || ""}
                    onChange={(e) => setMovie({ ...movie, rating: parseFloat(e.target.value) })}
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium">Status</label>
                  <select
                    value={movie.status}
                    onChange={(e) => setMovie({ ...movie, status: e.target.value })}
                    className="w-full rounded-md border bg-background px-3 py-2"
                  >
                    <option value="PUBLISHED">Published</option>
                    <option value="DRAFT">Draft</option>
                    <option value="UNPUBLISHED">Unpublished</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium">Poster URL</label>
                <Input
                  value={movie.posterUrl || ""}
                  onChange={(e) => setMovie({ ...movie, posterUrl: e.target.value })}
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium">Trailer URL</label>
                <Input
                  value={movie.trailerUrl || ""}
                  onChange={(e) => setMovie({ ...movie, trailerUrl: e.target.value })}
                />
              </div>

              <Button onClick={handleSave} disabled={saving} className="w-full gap-2">
                <Save className="h-4 w-4" />
                {saving ? "Saving..." : "Save Movie Details"}
              </Button>
            </CardContent>
          </Card>

          {/* SEO & Keywords */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Tags className="h-5 w-5" />
                SEO & Keywords
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="mb-1 block text-sm font-medium">Meta Title</label>
                <Input
                  value={movie.metaTitle || ""}
                  onChange={(e) => setMovie({ ...movie, metaTitle: e.target.value })}
                  placeholder="Custom SEO title (leave empty for auto)"
                />
                <p className="mt-1 text-xs text-muted-foreground">
                  Leave empty to auto-generate from movie title
                </p>
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium">Meta Description</label>
                <Textarea
                  value={movie.metaDescription || ""}
                  onChange={(e) => setMovie({ ...movie, metaDescription: e.target.value })}
                  placeholder="Custom SEO description (leave empty for auto)"
                  rows={3}
                />
                <p className="mt-1 text-xs text-muted-foreground">
                  Leave empty to auto-generate from movie description
                </p>
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium">Keywords</label>
                <Textarea
                  value={movie.metaKeywords || ""}
                  onChange={(e) => setMovie({ ...movie, metaKeywords: e.target.value })}
                  placeholder="movie name download, movie name 720p, movie name hindi..."
                  rows={4}
                />
                <p className="mt-1 text-xs text-muted-foreground">
                  Comma-separated keywords for SEO. Example: movie download, movie 720p, movie hindi
                </p>
              </div>

              <div className="rounded-lg bg-muted/50 p-3">
                <p className="text-sm font-medium">Auto-generated keywords preview:</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {movie.title} download, {movie.title} full movie, {movie.title} 480p, {movie.title} 720p, {movie.title} 1080p, {movie.title} Hindi, {movie.title} English, download {movie.title} free
                </p>
              </div>

              <Button onClick={handleSave} disabled={saving} className="w-full gap-2">
                <Save className="h-4 w-4" />
                {saving ? "Saving..." : "Save SEO Settings"}
              </Button>
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
                <Button onClick={addDownloadLink} size="sm" className="gap-1">
                  <Plus className="h-4 w-4" />
                  Add Link
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {downloadLinks.length === 0 ? (
                <p className="py-8 text-center text-muted-foreground">
                  No download links yet. Click "Add Link" to add one.
                </p>
              ) : (
                <div className="space-y-4">
                  {downloadLinks.map((link, index) => (
                    <div key={index} className="rounded-lg border p-4">
                      <div className="mb-3 flex items-center justify-between">
                        <span className="text-sm font-medium">
                          Link #{index + 1} {link.id && "(Saved)"}
                        </span>
                        <button
                          onClick={() => deleteDownloadLink(index)}
                          className="text-red-500 hover:text-red-600"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>

                      <div className="space-y-3">
                        <div>
                          <label className="mb-1 block text-xs text-muted-foreground">Link URL</label>
                          <Input
                            value={link.linkUrl}
                            onChange={(e) => updateDownloadLink(index, "linkUrl", e.target.value)}
                            placeholder="https://..."
                          />
                        </div>

                        <div className="grid grid-cols-3 gap-2">
                          <div>
                            <label className="mb-1 block text-xs text-muted-foreground">Quality</label>
                            <select
                              value={link.quality}
                              onChange={(e) => updateDownloadLink(index, "quality", e.target.value)}
                              className="w-full rounded-md border bg-background px-2 py-1.5 text-sm"
                            >
                              <option value="480p">480p</option>
                              <option value="720p">720p</option>
                              <option value="1080p">1080p</option>
                              <option value="4K">4K</option>
                            </select>
                          </div>
                          <div>
                            <label className="mb-1 block text-xs text-muted-foreground">Language</label>
                            <select
                              value={link.language}
                              onChange={(e) => updateDownloadLink(index, "language", e.target.value)}
                              className="w-full rounded-md border bg-background px-2 py-1.5 text-sm"
                            >
                              <option value="Hindi">Hindi</option>
                              <option value="English">English</option>
                              <option value="Dual Audio">Dual Audio</option>
                              <option value="Tamil">Tamil</option>
                              <option value="Telugu">Telugu</option>
                            </select>
                          </div>
                          <div>
                            <label className="mb-1 block text-xs text-muted-foreground">Source</label>
                            <Input
                              value={link.sourceName}
                              onChange={(e) => updateDownloadLink(index, "sourceName", e.target.value)}
                              placeholder="Direct"
                              className="text-sm"
                            />
                          </div>
                        </div>

                        <Button
                          onClick={() => saveDownloadLink(index)}
                          size="sm"
                          className="w-full"
                        >
                          {link.id ? "Update Link" : "Save Link"}
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
