import { NextResponse } from "next/server";
import prisma from "@/lib/db/prisma";

// GET /api/settings/domains - Get domain settings for middleware (public, cached)
export async function GET() {
  try {
    const domainKeys = ["primaryDomain", "backupDomains", "oldDomains", "domainRedirectEnabled"];

    let settings: { key: string; value: string }[] = [];

    try {
      settings = await prisma.siteSetting.findMany({
        where: {
          key: {
            in: domainKeys
          }
        }
      });
    } catch (dbError) {
      console.log("Settings table not found");
    }

    const domainSettings: Record<string, string> = {
      primaryDomain: "",
      backupDomains: "",
      oldDomains: "",
      domainRedirectEnabled: "false",
    };

    settings.forEach((s) => {
      domainSettings[s.key] = s.value;
    });

    // Parse domains into arrays
    const primaryDomain = domainSettings.primaryDomain.trim();
    const backupDomains = domainSettings.backupDomains
      .split(",")
      .map(d => d.trim())
      .filter(Boolean);
    const oldDomains = domainSettings.oldDomains
      .split(",")
      .map(d => d.trim())
      .filter(Boolean);
    const redirectEnabled = domainSettings.domainRedirectEnabled === "true";

    // All allowed domains (primary + backups)
    const allowedDomains = primaryDomain
      ? [primaryDomain, ...backupDomains]
      : backupDomains;

    return NextResponse.json({
      success: true,
      data: {
        primaryDomain,
        backupDomains,
        oldDomains,
        allowedDomains,
        redirectEnabled,
      },
    }, {
      headers: {
        // Cache for 1 minute - quick enough for domain changes
        "Cache-Control": "public, s-maxage=60, stale-while-revalidate=30",
      }
    });
  } catch (error) {
    console.error("Fetch domain settings error:", error);
    return NextResponse.json({
      success: false,
      data: {
        primaryDomain: "",
        backupDomains: [],
        oldDomains: [],
        allowedDomains: [],
        redirectEnabled: false,
      },
    });
  }
}
