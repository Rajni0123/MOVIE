import { NextResponse } from "next/server";
import prisma from "@/lib/db/prisma";

// Default settings
const DEFAULT_SETTINGS: Record<string, string> = {
  siteName: "MovPix",
  siteUrl: "https://moviehub.com",
  siteDescription: "Download latest movies in HD quality - 480p, 720p, 1080p",
  logoType: "text",
  logoText: "MovPix",
  logoUrl: "",
  logoIcon: "Film",
  faviconUrl: "/favicon.ico",
  telegramUrl: "https://t.me/moviehub",
  twitterUrl: "",
  facebookUrl: "",
  instagramUrl: "",
  footerText: "© 2024 MovPix. All rights reserved.",
};

// GET /api/settings - Get public site settings (no auth required)
export async function GET() {
  try {
    let settings: { key: string; value: string }[] = [];
    
    try {
      settings = await prisma.siteSetting.findMany();
    } catch (dbError) {
      console.log("Settings table not found, using defaults");
    }

    // Convert to object format
    const settingsObj: Record<string, string> = { ...DEFAULT_SETTINGS };
    settings.forEach((s) => {
      settingsObj[s.key] = s.value;
    });

    // Only return public settings (not sensitive data)
    return NextResponse.json({
      success: true,
      data: {
        siteName: settingsObj.siteName,
        siteUrl: settingsObj.siteUrl,
        siteDescription: settingsObj.siteDescription,
        logoType: settingsObj.logoType,
        logoText: settingsObj.logoText,
        logoUrl: settingsObj.logoUrl,
        logoIcon: settingsObj.logoIcon,
        telegramUrl: settingsObj.telegramUrl,
        twitterUrl: settingsObj.twitterUrl,
        facebookUrl: settingsObj.facebookUrl,
        instagramUrl: settingsObj.instagramUrl,
        footerText: settingsObj.footerText,
      },
    });
  } catch (error) {
    console.error("Fetch public settings error:", error);
    // Return defaults on error so the app still works
    return NextResponse.json({
      success: true,
      data: DEFAULT_SETTINGS,
    });
  }
}
