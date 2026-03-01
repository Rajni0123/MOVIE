import prisma from "@/lib/db/prisma";
import Script from "next/script";

// Extract script src and inline content from script tag HTML
function parseScriptTag(html: string): { src?: string; content?: string; dataAttrs: Record<string, string> } {
  const srcMatch = html.match(/src=["']([^"']+)["']/i);
  const contentMatch = html.match(/<script[^>]*>([\s\S]*?)<\/script>/i);

  // Extract data attributes
  const dataAttrs: Record<string, string> = {};
  const dataMatches = html.matchAll(/data-([a-zA-Z0-9-]+)=["']([^"']+)["']/gi);
  for (const match of dataMatches) {
    dataAttrs[`data-${match[1]}`] = match[2];
  }

  return {
    src: srcMatch ? srcMatch[1] : undefined,
    content: contentMatch ? contentMatch[1].trim() : undefined,
    dataAttrs,
  };
}

// Server component that injects ad scripts for verification
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

    const scripts: { id: string; code: string }[] = [];

    // Pop Ads
    if (settingsMap.popAdsEnabled === "true" && settingsMap.popAdsCode) {
      scripts.push({ id: "pop-ads", code: settingsMap.popAdsCode });
    }

    // Propeller/Monetag Ads
    if (settingsMap.propellerAdsEnabled === "true" && settingsMap.propellerAdsCode) {
      scripts.push({ id: "monetag-ads", code: settingsMap.propellerAdsCode });
    }

    if (scripts.length === 0) {
      return null;
    }

    return (
      <>
        {scripts.map(({ id, code }) => {
          const parsed = parseScriptTag(code);

          if (parsed.src) {
            // External script
            return (
              <Script
                key={id}
                id={id}
                src={parsed.src}
                strategy="afterInteractive"
                {...parsed.dataAttrs}
              />
            );
          } else if (parsed.content) {
            // Inline script
            return (
              <Script
                key={id}
                id={id}
                strategy="afterInteractive"
                dangerouslySetInnerHTML={{ __html: parsed.content }}
              />
            );
          }

          return null;
        })}
      </>
    );
  } catch (error) {
    console.error("Error loading ad scripts:", error);
    return null;
  }
}
