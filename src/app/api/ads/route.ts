import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db/prisma";

export const dynamic = "force-dynamic";

const AD_SETTINGS_KEYS = [
  "popAdsEnabled",
  "popAdsCode",
  "propellerAdsEnabled",
  "propellerAdsCode",
  "adsterraEnabled",
  "adsterraBannerCode",
  "adsterraPopCode",
  "adsterraNativeCode",
  "headerBannerEnabled",
  "headerBannerCode",
  "sidebarBannerEnabled",
  "sidebarBannerCode",
  "footerBannerEnabled",
  "footerBannerCode",
  "inContentBannerEnabled",
  "inContentBannerCode",
];

// GET /api/ads - Get public ad settings (no caching for real-time updates)
export async function GET(request: NextRequest) {
  try {
    const settings = await prisma.siteSetting.findMany({
      where: {
        key: { in: AD_SETTINGS_KEYS },
      },
    });

    // Convert to object
    const settingsObj: Record<string, string | boolean> = {};
    settings.forEach((s) => {
      if (s.key.endsWith("Enabled")) {
        settingsObj[s.key] = s.value === "true";
      } else {
        settingsObj[s.key] = s.value;
      }
    });

    return NextResponse.json({
      success: true,
      data: settingsObj,
    });
  } catch (error) {
    console.error("Error fetching ad settings:", error);
    return NextResponse.json({
      success: true,
      data: {},
    });
  }
}
