import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db/prisma";
import { requireAuth } from "@/lib/auth";
import { clearSettingsCache } from "@/lib/settings";

// Default settings
const DEFAULT_SETTINGS: Record<string, string> = {
  siteName: "MovPix",
  siteUrl: "https://moviehub.com",
  siteDescription: "Download latest movies in HD quality - 480p, 720p, 1080p",
  siteKeywords: "movie download, free movies, HD movies, 480p movies, 720p movies, 1080p movies",
  logoType: "text",
  logoText: "MovPix",
  logoUrl: "",
  logoIcon: "Film",
  faviconUrl: "/favicon.ico",
  telegramUrl: "",
  twitterUrl: "",
  facebookUrl: "",
  instagramUrl: "",
  googleAnalyticsId: "",
  googleSearchConsoleId: "",
  footerText: "© 2024 MovPix. All rights reserved.",
  // Link Monetization
  linkMonetizationEnabled: "false",
  linkMonetizationUrl: "",
  linkMonetizationExcludeDomains: "drive.google.com",
};

// GET /api/admin/settings - Get all settings
export async function GET(request: NextRequest) {
  try {
    let settings: { key: string; value: string }[] = [];
    
    try {
      settings = await prisma.siteSetting.findMany();
    } catch (dbError) {
      // Table might not exist yet, return defaults
      console.log("Settings table not found, using defaults");
    }
    
    // Convert to object format
    const settingsObj: Record<string, string> = { ...DEFAULT_SETTINGS };
    settings.forEach((s) => {
      settingsObj[s.key] = s.value;
    });

    return NextResponse.json({
      success: true,
      data: settingsObj,
    });
  } catch (error) {
    console.error("Fetch settings error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch settings" },
      { status: 500 }
    );
  }
}

// PUT /api/admin/settings - Update settings (admin only)
export async function PUT(request: NextRequest) {
  try {
    const auth = await requireAuth(request);
    if (!auth.authenticated) {
      return NextResponse.json(
        { success: false, error: auth.error },
        { status: 401 }
      );
    }

    const body = await request.json();
    const updates: { key: string; value: string }[] = [];

    console.log("Received settings update:", body);

    // Validate and collect updates - convert all values to strings
    for (const [key, value] of Object.entries(body)) {
      if (value === null || value === undefined) continue;
      
      // Convert boolean to string
      if (typeof value === "boolean") {
        console.log(`Converting boolean ${key}:`, value, "to string:", value.toString());
        updates.push({ key, value: value.toString() });
      } else if (typeof value === "string") {
        updates.push({ key, value });
      } else if (typeof value === "number") {
        updates.push({ key, value: value.toString() });
      }
    }
    
    console.log("Settings to save:", updates.length, "items");

    // Upsert each setting
    for (const update of updates) {
      try {
        await prisma.siteSetting.upsert({
          where: { key: update.key },
          update: { value: update.value },
          create: { key: update.key, value: update.value },
        });
      } catch (upsertError) {
        console.error(`Failed to upsert setting ${update.key}:`, upsertError);
        throw upsertError;
      }
    }

    // Clear cache so new settings take effect
    clearSettingsCache();

    // Fetch updated settings
    const settings = await prisma.siteSetting.findMany();
    const settingsObj: Record<string, string> = { ...DEFAULT_SETTINGS };
    settings.forEach((s) => {
      settingsObj[s.key] = s.value;
    });

    return NextResponse.json({
      success: true,
      data: settingsObj,
      message: "Settings updated successfully",
    });
  } catch (error) {
    console.error("Update settings error:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      { success: false, error: `Failed to update settings: ${errorMessage}` },
      { status: 500 }
    );
  }
}
