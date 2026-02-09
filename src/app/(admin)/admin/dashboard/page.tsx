"use client";

import { useEffect, useState } from "react";
import { Header } from "@/components/admin/Header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Film, CheckCircle, Share2, Eye, TrendingUp, Users, Monitor, Smartphone, Tablet, Globe, RefreshCw } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

interface DashboardStats {
  totalMovies: number;
  publishedMovies: number;
  totalShares: number;
  totalViews: number;
  sharesToday: number;
  sharesThisWeek: number;
  recentMovies: Array<{
    id: number;
    title: string;
    status: string;
    createdAt: string;
  }>;
  topSharedMovies: Array<{
    id: number;
    title: string;
    slug: string;
    shareCount: number;
    viewCount: number;
  }>;
  recentShares: Array<{
    id: number;
    platform: string;
    createdAt: string;
    movie: {
      id: number;
      title: string;
      slug: string;
    };
  }>;
}

interface LiveVisitorStats {
  totalActive: number;
  deviceStats: Record<string, number>;
  pageStats: Array<{ page: string; count: number }>;
  visitors: Array<{
    id: string;
    page: string;
    device: string;
    lastSeen: string;
  }>;
}

export default function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats>({
    totalMovies: 0,
    publishedMovies: 0,
    totalShares: 0,
    totalViews: 0,
    sharesToday: 0,
    sharesThisWeek: 0,
    recentMovies: [],
    topSharedMovies: [],
    recentShares: [],
  });
  const [loading, setLoading] = useState(true);

  // Live visitors state
  const [liveVisitors, setLiveVisitors] = useState<LiveVisitorStats>({
    totalActive: 0,
    deviceStats: {},
    pageStats: [],
    visitors: [],
  });
  const [visitorsLoading, setVisitorsLoading] = useState(true);

  // Fetch live visitors
  const fetchLiveVisitors = async () => {
    try {
      const res = await fetch("/api/analytics/visitors", { credentials: "include" });
      const data = await res.json();
      if (data.success) {
        setLiveVisitors(data.data);
      }
    } catch (error) {
      console.error("Failed to fetch live visitors:", error);
    } finally {
      setVisitorsLoading(false);
    }
  };

  useEffect(() => {
    async function fetchStats() {
      try {
        // Fetch movies stats
        const moviesResponse = await fetch("/api/movies?pageSize=5", {
          credentials: "include",
        });
        const moviesData = await moviesResponse.json();
        
        // Fetch share stats
        const statsResponse = await fetch("/api/admin/stats", {
          credentials: "include",
        });
        const statsData = await statsResponse.json();
        
        if (moviesData.success) {
          setStats((prev) => ({
            ...prev,
            totalMovies: moviesData.data.total,
            publishedMovies: moviesData.data.movies.filter((m: { status: string }) => m.status === "PUBLISHED").length,
            recentMovies: moviesData.data.movies.slice(0, 5),
          }));
        }
        
        if (statsData.success) {
          setStats((prev) => ({
            ...prev,
            totalShares: statsData.data.overview.totalShares,
            totalViews: statsData.data.overview.totalViews,
            sharesToday: statsData.data.overview.sharesToday,
            sharesThisWeek: statsData.data.overview.sharesThisWeek,
            topSharedMovies: statsData.data.topSharedMovies,
            recentShares: statsData.data.recentShares.slice(0, 10),
          }));
        }
      } catch (error) {
        console.error("Failed to fetch stats:", error);
      } finally {
        setLoading(false);
      }
    }

    fetchStats();
    fetchLiveVisitors();

    // Auto-refresh live visitors every 30 seconds
    const interval = setInterval(fetchLiveVisitors, 30000);
    return () => clearInterval(interval);
  }, []);

  const statCards = [
    {
      title: "Total Movies",
      value: stats.totalMovies,
      icon: Film,
      description: "All movies in database",
      color: "text-blue-600",
    },
    {
      title: "Published",
      value: stats.publishedMovies,
      icon: CheckCircle,
      description: "Live on the site",
      color: "text-green-600",
    },
    {
      title: "Total Shares",
      value: stats.totalShares,
      icon: Share2,
      description: `${stats.sharesToday} today, ${stats.sharesThisWeek} this week`,
      color: "text-purple-600",
    },
    {
      title: "Total Views",
      value: stats.totalViews,
      icon: Eye,
      description: "Page views",
      color: "text-orange-600",
    },
  ];

  return (
    <div>
      <Header title="Dashboard" />
      
      <div className="p-6">
        {/* Live Visitors Card - Prominent at top */}
        <Card className="mb-6 border-green-500/30 bg-gradient-to-r from-green-500/10 to-emerald-500/10">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2 text-green-600">
                <div className="relative">
                  <Users className="h-5 w-5" />
                  <span className="absolute -right-1 -top-1 h-2.5 w-2.5 animate-pulse rounded-full bg-green-500" />
                </div>
                Live Visitors
              </CardTitle>
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={fetchLiveVisitors}
                className="text-green-600 hover:text-green-700 hover:bg-green-100"
              >
                <RefreshCw className={`h-4 w-4 ${visitorsLoading ? "animate-spin" : ""}`} />
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-3">
              {/* Total Count */}
              <div className="flex items-center gap-4">
                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-green-500/20">
                  <span className="text-3xl font-bold text-green-600">
                    {visitorsLoading ? "..." : liveVisitors.totalActive}
                  </span>
                </div>
                <div>
                  <p className="text-sm font-medium">Users Online</p>
                  <p className="text-xs text-muted-foreground">Last 5 minutes</p>
                </div>
              </div>

              {/* Device Breakdown */}
              <div className="flex items-center gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2 text-sm">
                    <Monitor className="h-4 w-4 text-blue-500" />
                    <span>Desktop:</span>
                    <span className="font-medium">{liveVisitors.deviceStats.desktop || 0}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <Smartphone className="h-4 w-4 text-purple-500" />
                    <span>Mobile:</span>
                    <span className="font-medium">{liveVisitors.deviceStats.mobile || 0}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <Tablet className="h-4 w-4 text-orange-500" />
                    <span>Tablet:</span>
                    <span className="font-medium">{liveVisitors.deviceStats.tablet || 0}</span>
                  </div>
                </div>
              </div>

              {/* Top Pages */}
              <div>
                <p className="mb-2 text-sm font-medium flex items-center gap-1">
                  <Globe className="h-4 w-4" />
                  Active Pages
                </p>
                {liveVisitors.pageStats.length === 0 ? (
                  <p className="text-xs text-muted-foreground">No active pages</p>
                ) : (
                  <div className="space-y-1">
                    {liveVisitors.pageStats.slice(0, 3).map((page, i) => (
                      <div key={i} className="flex items-center justify-between text-xs">
                        <span className="truncate max-w-[150px]" title={page.page}>
                          {page.page === "/" ? "Home" : page.page}
                        </span>
                        <span className="ml-2 rounded bg-green-100 px-1.5 py-0.5 font-medium text-green-700">
                          {page.count}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Recent Visitors List */}
            {liveVisitors.visitors.length > 0 && (
              <div className="mt-4 border-t pt-4">
                <p className="mb-2 text-sm font-medium">Recent Activity</p>
                <div className="flex flex-wrap gap-2">
                  {liveVisitors.visitors.slice(0, 10).map((visitor, i) => (
                    <div
                      key={i}
                      className="flex items-center gap-1.5 rounded-full bg-muted px-2 py-1 text-xs"
                      title={`${visitor.page} - ${visitor.device}`}
                    >
                      {visitor.device === "mobile" ? (
                        <Smartphone className="h-3 w-3 text-purple-500" />
                      ) : visitor.device === "tablet" ? (
                        <Tablet className="h-3 w-3 text-orange-500" />
                      ) : (
                        <Monitor className="h-3 w-3 text-blue-500" />
                      )}
                      <span className="truncate max-w-[100px]">
                        {visitor.page === "/" ? "Home" : visitor.page.replace(/^\//, "")}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Stats Grid */}
        <div className="mb-8 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {statCards.map((card) => (
            <Card key={card.title}>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  {card.title}
                </CardTitle>
                <card.icon className={`h-5 w-5 ${card.color}`} />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {loading ? "..." : card.value}
                </div>
                <p className="text-xs text-muted-foreground">
                  {card.description}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Two Column Grid */}
        <div className="grid gap-6 lg:grid-cols-2">
          {/* Top Shared Movies */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-purple-600" />
                Top Shared Movies
              </CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <p className="text-muted-foreground">Loading...</p>
              ) : stats.topSharedMovies.length === 0 ? (
                <p className="text-muted-foreground">No shares yet.</p>
              ) : (
                <div className="space-y-3">
                  {stats.topSharedMovies.map((movie, index) => (
                    <div
                      key={movie.id}
                      className="flex items-center justify-between border-b pb-3 last:border-0"
                    >
                      <div className="flex items-center gap-3">
                        <span className="flex h-6 w-6 items-center justify-center rounded-full bg-purple-100 text-xs font-bold text-purple-600">
                          {index + 1}
                        </span>
                        <div>
                          <Link 
                            href={`/movie/${movie.slug}`} 
                            target="_blank"
                            className="font-medium hover:text-purple-600"
                          >
                            {movie.title}
                          </Link>
                        </div>
                      </div>
                      <div className="flex items-center gap-3 text-sm">
                        <span className="flex items-center gap-1 text-purple-600">
                          <Share2 className="h-3.5 w-3.5" />
                          {movie.shareCount}
                        </span>
                        <span className="flex items-center gap-1 text-muted-foreground">
                          <Eye className="h-3.5 w-3.5" />
                          {movie.viewCount}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Recent Shares */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Share2 className="h-5 w-5 text-green-600" />
                Recent Shares
              </CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <p className="text-muted-foreground">Loading...</p>
              ) : stats.recentShares.length === 0 ? (
                <p className="text-muted-foreground">No shares yet.</p>
              ) : (
                <div className="space-y-3">
                  {stats.recentShares.map((share) => (
                    <div
                      key={share.id}
                      className="flex items-center justify-between border-b pb-3 last:border-0"
                    >
                      <div>
                        <Link 
                          href={`/movie/${share.movie.slug}`} 
                          target="_blank"
                          className="font-medium hover:text-green-600"
                        >
                          {share.movie.title}
                        </Link>
                        <p className="text-xs text-muted-foreground">
                          {new Date(share.createdAt).toLocaleString()}
                        </p>
                      </div>
                      <span className="rounded-full bg-green-100 px-2 py-1 text-xs font-medium text-green-700">
                        {share.platform || "native"}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Recent Movies */}
        <Card className="mt-6">
          <CardHeader>
            <CardTitle>Recent Movies</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <p className="text-muted-foreground">Loading...</p>
            ) : stats.recentMovies.length === 0 ? (
              <p className="text-muted-foreground">No movies yet. Add your first movie!</p>
            ) : (
              <div className="space-y-4">
                {stats.recentMovies.map((movie) => (
                  <div
                    key={movie.id}
                    className="flex items-center justify-between border-b pb-4 last:border-0"
                  >
                    <div>
                      <p className="font-medium">{movie.title}</p>
                      <p className="text-sm text-muted-foreground">
                        Added {new Date(movie.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                    <span
                      className={`rounded-full px-2 py-1 text-xs font-medium ${
                        movie.status === "PUBLISHED"
                          ? "bg-green-100 text-green-800"
                          : movie.status === "DRAFT"
                          ? "bg-yellow-100 text-yellow-800"
                          : "bg-gray-100 text-gray-800"
                      }`}
                    >
                      {movie.status}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
