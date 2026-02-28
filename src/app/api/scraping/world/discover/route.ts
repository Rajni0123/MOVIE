import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import * as cheerio from "cheerio";

interface DiscoveredMovie {
  title: string;
  url: string;
  year?: string;
  posterUrl?: string;
}

// POST /api/scraping/world/discover - Discover movies from WorldFree4u category pages
export async function POST(request: NextRequest) {
  try {
    const auth = await requireAuth(request);
    if (!auth.authenticated) {
      return NextResponse.json(
        { success: false, error: auth.error },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { url } = body;

    if (!url) {
      return NextResponse.json(
        { success: false, error: "URL is required" },
        { status: 400 }
      );
    }

    // Validate URL is from WorldFree4u
    const urlObj = new URL(url);
    if (!urlObj.hostname.includes("worldfree4u")) {
      return NextResponse.json(
        { success: false, error: "URL must be from worldfree4u" },
        { status: 400 }
      );
    }

    // Fetch the page
    console.log(`[WORLD DISCOVER] Fetching: ${url}`);
    const response = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.5",
        "Cache-Control": "no-cache",
      },
      cache: "no-store",
      redirect: "follow",
    });

    if (!response.ok) {
      console.log(`[WORLD DISCOVER] Failed to fetch: ${response.status}`);
      return NextResponse.json(
        { success: false, error: `Failed to fetch URL: ${response.status}` },
        { status: 400 }
      );
    }

    const html = await response.text();
    console.log(`[WORLD DISCOVER] HTML length: ${html.length} bytes`);
    const $ = cheerio.load(html);
    const baseUrl = urlObj.origin;

    const movies: DiscoveredMovie[] = [];
    const seenUrls = new Set<string>();

    // WorldFree4u structure: posts with titles and links
    // Look for post containers - they use various patterns
    const selectors = [
      // Common WorldFree4u patterns
      "article.post a[href]",
      ".post-item a[href]",
      ".entry a[href]",
      ".post a.entry-title",
      "h2.entry-title a",
      "h3.entry-title a",
      ".blog-posts article a",
      // Tailwind-based patterns
      "a.group[href]",
      "a.cursor-pointer[href]",
      "a.block[href]",
      // Generic post patterns
      ".post h2 a",
      ".post h3 a",
      "article h2 a",
      "article h3 a",
      // Direct links that look like movies
      'a[href*="/dual-audio"]',
      'a[href*="/bollywood"]',
      'a[href*="/hollywood"]',
      'a[href*="/south-hindi"]',
      // Title links
      ".post-title a",
      ".title a",
    ];

    // Try each selector
    for (const selector of selectors) {
      $(selector).each((_, el) => {
        const href = $(el).attr("href") || "";

        if (!href || seenUrls.has(href)) return;
        if (href.startsWith("#") || href.includes("javascript:")) return;

        // Make absolute URL
        let fullUrl = href;
        if (!href.startsWith("http")) {
          fullUrl = href.startsWith("/") ? baseUrl + href : baseUrl + "/" + href;
        }

        // Skip non-movie URLs
        const skipPatterns = [
          /\/category\//i,
          /\/tag\//i,
          /\/page\/\d+/i,
          /\/author\//i,
          /\/search/i,
          /\?s=/i,
          /\/feed/i,
          /\/login/i,
          /\/register/i,
          /\/contact/i,
          /\/about/i,
          /\/privacy/i,
          /\/dmca/i,
          /\/wp-admin/i,
          /\/wp-login/i,
        ];

        let shouldSkip = false;
        for (const pattern of skipPatterns) {
          if (pattern.test(fullUrl)) {
            shouldSkip = true;
            break;
          }
        }
        if (shouldSkip) return;

        // URL should look like a movie page (has slug after domain)
        const urlPath = new URL(fullUrl).pathname;
        if (urlPath.length < 5 || urlPath === "/") return;

        // Extract title from multiple sources
        let title = $(el).find("h2, h3").first().text().trim() ||
                   $(el).attr("title") ||
                   $(el).find("img").attr("alt") ||
                   $(el).text().trim();

        // If no title from link, check parent
        if (!title || title.length < 3) {
          const parent = $(el).closest("article, .post, .entry");
          title = parent.find("h2, h3, .entry-title, .post-title").first().text().trim();
        }

        // Clean title
        title = cleanTitle(title);
        if (!title || title.length < 3) return;

        // Extract year from title or URL
        const yearMatch = (title + " " + fullUrl).match(/\b(19|20)\d{2}\b/);
        const year = yearMatch ? yearMatch[0] : undefined;

        // Get poster if available
        let posterUrl = $(el).find("img").attr("src") ||
                        $(el).find("img").attr("data-src") ||
                        $(el).closest("article, .post").find("img").first().attr("src");
        if (posterUrl && !posterUrl.startsWith("http")) {
          posterUrl = posterUrl.startsWith("/") ? baseUrl + posterUrl : baseUrl + "/" + posterUrl;
        }

        seenUrls.add(href);
        movies.push({ title, url: fullUrl, year, posterUrl });
      });

      if (movies.length >= 50) break;
    }

    // Fallback: scan all links if no movies found
    if (movies.length === 0) {
      console.log("[WORLD DISCOVER] No movies from selectors, scanning all links...");

      $("a[href]").each((_, el) => {
        const href = $(el).attr("href") || "";

        if (!href || seenUrls.has(href)) return;
        if (href.startsWith("#") || href.includes("javascript:")) return;

        let fullUrl = href;
        if (!href.startsWith("http")) {
          fullUrl = href.startsWith("/") ? baseUrl + href : baseUrl + "/" + href;
        }

        // Must be same domain
        try {
          if (new URL(fullUrl).hostname !== urlObj.hostname) return;
        } catch { return; }

        // Skip utility pages
        const urlPath = new URL(fullUrl).pathname.toLowerCase();
        if (urlPath.length < 10) return;
        if (/\/(category|tag|page|author|search|login|register|contact|about|privacy|feed|wp-)/i.test(urlPath)) return;

        // URL should look like a movie (has movie-like slug)
        if (!/[-\/](dual|hindi|dubbed|bollywood|hollywood|south|movie|film|download|720p|1080p|300mb)/i.test(urlPath) &&
            !/\b(19|20)\d{2}\b/.test(urlPath)) {
          return;
        }

        let title = $(el).attr("title") ||
                    $(el).find("img").attr("alt") ||
                    $(el).text().trim();

        title = cleanTitle(title);
        if (!title || title.length < 3) {
          // Use URL slug as title
          const slug = urlPath.split("/").filter(Boolean).pop() || "";
          title = slug.replace(/-/g, " ").slice(0, 100);
        }
        if (!title || title.length < 3) return;

        const yearMatch = (title + " " + fullUrl).match(/\b(19|20)\d{2}\b/);
        const year = yearMatch ? yearMatch[0] : undefined;

        seenUrls.add(href);
        movies.push({ title, url: fullUrl, year });

        if (movies.length >= 100) return false;
      });
    }

    console.log(`[WORLD DISCOVER] Found ${movies.length} movies`);

    return NextResponse.json({
      success: true,
      data: movies,
    });

  } catch (error) {
    console.error("[WORLD DISCOVER] Error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to discover movies" },
      { status: 500 }
    );
  }
}

function cleanTitle(title: string): string {
  if (!title) return "";

  return title
    .replace(/\s*[-–|:]\s*(download|watch|stream|free|online|hd|full movie).*$/gi, "")
    .replace(/\s*[-–|:]\s*\S+\.(com|net|org|io|in|co|site|xyz|top|cc|me|tv|movie|film|ist|trade).*$/gi, "")
    .replace(/worldfree4u[.\s]*(com|net|org|trade|ist)?/gi, "")
    .replace(/\s*(480p|720p|1080p|2160p|4k|hdrip|webrip|bluray|dvdrip|300mb|esub|msubs).*$/gi, "")
    .replace(/\s*\([^)]*\.(com|net|org)[^)]*\)/gi, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 200);
}
