import prisma from "@/lib/db/prisma";

// Server component that injects ad scripts directly into HTML for verification
export async function AdScriptsHead() {
  try {
    const settings = await prisma.siteSetting.findMany({
      where: {
        key: {
          in: [
            "popAdsEnabled",
            "popAdsCode",
            "propellerAdsEnabled",
            "propellerAdsCode",
          ],
        },
      },
    });

    const settingsMap: Record<string, string> = {};
    settings.forEach((s) => {
      settingsMap[s.key] = s.value;
    });

    const scripts: string[] = [];

    // Pop Ads
    if (settingsMap.popAdsEnabled === "true" && settingsMap.popAdsCode) {
      scripts.push(settingsMap.popAdsCode);
    }

    // Propeller/Monetag Ads
    if (settingsMap.propellerAdsEnabled === "true" && settingsMap.propellerAdsCode) {
      scripts.push(settingsMap.propellerAdsCode);
    }

    if (scripts.length === 0) {
      return null;
    }

    // Combine all scripts and inject directly
    const combinedScripts = scripts.join('\n');

    return (
      <section
        id="ad-scripts"
        suppressHydrationWarning
        dangerouslySetInnerHTML={{ __html: combinedScripts }}
      />
    );
  } catch (error) {
    console.error("Error loading ad scripts:", error);
    return null;
  }
}
