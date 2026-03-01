import prisma from "@/lib/db/prisma";

// Server component that injects ad scripts directly into HTML for verification
// NOTE: Only PopAds is enabled here - Propeller/Monetag disabled to prevent blocking movie navigation
export async function AdScriptsHead() {
  try {
    const settings = await prisma.siteSetting.findMany({
      where: {
        key: {
          in: [
            "popAdsEnabled",
            "popAdsCode",
          ],
        },
      },
    });

    const settingsMap: Record<string, string> = {};
    settings.forEach((s) => {
      settingsMap[s.key] = s.value;
    });

    const scripts: string[] = [];

    // Pop Ads only (pop-under - doesn't block navigation)
    if (settingsMap.popAdsEnabled === "true" && settingsMap.popAdsCode) {
      scripts.push(settingsMap.popAdsCode);
    }

    // Propeller/Monetag DISABLED - was blocking movie page navigation on mobile
    // if (settingsMap.propellerAdsEnabled === "true" && settingsMap.propellerAdsCode) {
    //   scripts.push(settingsMap.propellerAdsCode);
    // }

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
