"use client";

import { useEffect, useState } from "react";
import { Download, Loader2, FileDown } from "lucide-react";

interface DownloadLink {
  id: number;
  linkUrl: string;
  quality: string | null;
  language: string | null;
  sourceName: string;
}

interface MonetizationSettings {
  enabled: boolean;
  url: string;
  excludeDomains: string[];
}

interface SiteSettings {
  siteName: string;
}

interface DownloadLinksProps {
  links: DownloadLink[];
  movieTitle?: string;
}

// Check if URL should be excluded from monetization
function shouldExclude(url: string, excludeDomains: string[]): boolean {
  if (!excludeDomains || excludeDomains.length === 0) return false;
  
  try {
    const urlObj = new URL(url);
    const hostname = urlObj.hostname.toLowerCase();
    
    return excludeDomains.some(domain => {
      const cleanDomain = domain.toLowerCase().trim();
      if (cleanDomain.startsWith("*.")) {
        return hostname.endsWith(cleanDomain.slice(2));
      }
      return hostname === cleanDomain || hostname.endsWith("." + cleanDomain);
    });
  } catch {
    return false;
  }
}

// Create monetized URL
function createMonetizedUrl(originalUrl: string, monetizationUrl: string): string {
  try {
    const encoded = btoa(encodeURIComponent(originalUrl));
    const baseUrl = monetizationUrl.endsWith("/") 
      ? monetizationUrl 
      : monetizationUrl + "/";
    return `${baseUrl}token.php?post=${encoded}`;
  } catch {
    return originalUrl;
  }
}

// Get final URL (monetized or original)
function getFinalUrl(
  originalUrl: string, 
  settings: MonetizationSettings
): string {
  if (!settings.enabled || !settings.url) {
    return originalUrl;
  }
  
  if (shouldExclude(originalUrl, settings.excludeDomains)) {
    return originalUrl;
  }
  
  return createMonetizedUrl(originalUrl, settings.url);
}

export function DownloadLinks({ links, movieTitle = "" }: DownloadLinksProps) {
  const [monetization, setMonetization] = useState<MonetizationSettings>({
    enabled: false,
    url: "",
    excludeDomains: [],
  });
  const [siteSettings, setSiteSettings] = useState<SiteSettings>({
    siteName: "MovPix",
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Check if we're in browser environment
    if (typeof window === "undefined") {
      setLoading(false);
      return;
    }

    // Fetch monetization settings and site settings
    Promise.all([
      fetch("/api/settings/monetization")
        .then(res => {
          if (!res.ok) throw new Error("Failed to fetch monetization settings");
          return res.json();
        })
        .catch(() => ({ success: false, data: null })),
      fetch("/api/settings")
        .then(res => {
          if (!res.ok) throw new Error("Failed to fetch site settings");
          return res.json();
        })
        .catch(() => ({ success: false, data: null })),
    ])
      .then(([monetizationData, settingsData]) => {
        if (monetizationData.success && monetizationData.data) {
          setMonetization(monetizationData.data);
        }
        if (settingsData.success && settingsData.data?.siteName) {
          setSiteSettings({ siteName: settingsData.data.siteName });
        }
      })
      .catch(err => {
        console.debug("Failed to load settings:", err);
        setError("Failed to load settings");
      })
      .finally(() => setLoading(false));
  }, []);

  // Sort links by quality (1080p > 720p > 480p)
  const sortedLinks = [...links].sort((a, b) => {
    const qualityOrder: Record<string, number> = { 
      "4K": 4, "2160p": 4,
      "1080p": 3, "Full HD": 3,
      "720p": 2, "HD": 2,
      "480p": 1, "SD": 1 
    };
    const aOrder = qualityOrder[a.quality || ""] || 0;
    const bOrder = qualityOrder[b.quality || ""] || 0;
    return bOrder - aOrder;
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-lg border border-yellow-500/50 bg-yellow-500/10 p-4">
        <p className="text-sm text-yellow-600 dark:text-yellow-400">
          {error}. Please refresh the page.
        </p>
      </div>
    );
  }

  if (sortedLinks.length === 0) {
    return (
      <p className="py-6 text-center text-sm text-muted-foreground md:py-8">
        Download links coming soon
      </p>
    );
  }

  // Clean movie title for display
  const cleanTitle = movieTitle
    .replace(/\s*\(\d{4}\)\s*/g, "") // Remove year in parentheses
    .replace(/\s*\[\d{4}\]\s*/g, "") // Remove year in brackets
    .trim();

  return (
    <div className="grid grid-cols-1 gap-3 sm:gap-4 md:grid-cols-2">
      {sortedLinks.map((link, index) => (
        <a
          key={link.id || index}
          href={getFinalUrl(link.linkUrl, monetization)}
          target="_blank"
          rel="noopener noreferrer"
          className="group relative flex w-full items-center gap-3 overflow-hidden rounded-lg border bg-card px-3 py-2.5 transition-all active:scale-[0.98] hover:border-primary hover:bg-primary/5 md:px-4 md:py-3"
          style={{ minWidth: 0 }}
        >
          <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary transition-colors group-hover:bg-primary group-hover:text-primary-foreground md:h-9 md:w-9">
            <FileDown className="h-4 w-4" />
          </div>
          <div className="flex min-w-0 flex-1 flex-col overflow-hidden" style={{ minWidth: 0 }}>
            <span className="truncate text-sm font-semibold leading-tight">
              {cleanTitle ? `${cleanTitle}` : "Download"} {link.quality || ""}
            </span>
            <span className="truncate text-xs text-muted-foreground leading-tight">
              {link.language && `${link.language} • `}
              {link.quality && `${link.quality} • `}
              {siteSettings.siteName}
            </span>
          </div>
          <Download className="h-4 w-4 flex-shrink-0 text-muted-foreground transition-colors group-hover:text-primary" />
        </a>
      ))}
    </div>
  );
}
