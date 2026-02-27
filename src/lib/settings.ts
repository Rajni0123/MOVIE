import prisma from "@/lib/db/prisma";

export interface SiteSettings {
  siteName: string;
  siteUrl: string;
  siteDescription: string;
  logoUrl: string;
  faviconUrl: string;
  telegramUrl: string;
  twitterUrl: string;
  facebookUrl: string;
  instagramUrl: string;
  googleAnalyticsId: string;
  footerText: string;
  [key: string]: string; // Index signature for dynamic access
}

const DEFAULT_SETTINGS: SiteSettings = {
  siteName: "MovPix",
  siteUrl: process.env.NEXT_PUBLIC_SITE_URL || "https://moviehub.com",
  siteDescription: "Download latest movies in HD quality - 480p, 720p, 1080p",
  logoUrl: "/logo.png",
  faviconUrl: "/favicon.ico",
  telegramUrl: "https://t.me/moviehub",
  twitterUrl: "",
  facebookUrl: "",
  instagramUrl: "",
  googleAnalyticsId: "",
  footerText: "© 2024 MovPix. All rights reserved.",
};

// Cache settings in memory for 5 minutes
let cachedSettings: SiteSettings | null = null;
let cacheTime: number = 0;
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

export async function getSiteSettings(): Promise<SiteSettings> {
  // Return cached settings if still valid
  if (cachedSettings && Date.now() - cacheTime < CACHE_DURATION) {
    return cachedSettings;
  }

  try {
    let settings: { key: string; value: string }[] = [];
    
    try {
      settings = await prisma.siteSetting.findMany();
    } catch (dbError) {
      // Table might not exist yet
      console.log("Settings table not found, using defaults");
      return DEFAULT_SETTINGS;
    }
    
    const settingsObj: SiteSettings = { ...DEFAULT_SETTINGS };
    settings.forEach((s) => {
      if (s.key in settingsObj) {
        (settingsObj as Record<string, string>)[s.key] = s.value;
      }
    });

    // Update cache
    cachedSettings = settingsObj;
    cacheTime = Date.now();

    return settingsObj;
  } catch (error) {
    console.error("Failed to fetch site settings:", error);
    return DEFAULT_SETTINGS;
  }
}

export function getDefaultSettings(): SiteSettings {
  return { ...DEFAULT_SETTINGS };
}

// Clear cache (call after settings update)
export function clearSettingsCache() {
  cachedSettings = null;
  cacheTime = 0;
}
