"use client";

import { useEffect, useState } from "react";
import { Header } from "@/components/admin/Header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Link as LinkIcon,
  Trash2,
  Edit,
  ExternalLink,
  Search,
  Film,
  Loader2,
  CheckCircle,
  XCircle,
} from "lucide-react";
import Link from "next/link";

interface StreamingLink {
  id: number;
  movieId: number;
  sourceName: string;
  quality: string;
  language: string;
  linkUrl: string;
  isActive: boolean;
  movie?: {
    id: number;
    title: string;
    slug: string;
  };
}

export default function LinksPage() {
  const [links, setLinks] = useState<StreamingLink[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterQuality, setFilterQuality] = useState("");

  useEffect(() => {
    fetchLinks();
  }, []);

  const fetchLinks = async () => {
    try {
      const res = await fetch("/api/admin/links", { credentials: "include" });
      const data = await res.json();
      if (data.success) {
        setLinks(data.data || []);
      }
    } catch (error) {
      console.error("Failed to fetch links:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Delete this download link?")) return;

    try {
      const link = links.find((l) => l.id === id);
      if (!link) return;

      const res = await fetch(`/api/movies/${link.movieId}/links/${id}`, {
        method: "DELETE",
        credentials: "include",
      });
      const data = await res.json();
      if (data.success) {
        setLinks((prev) => prev.filter((l) => l.id !== id));
      } else {
        alert(data.error || "Failed to delete");
      }
    } catch (error) {
      alert("Failed to delete link");
    }
  };

  const toggleActive = async (link: StreamingLink) => {
    try {
      const res = await fetch(`/api/movies/${link.movieId}/links/${link.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ isActive: !link.isActive }),
      });
      const data = await res.json();
      if (data.success) {
        setLinks((prev) =>
          prev.map((l) => (l.id === link.id ? { ...l, isActive: !l.isActive } : l))
        );
      }
    } catch (error) {
      alert("Failed to update link");
    }
  };

  const filteredLinks = links.filter((link) => {
    const matchesSearch =
      !searchQuery ||
      link.movie?.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      link.sourceName.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesQuality = !filterQuality || link.quality === filterQuality;
    return matchesSearch && matchesQuality;
  });

  const qualities = [...new Set(links.map((l) => l.quality))];

  const stats = {
    total: links.length,
    active: links.filter((l) => l.isActive).length,
    inactive: links.filter((l) => !l.isActive).length,
  };

  return (
    <div>
      <Header title="Download Links" />

      <div className="p-6">
        {/* Stats */}
        <div className="mb-6 grid gap-4 sm:grid-cols-3">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="rounded-lg bg-blue-500/10 p-2">
                  <LinkIcon className="h-5 w-5 text-blue-500" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stats.total}</p>
                  <p className="text-sm text-muted-foreground">Total Links</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="rounded-lg bg-green-500/10 p-2">
                  <CheckCircle className="h-5 w-5 text-green-500" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stats.active}</p>
                  <p className="text-sm text-muted-foreground">Active</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="rounded-lg bg-red-500/10 p-2">
                  <XCircle className="h-5 w-5 text-red-500" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stats.inactive}</p>
                  <p className="text-sm text-muted-foreground">Inactive</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card className="mb-6">
          <CardContent className="pt-6">
            <div className="flex flex-wrap gap-4">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search by movie or source..."
                    className="pl-9"
                  />
                </div>
              </div>
              <select
                value={filterQuality}
                onChange={(e) => setFilterQuality(e.target.value)}
                className="rounded-md border bg-background px-3 py-2"
              >
                <option value="">All Qualities</option>
                {qualities.map((q) => (
                  <option key={q} value={q}>{q}</option>
                ))}
              </select>
            </div>
          </CardContent>
        </Card>

        {/* Links Table */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <LinkIcon className="h-5 w-5" />
              All Download Links ({filteredLinks.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin" />
              </div>
            ) : filteredLinks.length === 0 ? (
              <p className="py-8 text-center text-muted-foreground">
                No download links found. Add links when editing movies.
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b text-left text-sm text-muted-foreground">
                      <th className="pb-3 pr-4">Movie</th>
                      <th className="pb-3 pr-4">Quality</th>
                      <th className="pb-3 pr-4">Language</th>
                      <th className="pb-3 pr-4">Source</th>
                      <th className="pb-3 pr-4">Status</th>
                      <th className="pb-3">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredLinks.map((link) => (
                      <tr key={link.id} className="border-b">
                        <td className="py-3 pr-4">
                          <div className="flex items-center gap-2">
                            <Film className="h-4 w-4 text-muted-foreground" />
                            <span className="font-medium">{link.movie?.title || "Unknown"}</span>
                          </div>
                        </td>
                        <td className="py-3 pr-4">
                          <span className="rounded bg-primary/10 px-2 py-1 text-xs font-medium text-primary">
                            {link.quality}
                          </span>
                        </td>
                        <td className="py-3 pr-4 text-sm">{link.language}</td>
                        <td className="py-3 pr-4 text-sm">{link.sourceName}</td>
                        <td className="py-3 pr-4">
                          <button
                            onClick={() => toggleActive(link)}
                            className={`rounded-full px-2 py-1 text-xs font-medium ${
                              link.isActive
                                ? "bg-green-100 text-green-600"
                                : "bg-red-100 text-red-600"
                            }`}
                          >
                            {link.isActive ? "Active" : "Inactive"}
                          </button>
                        </td>
                        <td className="py-3">
                          <div className="flex items-center gap-2">
                            <a
                              href={link.linkUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="rounded p-1 hover:bg-muted"
                              title="Open Link"
                            >
                              <ExternalLink className="h-4 w-4" />
                            </a>
                            {link.movie && (
                              <Link
                                href={`/admin/movies/${link.movieId}/edit`}
                                className="rounded p-1 hover:bg-muted"
                                title="Edit Movie"
                              >
                                <Edit className="h-4 w-4" />
                              </Link>
                            )}
                            <button
                              onClick={() => handleDelete(link.id)}
                              className="rounded p-1 text-red-500 hover:bg-red-50"
                              title="Delete"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
