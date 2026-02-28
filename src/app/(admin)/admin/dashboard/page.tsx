"use client";

import { useEffect, useState } from "react";
import { Header } from "@/components/admin/Header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Film, CheckCircle, Share2, Eye, TrendingUp, Users, Monitor, Smartphone, Tablet, Globe, RefreshCw, Server, Cpu, HardDrive, Activity } from "lucide-react";
import { Progress } from "@/components/ui/progress";
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

interface ServerStatus {
  cpu: {
    model: string;
    cores: number;
    usage: number;
    loadAvg: {
      "1min": string;
      "5min": string;
      "15min": string;
    };
  };
  memory: {
    total: number;
    used: number;
    free: number;
    usagePercent: number;
  };
  disk: {
    total: number;
    used: number;
    free: number;
    percent: number;
  };
  system: {
    platform: string;
    hostname: string;
    uptime: number;
    nodeVersion: string;
    primaryIP: string;
  };
  process: {
    pid: number;
    heapUsed: number;
    heapTotal: number;
    rss: number;
    external: number;
  };
  pm2: {
    name: string;
    status: string;
    uptime: number;
    restarts: number;
    memory: number;
    cpu: number;
  } | null;
  timestamp: number;
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

  // Server status state
  const [serverStatus, setServerStatus] = useState<ServerStatus | null>(null);
  const [serverLoading, setServerLoading] = useState(true);

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

  // Fetch server status
  const fetchServerStatus = async () => {
    try {
      const res = await fetch("/api/admin/server-status", { credentials: "include" });
      const data = await res.json();
      if (data.success) {
        setServerStatus(data.data);
      }
    } catch (error) {
      console.error("Failed to fetch server status:", error);
    } finally {
      setServerLoading(false);
    }
  };

  // Format bytes to human readable
  const formatBytes = (bytes: number) => {
    if (bytes === 0) return "0 B";
    const k = 1024;
    const sizes = ["B", "KB", "MB", "GB", "TB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  // Format uptime to human readable
  const formatUptime = (seconds: number) => {
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    if (days > 0) return `${days}d ${hours}h ${minutes}m`;
    if (hours > 0) return `${hours}h ${minutes}m`;
    return `${minutes}m`;
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
    fetchServerStatus();

    // Auto-refresh live visitors every 30 seconds
    const visitorsInterval = setInterval(fetchLiveVisitors, 30000);
    // Auto-refresh server status every 10 seconds
    const serverInterval = setInterval(fetchServerStatus, 10000);
    return () => {
      clearInterval(visitorsInterval);
      clearInterval(serverInterval);
    };
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

        {/* Server Status Card */}
        <Card className="mb-6 border-blue-500/30 bg-gradient-to-r from-blue-500/10 to-cyan-500/10">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2 text-blue-600">
                <Server className="h-5 w-5" />
                Server Status
              </CardTitle>
              <Button
                variant="ghost"
                size="sm"
                onClick={fetchServerStatus}
                className="text-blue-600 hover:text-blue-700 hover:bg-blue-100"
              >
                <RefreshCw className={`h-4 w-4 ${serverLoading ? "animate-spin" : ""}`} />
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {serverLoading && !serverStatus ? (
              <p className="text-muted-foreground">Loading server status...</p>
            ) : serverStatus ? (
              <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
                {/* CPU Usage */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-2 text-sm font-medium">
                      <Cpu className="h-4 w-4 text-orange-500" />
                      CPU Usage
                    </span>
                    <span className="text-sm font-bold text-orange-600">{serverStatus.cpu.usage}%</span>
                  </div>
                  <Progress value={serverStatus.cpu.usage} className="h-2" />
                  <div className="text-xs text-muted-foreground">
                    {serverStatus.cpu.cores} cores • Load: {serverStatus.cpu.loadAvg["1min"]}
                  </div>
                </div>

                {/* Memory Usage */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-2 text-sm font-medium">
                      <Activity className="h-4 w-4 text-purple-500" />
                      Memory
                    </span>
                    <span className="text-sm font-bold text-purple-600">{serverStatus.memory.usagePercent}%</span>
                  </div>
                  <Progress value={serverStatus.memory.usagePercent} className="h-2" />
                  <div className="text-xs text-muted-foreground">
                    {formatBytes(serverStatus.memory.used)} / {formatBytes(serverStatus.memory.total)}
                  </div>
                </div>

                {/* Disk Usage */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-2 text-sm font-medium">
                      <HardDrive className="h-4 w-4 text-green-500" />
                      Disk
                    </span>
                    <span className="text-sm font-bold text-green-600">{serverStatus.disk.percent}%</span>
                  </div>
                  <Progress value={serverStatus.disk.percent} className="h-2" />
                  <div className="text-xs text-muted-foreground">
                    {formatBytes(serverStatus.disk.used)} / {formatBytes(serverStatus.disk.total)}
                  </div>
                </div>

                {/* System Info */}
                <div className="space-y-2">
                  <span className="flex items-center gap-2 text-sm font-medium">
                    <Globe className="h-4 w-4 text-blue-500" />
                    System Info
                  </span>
                  <div className="space-y-1 text-xs">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Uptime:</span>
                      <span className="font-medium">{formatUptime(serverStatus.system.uptime)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Platform:</span>
                      <span className="font-medium">{serverStatus.system.platform}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Node:</span>
                      <span className="font-medium">{serverStatus.system.nodeVersion}</span>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <p className="text-muted-foreground">Failed to load server status</p>
            )}

            {/* PM2 Process Info */}
            {serverStatus?.pm2 && (
              <div className="mt-4 border-t pt-4">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-sm font-medium">PM2 Process: {serverStatus.pm2.name}</span>
                  <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                    serverStatus.pm2.status === "online"
                      ? "bg-green-100 text-green-700"
                      : "bg-red-100 text-red-700"
                  }`}>
                    {serverStatus.pm2.status}
                  </span>
                </div>
                <div className="grid grid-cols-4 gap-4 text-xs">
                  <div>
                    <span className="text-muted-foreground">Memory:</span>
                    <span className="ml-1 font-medium">{formatBytes(serverStatus.pm2.memory)}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">CPU:</span>
                    <span className="ml-1 font-medium">{serverStatus.pm2.cpu}%</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Restarts:</span>
                    <span className="ml-1 font-medium">{serverStatus.pm2.restarts}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Uptime:</span>
                    <span className="ml-1 font-medium">
                      {serverStatus.pm2.uptime ? formatUptime((Date.now() - serverStatus.pm2.uptime) / 1000) : "N/A"}
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* Process Memory */}
            {serverStatus && (
              <div className="mt-4 border-t pt-4">
                <div className="grid grid-cols-4 gap-4 text-xs">
                  <div>
                    <span className="text-muted-foreground">Heap Used:</span>
                    <span className="ml-1 font-medium">{formatBytes(serverStatus.process.heapUsed)}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Heap Total:</span>
                    <span className="ml-1 font-medium">{formatBytes(serverStatus.process.heapTotal)}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">RSS:</span>
                    <span className="ml-1 font-medium">{formatBytes(serverStatus.process.rss)}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">PID:</span>
                    <span className="ml-1 font-medium">{serverStatus.process.pid}</span>
                  </div>
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
