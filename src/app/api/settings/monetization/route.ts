import { NextResponse } from "next/server";
import prisma from "@/lib/db/prisma";

export const dynamic = "force-dynamic";

// Public endpoint to get monetization settings
export async function GET() {
  try {
    // Fetch monetization settings
    const settings = await prisma.siteSetting.findMany({
      where: {
        key: {
          in: [
            "linkMonetizationEnabled",
            "linkMonetizationUrl",
            "linkMonetizationExcludeDomains",
          ],
        },
      },
    });

    // Convert to object
    const settingsObj: Record<string, string> = {};
    settings.forEach((s) => {
      settingsObj[s.key] = s.value;
    });

    console.log("Raw monetization settings from DB:", settingsObj);

    const result = {
      enabled: settingsObj.linkMonetizationEnabled === "true",
      url: settingsObj.linkMonetizationUrl || "",
      excludeDomains: settingsObj.linkMonetizationExcludeDomains
        ? settingsObj.linkMonetizationExcludeDomains.split("\n").map(d => d.trim()).filter(Boolean)
        : [],
    };

    console.log("Returning monetization settings:", result);

    return NextResponse.json({
      success: true,
      data: result,
    });
  } catch (error) {
    console.error("Error fetching monetization settings:", error);
    return NextResponse.json({
      success: true,
      data: {
        enabled: false,
        url: "",
        excludeDomains: [],
      },
    });
  }
}
