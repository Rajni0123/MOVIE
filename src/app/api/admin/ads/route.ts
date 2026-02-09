import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db/prisma";
import { requireAuth } from "@/lib/auth";

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

// GET /api/admin/ads - Get all ad settings
export async function GET(request: NextRequest) {
  const auth = await requireAuth(request);
  if (!auth.authenticated) {
    return NextResponse.json({ error: auth.error }, { status: 401 });
  }

  try {
    const settings = await prisma.siteSetting.findMany({
      where: {
        key: { in: AD_SETTINGS_KEYS },
      },
    });

    // Convert to object
    const settingsObj: Record<string, string | boolean> = {};
    settings.forEach((s) => {
      // Convert string "true"/"false" to boolean for enabled flags
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
    return NextResponse.json(
      { error: "Failed to fetch ad settings" },
      { status: 500 }
    );
  }
}

// PUT /api/admin/ads - Update ad settings
export async function PUT(request: NextRequest) {
  const auth = await requireAuth(request);
  if (!auth.authenticated) {
    return NextResponse.json({ error: auth.error }, { status: 401 });
  }

  try {
    const body = await request.json();

    // Update each setting
    for (const key of AD_SETTINGS_KEYS) {
      if (body[key] !== undefined) {
        const value = typeof body[key] === "boolean" 
          ? String(body[key]) 
          : String(body[key] || "");

        await prisma.siteSetting.upsert({
          where: { key },
          update: { value },
          create: { key, value },
        });
      }
    }

    return NextResponse.json({
      success: true,
      message: "Ad settings updated successfully",
    });
  } catch (error) {
    console.error("Error updating ad settings:", error);
    return NextResponse.json(
      { error: "Failed to update ad settings" },
      { status: 500 }
    );
  }
}
