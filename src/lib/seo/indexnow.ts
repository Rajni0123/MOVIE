/**
 * IndexNow API Integration
 * Automatically submit URLs to search engines (Bing, Yandex, DuckDuckGo)
 * for faster indexing
 */

const INDEXNOW_KEY = "movpixindexnow2024";
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://movpix.xyz";
const INDEXNOW_API = "https://api.indexnow.org/indexnow";

interface IndexNowResult {
  success: boolean;
  message: string;
  urlCount: number;
}

/**
 * Submit URLs to IndexNow for instant indexing
 * @param urls - Array of URLs or paths to submit
 * @returns Result of the submission
 */
export async function submitToIndexNow(urls: string[]): Promise<IndexNowResult> {
  if (!urls || urls.length === 0) {
    return { success: false, message: "No URLs provided", urlCount: 0 };
  }

  // Convert paths to full URLs
  const fullUrls = urls.map(url =>
    url.startsWith("http") ? url : `${SITE_URL}${url.startsWith("/") ? "" : "/"}${url}`
  );

  // IndexNow has a limit of 10,000 URLs per request
  const urlBatches: string[][] = [];
  for (let i = 0; i < fullUrls.length; i += 10000) {
    urlBatches.push(fullUrls.slice(i, i + 10000));
  }

  let totalSubmitted = 0;
  const errors: string[] = [];

  for (const batch of urlBatches) {
    try {
      const response = await fetch(INDEXNOW_API, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          host: new URL(SITE_URL).hostname,
          key: INDEXNOW_KEY,
          keyLocation: `${SITE_URL}/${INDEXNOW_KEY}.txt`,
          urlList: batch,
        }),
      });

      if (response.ok || response.status === 200 || response.status === 202) {
        totalSubmitted += batch.length;
        console.log(`✅ IndexNow: Submitted ${batch.length} URLs`);
      } else {
        const errorText = await response.text();
        errors.push(`HTTP ${response.status}: ${errorText}`);
        console.error(`❌ IndexNow error: ${response.status}`, errorText);
      }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : "Unknown error";
      errors.push(errorMsg);
      console.error("❌ IndexNow request failed:", error);
    }
  }

  return {
    success: totalSubmitted > 0,
    message: errors.length > 0
      ? `Submitted ${totalSubmitted}/${fullUrls.length} URLs. Errors: ${errors.join(", ")}`
      : `Successfully submitted ${totalSubmitted} URLs to IndexNow`,
    urlCount: totalSubmitted,
  };
}

/**
 * Submit a single movie URL to IndexNow
 * @param slug - Movie slug
 */
export async function indexMovie(slug: string): Promise<IndexNowResult> {
  return submitToIndexNow([`/movie/${slug}`]);
}

/**
 * Submit multiple movie URLs to IndexNow
 * @param slugs - Array of movie slugs
 */
export async function indexMovies(slugs: string[]): Promise<IndexNowResult> {
  const urls = slugs.map(slug => `/movie/${slug}`);
  return submitToIndexNow(urls);
}

/**
 * Submit sitemap and main pages to IndexNow
 */
export async function indexMainPages(): Promise<IndexNowResult> {
  const mainUrls = [
    "/",
    "/movies",
    "/popular",
    "/trending",
    "/genres",
    "/years",
    "/sitemap.xml",
  ];
  return submitToIndexNow(mainUrls);
}
