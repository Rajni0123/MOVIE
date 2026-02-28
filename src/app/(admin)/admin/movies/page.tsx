"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Header } from "@/components/admin/Header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Plus, Search, Edit, Trash2, Eye, CheckSquare, Square, Loader2, Star } from "lucide-react";
import { formatDate } from "@/lib/utils";
import { MovieWithRelations } from "@/types/movie";

// Debounce hook for live search
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

export default function MoviesPage() {
  const [movies, setMovies] = useState<MovieWithRelations[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");

  // Debounced search for live search
  const debouncedSearch = useDebounce(search, 300);

  // Bulk selection state
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [bulkLoading, setBulkLoading] = useState(false);
  const [totalDrafts, setTotalDrafts] = useState(0);
  const [allDraftIds, setAllDraftIds] = useState<number[]>([]);

  // Fetch movies when page, status, or debounced search changes
  useEffect(() => {
    fetchMovies();
  }, [page, statusFilter, debouncedSearch]);

  // Fetch draft count on mount and status change
  useEffect(() => {
    fetchDraftCount();
  }, [statusFilter]);

  // Fetch total draft count
  const fetchDraftCount = async () => {
    try {
      const response = await fetch("/api/movies/bulk?status=DRAFT", {
        credentials: "include",
      });
      const data = await response.json();
      if (data.success) {
        setTotalDrafts(data.data.count);
        setAllDraftIds(data.data.ids);
      }
    } catch (error) {
      console.error("Failed to fetch draft count:", error);
    }
  };

  // Select all drafts across all pages
  const handleSelectAllDrafts = async () => {
    if (allDraftIds.length === 0) {
      alert("No draft movies found!");
      return;
    }
    setSelectedIds(new Set(allDraftIds));
  };

  // Publish all drafts at once (without selecting)
  const handlePublishAllDrafts = async () => {
    if (totalDrafts === 0) {
      alert("No draft movies to publish!");
      return;
    }
    if (!confirm(`Are you sure you want to PUBLISH ALL ${totalDrafts} draft movies?`)) return;

    setBulkLoading(true);
    try {
      const response = await fetch("/api/movies/bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ action: "publish-all-drafts" }),
      });

      const data = await response.json();
      if (data.success) {
        alert(`Successfully published ${data.count} draft movies!`);
        setSelectedIds(new Set());
        setTotalDrafts(0);
        setAllDraftIds([]);
        fetchMovies();
      } else {
        alert(data.error || "Failed to publish movies");
      }
    } catch (error) {
      console.error("Publish all drafts error:", error);
      alert("Failed to publish movies");
    } finally {
      setBulkLoading(false);
    }
  };

  const fetchMovies = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        pageSize: "10",
      });
      
      if (statusFilter) params.append("status", statusFilter);
      if (search) params.append("search", search);

      const response = await fetch(`/api/movies?${params}`, {
        credentials: "include",
      });
      const data = await response.json();

      if (data.success) {
        setMovies(data.data.movies);
        setTotalPages(data.data.totalPages);
      }
    } catch (error) {
      console.error("Failed to fetch movies:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    // Just reset page - search is already live via debounce
    setPage(1);
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Are you sure you want to delete this movie?")) return;

    try {
      const response = await fetch(`/api/movies/${id}`, {
        method: "DELETE",
        credentials: "include",
      });

      if (response.ok) {
        setMovies(movies.filter((m) => m.id !== id));
        setSelectedIds(prev => {
          const next = new Set(prev);
          next.delete(id);
          return next;
        });
      }
    } catch (error) {
      console.error("Failed to delete movie:", error);
    }
  };

  // Toggle single selection
  const toggleSelect = (id: number) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  // Toggle all selection
  const toggleSelectAll = () => {
    if (selectedIds.size === movies.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(movies.map(m => m.id)));
    }
  };

  // Bulk publish
  const handleBulkPublish = async () => {
    if (selectedIds.size === 0) return;
    if (!confirm(`Are you sure you want to publish ${selectedIds.size} movies?`)) return;

    setBulkLoading(true);
    try {
      const response = await fetch("/api/movies/bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          action: "publish",
          ids: Array.from(selectedIds),
        }),
      });

      const data = await response.json();
      if (data.success) {
        alert(`Successfully published ${data.count} movies!`);
        setSelectedIds(new Set());
        fetchMovies();
      } else {
        alert(data.error || "Failed to publish movies");
      }
    } catch (error) {
      console.error("Bulk publish error:", error);
      alert("Failed to publish movies");
    } finally {
      setBulkLoading(false);
    }
  };

  // Bulk delete
  const handleBulkDelete = async () => {
    if (selectedIds.size === 0) return;
    if (!confirm(`Are you sure you want to DELETE ${selectedIds.size} movies? This cannot be undone!`)) return;

    setBulkLoading(true);
    try {
      const response = await fetch("/api/movies/bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          action: "delete",
          ids: Array.from(selectedIds),
        }),
      });

      const data = await response.json();
      if (data.success) {
        alert(`Successfully deleted ${data.count} movies!`);
        setSelectedIds(new Set());
        fetchMovies();
      } else {
        alert(data.error || "Failed to delete movies");
      }
    } catch (error) {
      console.error("Bulk delete error:", error);
      alert("Failed to delete movies");
    } finally {
      setBulkLoading(false);
    }
  };

  // Bulk unpublish (draft)
  const handleBulkUnpublish = async () => {
    if (selectedIds.size === 0) return;
    if (!confirm(`Are you sure you want to unpublish ${selectedIds.size} movies?`)) return;

    setBulkLoading(true);
    try {
      const response = await fetch("/api/movies/bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          action: "unpublish",
          ids: Array.from(selectedIds),
        }),
      });

      const data = await response.json();
      if (data.success) {
        alert(`Successfully unpublished ${data.count} movies!`);
        setSelectedIds(new Set());
        fetchMovies();
      } else {
        alert(data.error || "Failed to unpublish movies");
      }
    } catch (error) {
      console.error("Bulk unpublish error:", error);
      alert("Failed to unpublish movies");
    } finally {
      setBulkLoading(false);
    }
  };

  // Toggle single movie featured status
  // Note: Temporarily using any type until Prisma client is regenerated
  const handleToggleFeatured = async (movie: MovieWithRelations) => {
    try {
      const movieAny = movie as Record<string, unknown>;
      const currentFeatured = movieAny.isFeatured === true;
      
      const response = await fetch(`/api/movies/${movie.id}/featured`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          isFeatured: !currentFeatured,
          featuredOrder: currentFeatured ? 0 : 1,
        }),
      });

      const data = await response.json();
      if (data.success) {
        // Update local state
        setMovies(movies.map(m => 
          m.id === movie.id 
            ? { ...m, isFeatured: !currentFeatured } as MovieWithRelations
            : m
        ));
      }
    } catch (error) {
      console.error("Failed to toggle featured:", error);
    }
  };

  // Bulk set featured
  const handleBulkFeatured = async () => {
    if (selectedIds.size === 0) return;
    if (!confirm(`Set ${selectedIds.size} movies as Popular/Featured?`)) return;

    setBulkLoading(true);
    try {
      const response = await fetch("/api/movies/bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          action: "featured",
          ids: Array.from(selectedIds),
        }),
      });

      const data = await response.json();
      if (data.success) {
        alert(`Successfully set ${data.count} movies as Popular!`);
        setSelectedIds(new Set());
        fetchMovies();
      } else {
        alert(data.error || "Failed to update movies");
      }
    } catch (error) {
      console.error("Bulk featured error:", error);
      alert("Failed to update movies");
    } finally {
      setBulkLoading(false);
    }
  };

  // Bulk remove featured
  const handleBulkUnfeatured = async () => {
    if (selectedIds.size === 0) return;
    if (!confirm(`Remove ${selectedIds.size} movies from Popular section?`)) return;

    setBulkLoading(true);
    try {
      const response = await fetch("/api/movies/bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          action: "unfeatured",
          ids: Array.from(selectedIds),
        }),
      });

      const data = await response.json();
      if (data.success) {
        alert(`Successfully removed ${data.count} movies from Popular!`);
        setSelectedIds(new Set());
        fetchMovies();
      } else {
        alert(data.error || "Failed to update movies");
      }
    } catch (error) {
      console.error("Bulk unfeatured error:", error);
      alert("Failed to update movies");
    } finally {
      setBulkLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "PUBLISHED":
        return <Badge variant="success">Published</Badge>;
      case "DRAFT":
        return <Badge variant="warning">Draft</Badge>;
      case "UNPUBLISHED":
        return <Badge variant="secondary">Unpublished</Badge>;
      default:
        return <Badge>{status}</Badge>;
    }
  };

  return (
    <div>
      <Header title="Movies" />

      <div className="p-6">
        {/* Actions Bar */}
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <form onSubmit={handleSearch} className="flex flex-wrap gap-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                type="search"
                placeholder="Search movies... (live)"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-64 pl-9 pr-9"
              />
              {loading && search && (
                <Loader2 className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-muted-foreground" />
              )}
            </div>
            <Select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-40"
            >
              <option value="">All Status</option>
              <option value="PUBLISHED">Published</option>
              <option value="DRAFT">Draft</option>
              <option value="UNPUBLISHED">Unpublished</option>
              <option value="POPULAR">⭐ Popular</option>
            </Select>
            <Button type="submit">Search</Button>
            {search && (
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setSearch("");
                  setPage(1);
                }}
              >
                Clear
              </Button>
            )}
          </form>

          <div className="flex flex-wrap gap-2">
            {/* Draft Actions */}
            {totalDrafts > 0 && (
              <>
                <Button
                  variant="outline"
                  onClick={handleSelectAllDrafts}
                  disabled={bulkLoading}
                  className="border-amber-500 text-amber-600 hover:bg-amber-50"
                >
                  <CheckSquare className="mr-2 h-4 w-4" />
                  Select All Drafts ({totalDrafts})
                </Button>
                <Button
                  onClick={handlePublishAllDrafts}
                  disabled={bulkLoading}
                  className="bg-green-600 hover:bg-green-700"
                >
                  {bulkLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                  Publish All Drafts ({totalDrafts})
                </Button>
              </>
            )}
            <Link href="/admin/movies/add">
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Add Movie
              </Button>
            </Link>
          </div>
        </div>

        {/* Bulk Actions Bar */}
        {selectedIds.size > 0 && (
          <div className="mb-4 flex flex-wrap items-center gap-3 rounded-lg border border-primary/30 bg-primary/5 p-3">
            <span className="text-sm font-medium">
              {selectedIds.size} movie{selectedIds.size > 1 ? "s" : ""} selected
            </span>
            <div className="flex flex-wrap gap-2">
              <Button
                size="sm"
                onClick={handleBulkPublish}
                disabled={bulkLoading}
                className="bg-green-600 hover:bg-green-700"
              >
                {bulkLoading ? <Loader2 className="mr-1 h-3 w-3 animate-spin" /> : null}
                Publish
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={handleBulkUnpublish}
                disabled={bulkLoading}
              >
                Unpublish
              </Button>
              <Button
                size="sm"
                onClick={handleBulkFeatured}
                disabled={bulkLoading}
                className="bg-amber-500 hover:bg-amber-600"
              >
                <Star className="mr-1 h-3 w-3" />
                Set Popular
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={handleBulkUnfeatured}
                disabled={bulkLoading}
              >
                Remove Popular
              </Button>
              <Button
                size="sm"
                variant="destructive"
                onClick={handleBulkDelete}
                disabled={bulkLoading}
              >
                Delete
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setSelectedIds(new Set())}
                disabled={bulkLoading}
              >
                Clear
              </Button>
            </div>
          </div>
        )}

        {/* Movies Table */}
        <Card>
          <CardHeader>
            <CardTitle>All Movies</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex h-48 items-center justify-center">
                <p className="text-muted-foreground">Loading...</p>
              </div>
            ) : movies.length === 0 ? (
              <div className="flex h-48 flex-col items-center justify-center">
                <p className="text-muted-foreground">No movies found</p>
                <Link href="/admin/movies/add">
                  <Button className="mt-4">Add Your First Movie</Button>
                </Link>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b text-left">
                      <th className="pb-3 pr-3 font-medium">
                        <button
                          onClick={toggleSelectAll}
                          className="flex items-center justify-center rounded p-1 hover:bg-muted"
                        >
                          {selectedIds.size === movies.length && movies.length > 0 ? (
                            <CheckSquare className="h-5 w-5 text-primary" />
                          ) : (
                            <Square className="h-5 w-5" />
                          )}
                        </button>
                      </th>
                      <th className="pb-3 font-medium">Title</th>
                      <th className="pb-3 font-medium">Release Date</th>
                      <th className="pb-3 font-medium">Rating</th>
                      <th className="pb-3 font-medium">Links</th>
                      <th className="pb-3 font-medium">Popular</th>
                      <th className="pb-3 font-medium">Status</th>
                      <th className="pb-3 font-medium">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {movies.map((movie) => (
                      <tr key={movie.id} className={`border-b ${selectedIds.has(movie.id) ? "bg-primary/5" : ""}`}>
                        <td className="py-4 pr-3">
                          <button
                            onClick={() => toggleSelect(movie.id)}
                            className="flex items-center justify-center rounded p-1 hover:bg-muted"
                          >
                            {selectedIds.has(movie.id) ? (
                              <CheckSquare className="h-5 w-5 text-primary" />
                            ) : (
                              <Square className="h-5 w-5" />
                            )}
                          </button>
                        </td>
                        <td className="py-4">
                          <div className="flex items-center gap-3">
                            {movie.posterUrl && (
                              <img
                                src={movie.posterUrl}
                                alt={movie.title}
                                className="h-12 w-8 rounded object-cover"
                              />
                            )}
                            <div>
                              <p className="font-medium">{movie.title}</p>
                              <p className="text-sm text-muted-foreground">
                                {movie.director || "Unknown Director"}
                              </p>
                            </div>
                          </div>
                        </td>
                        <td className="py-4">
                          {formatDate(movie.releaseDate)}
                        </td>
                        <td className="py-4">
                          {movie.rating ? Number(movie.rating).toFixed(1) : "N/A"}
                        </td>
                        <td className="py-4">
                          <span className={`rounded-full px-2 py-1 text-xs font-medium ${
                            (movie.streamingLinks?.length ?? 0) > 0
                              ? "bg-green-100 text-green-700"
                              : "bg-red-100 text-red-700"
                          }`}>
                            {movie.streamingLinks?.length || 0} links
                          </span>
                        </td>
                        <td className="py-4">
                          {(() => {
                            const movieAny = movie as Record<string, unknown>;
                            const isFeatured = movieAny.isFeatured === true;
                            return (
                              <button
                                onClick={() => handleToggleFeatured(movie)}
                                className={`rounded-full p-1.5 transition-colors ${
                                  isFeatured
                                    ? "bg-amber-100 text-amber-600 hover:bg-amber-200"
                                    : "bg-muted text-muted-foreground hover:bg-muted/80"
                                }`}
                                title={isFeatured ? "Remove from Popular" : "Add to Popular"}
                              >
                                <Star className={`h-4 w-4 ${isFeatured ? "fill-amber-500" : ""}`} />
                              </button>
                            );
                          })()}
                        </td>
                        <td className="py-4">{getStatusBadge(movie.status)}</td>
                        <td className="py-4">
                          <div className="flex gap-2">
                            <Link href={`/movie/${movie.slug}?preview=true`} target="_blank">
                              <Button variant="ghost" size="icon" title="Preview">
                                <Eye className="h-4 w-4" />
                              </Button>
                            </Link>
                            <Link href={`/admin/movies/${movie.id}/edit`}>
                              <Button variant="ghost" size="icon">
                                <Edit className="h-4 w-4" />
                              </Button>
                            </Link>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleDelete(movie.id)}
                            >
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="mt-4 flex items-center justify-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                >
                  Previous
                </Button>
                <span className="text-sm text-muted-foreground">
                  Page {page} of {totalPages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                >
                  Next
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
