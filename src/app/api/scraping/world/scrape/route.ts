import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import * as cheerio from "cheerio";
import { generateMetaTitle, generateMetaDescription } from "@/lib/utils";

interface ScrapedData {
  title: string;
  description: string;
  posterUrl: string;
  backdropUrl: string;
  downloadLinks: { quality: string; language: string; url: string; source: string }[];
  genres: string[];
  releaseYear: string;
  runtime: string;
  rating: string;
  director: string;
  cast: string[];
  metaTitle?: string;
  metaDescription?: string;
}

// POST /api/scraping/world/scrape - Scrape movie data from WorldFree4u page
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
    console.log(`[WORLD SCRAPE] Fetching: ${url}`);
    const response = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.5",
        "Referer": url,
        "Cache-Control": "no-cache",
      },
      redirect: "follow",
    });

    if (!response.ok) {
      return NextResponse.json(
        { success: false, error: `Failed to fetch URL: ${response.status}` },
        { status: 400 }
      );
    }

    const html = await response.text();
    const $ = cheerio.load(html);
    const baseUrl = urlObj.origin;

    // Extract title
    const rawTitle = extractTitle($);
    const title = cleanTitle(rawTitle, url);

    if (!title || title.length < 2) {
      return NextResponse.json(
        { success: false, error: "Could not extract movie title" },
        { status: 400 }
      );
    }

    // Extract description
    const description = extractDescription($);

    // Extract poster
    const posterUrl = extractPoster($, baseUrl);

    // Extract download links - WorldFree4u specific patterns (async - resolves redirects)
    const downloadLinks = await extractWorldFree4uLinks($, baseUrl);

    console.log(`[WORLD SCRAPE] Found ${downloadLinks.length} download links`);

    // Extract other data
    const releaseYear = extractYear($, title, url);
    const genres = extractGenres($);
    const runtime = extractRuntime($);
    const rating = extractRating($);
    const director = extractDirector($);
    const cast = extractCast($);

    const scrapedData: ScrapedData = {
      title,
      description,
      posterUrl,
      backdropUrl: posterUrl, // Use poster as backdrop fallback
      downloadLinks,
      genres,
      releaseYear,
      runtime,
      rating,
      director,
      cast,
      metaTitle: generateMetaTitle(title, releaseYear || undefined),
      metaDescription: generateMetaDescription(description),
    };

    // ALWAYS try TMDB for better images - this is critical for good posters
    try {
      // Clean title aggressively for TMDB search
      const tmdbSearchTitle = cleanTitleForTMDB(title);
      console.log(`[WORLD SCRAPE] TMDB search with: "${tmdbSearchTitle}" year: ${releaseYear}`);

      const tmdbData = await searchTMDB(tmdbSearchTitle, releaseYear);
      if (tmdbData) {
        // ALWAYS use TMDB poster/backdrop - scraped ones are usually watermarked
        if (tmdbData.posterUrl) {
          scrapedData.posterUrl = tmdbData.posterUrl;
          console.log("[WORLD SCRAPE] Using TMDB poster:", tmdbData.posterUrl);
        }
        if (tmdbData.backdropUrl) {
          scrapedData.backdropUrl = tmdbData.backdropUrl;
        }
        if (tmdbData.rating && parseFloat(tmdbData.rating) > 0) {
          scrapedData.rating = tmdbData.rating;
        }
        if (tmdbData.description) {
          scrapedData.description = tmdbData.description;
        }
        if (tmdbData.genres?.length) {
          scrapedData.genres = tmdbData.genres;
        }
        if (tmdbData.runtime) {
          scrapedData.runtime = tmdbData.runtime;
        }
        // Also update title to clean version
        if (tmdbData.title) {
          scrapedData.title = tmdbData.title;
          scrapedData.metaTitle = generateMetaTitle(tmdbData.title, releaseYear || undefined);
        }
        console.log("[WORLD SCRAPE] TMDB data applied successfully");
      } else {
        console.log("[WORLD SCRAPE] No TMDB data found, keeping scraped poster");
        // Keep the scraped poster even if it's not ideal - better than nothing
      }
    } catch (e) {
      console.log("[WORLD SCRAPE] TMDB lookup failed:", e);
    }

    return NextResponse.json({
      success: true,
      data: scrapedData,
    });

  } catch (error) {
    console.error("[WORLD SCRAPE] Error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to scrape movie" },
      { status: 500 }
    );
  }
}

function extractTitle($: cheerio.CheerioAPI): string {
  // WorldFree4u title patterns
  const selectors = [
    "h1.entry-title",
    "h1.post-title",
    "article h1",
    ".entry-header h1",
    "h1",
    ".post h2",
    "article h2",
    "h2.entry-title",
  ];

  for (const selector of selectors) {
    const text = $(selector).first().text().trim();
    if (text && text.length > 3 && text.length < 300) {
      return text;
    }
  }

  // Fallback to page title
  const pageTitle = $("title").text().trim();
  if (pageTitle) {
    return pageTitle.split(/[-–|]/).shift()?.trim() || pageTitle;
  }

  return "";
}

function cleanTitle(title: string, url: string): string {
  if (!title) return "";

  let cleaned = title
    // Remove website names
    .replace(/worldfree4u[.\s]*(com|net|org|trade|ist)?/gi, "")
    .replace(/\s*[-–|:]\s*(download|watch|stream|free|online|hd|full movie).*$/gi, "")
    .replace(/\s*[-–|:]\s*\S+\.(com|net|org|io|in|co|site|xyz|top|cc|me|tv|movie|film|ist|trade).*$/gi, "")
    // Remove quality info from end
    .replace(/\s*(480p|720p|1080p|2160p|4k|hdrip|webrip|bluray|dvdrip|300mb|esub|msubs|x264|x265|hevc).*$/gi, "")
    // Remove dual audio markers from end
    .replace(/\s*[–-]\s*(dual audio|hindi|dubbed).*$/gi, "")
    // Clean brackets content
    .replace(/\s*\[[^\]]*\]/gi, "")
    // Clean extra spaces
    .replace(/\s+/g, " ")
    .trim();

  // Preserve year in parentheses if present
  const yearMatch = cleaned.match(/\((\d{4})\)/);

  // Remove everything after year in parentheses
  if (yearMatch) {
    const yearIndex = cleaned.indexOf(yearMatch[0]);
    cleaned = cleaned.slice(0, yearIndex + yearMatch[0].length).trim();
  }

  return cleaned.slice(0, 200);
}

function extractDescription($: cheerio.CheerioAPI): string {
  // Look for description in various places
  const selectors = [
    ".entry-content p",
    ".post-content p",
    "article p",
    ".description",
    ".synopsis",
    'meta[name="description"]',
    'meta[property="og:description"]',
  ];

  for (const selector of selectors) {
    if (selector.startsWith("meta")) {
      const content = $(selector).attr("content")?.trim();
      if (content && content.length > 50) {
        return cleanDescription(content);
      }
    } else {
      const paragraphs = $(selector);
      for (let i = 0; i < paragraphs.length && i < 5; i++) {
        const text = $(paragraphs[i]).text().trim();
        // Skip if it's download instructions or too short
        if (text && text.length > 100 &&
            !text.match(/download|click|link|720p|1080p|300mb|dual audio/i)) {
          return cleanDescription(text);
        }
      }
    }
  }

  return "";
}

function cleanDescription(desc: string): string {
  return desc
    .replace(/worldfree4u[.\s]*(com|net|org|trade|ist)?/gi, "")
    .replace(/click.*download/gi, "")
    .replace(/download.*link/gi, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 1000);
}

function extractPoster($: cheerio.CheerioAPI, baseUrl: string): string {
  const selectors = [
    ".entry-content img",
    ".post-content img",
    "article img",
    ".poster img",
    'meta[property="og:image"]',
    ".thumbnail img",
  ];

  // Patterns to skip - these are not real movie posters
  const skipPatterns = [
    "placeholder", "loading", "data:image",
    "screenshot.png", "theme", "logo", "icon", "banner",
    "avatar", "profile", "favicon", "watermark",
    "wp-content/themes", "ads", "advertisement"
  ];

  for (const selector of selectors) {
    if (selector.includes("meta")) {
      const content = $(selector).attr("content");
      if (content && content.includes("http")) {
        // Check if meta image is a bad pattern
        const isSkip = skipPatterns.some(p => content.toLowerCase().includes(p));
        if (!isSkip) return content;
      }
    } else {
      const images = $(selector);
      for (let i = 0; i < images.length; i++) {
        const img = $(images[i]);
        const src = img.attr("src") || img.attr("data-src") || img.attr("data-lazy-src");
        if (src) {
          // Skip bad images
          const isSkip = skipPatterns.some(p => src.toLowerCase().includes(p));
          if (isSkip) continue;

          // Skip very small images (likely icons)
          const width = parseInt(img.attr("width") || "0");
          const height = parseInt(img.attr("height") || "0");
          if ((width > 0 && width < 100) || (height > 0 && height < 100)) continue;

          if (src.startsWith("http")) return src;
          return src.startsWith("/") ? baseUrl + src : baseUrl + "/" + src;
        }
      }
    }
  }

  return "";
}

// Follow redirect links to get actual download URL
async function resolveRedirectUrl(url: string): Promise<string> {
  // Known redirect/shortener domains that need resolution
  const redirectDomains = ["linkos.site", "link.clik.pw", "linksfire.co", "techymedies.com", "shrinkme", "za.gl", "ouo.io", "linksunlock", "epios.site", "epios"];

  const isRedirect = redirectDomains.some(domain => url.includes(domain));
  if (!isRedirect) return url;

  console.log(`[WORLD SCRAPE] Resolving redirect: ${url}`);

  try {
    // First, try to fetch the redirect page
    const response = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      },
      redirect: "manual", // Don't auto-follow redirects
    });

    // Check for redirect in headers
    const location = response.headers.get("location");
    if (location && location.startsWith("http")) {
      console.log(`[WORLD SCRAPE] Redirect header found: ${location}`);
      return location;
    }

    // If no redirect header, parse the page for links
    const html = await response.text();
    const $ = cheerio.load(html);

    // Look for actual download links in the page
    const downloadPatterns = [
      // Direct download links
      'a[href*="gdrive"], a[href*="drive.google"]',
      'a[href*="mega.nz"], a[href*="mega.co"]',
      'a[href*="mediafire"]',
      'a[href*="pixeldrain"]',
      'a[href*="gofile"]',
      'a[href*="streamtape"]',
      'a[href*="doodstream"]',
      'a[href*="mixdrop"]',
      'a[href*="hubcloud"]',
      'a[href*="gdflix"]',
      'a[href*="filepress"]',
      // Generic download button
      'a.download-btn',
      'a.btn-download',
      'a[class*="download"]',
      '#download a',
      '.download-link a',
    ];

    for (const pattern of downloadPatterns) {
      const link = $(pattern).first().attr("href");
      if (link && link.startsWith("http") && !link.includes("linkos") && !link.includes("epios")) {
        console.log(`[WORLD SCRAPE] Found actual link: ${link}`);
        return link;
      }
    }

    // Check for any external links
    const allLinks: string[] = [];
    $("a[href]").each((_, el) => {
      const href = $(el).attr("href");
      if (href && href.startsWith("http") &&
          !href.includes("linkos") &&
          !href.includes("epios") &&
          !href.includes("worldfree4u") &&
          !href.includes("facebook") &&
          !href.includes("twitter") &&
          !href.includes("telegram")) {
        allLinks.push(href);
      }
    });

    // Return first promising link
    const goodHosts = ["gdrive", "drive.google", "mega", "mediafire", "pixeldrain", "gofile", "hubcloud", "gdflix", "filepress"];
    for (const link of allLinks) {
      if (goodHosts.some(host => link.includes(host))) {
        console.log(`[WORLD SCRAPE] Found host link: ${link}`);
        return link;
      }
    }

    // Return original if nothing found
    console.log(`[WORLD SCRAPE] No redirect found, keeping original`);
    return url;

  } catch (e) {
    console.log(`[WORLD SCRAPE] Redirect resolution failed:`, e);
    return url;
  }
}

async function extractWorldFree4uLinks($: cheerio.CheerioAPI, baseUrl: string): Promise<{ quality: string; language: string; url: string; source: string }[]> {
  const links: { quality: string; language: string; url: string; source: string }[] = [];
  const seenUrls = new Set<string>();

  // WorldFree4u specific: <a class="dl" href="https://linkos.site/...">Download Links</a>
  $("a.dl, a.download-link, a[class*='download']").each((_, el) => {
    const href = $(el).attr("href")?.trim();
    if (!href || seenUrls.has(href)) return;
    if (!href.startsWith("http")) return;

    // Skip internal links
    if (href.includes("worldfree4u")) return;

    seenUrls.add(href);
    const text = $(el).text().trim();
    const quality = extractQualityFromText(text) || "HD";
    const language = extractLanguageFromText(text) || "Dual Audio";

    links.push({
      quality,
      language,
      url: href,
      source: "WorldFree4u",
    });
  });

  // Also look for links with download indicators in text
  $("a").each((_, el) => {
    const href = $(el).attr("href")?.trim();
    const text = $(el).text().trim().toLowerCase();

    if (!href || seenUrls.has(href)) return;
    if (!href.startsWith("http")) return;
    if (href.includes("worldfree4u")) return;

    // Check if it's a download link
    const isDownload = text.includes("download") ||
                       text.includes("link") ||
                       text.includes("720p") ||
                       text.includes("1080p") ||
                       text.includes("300mb") ||
                       text.includes("480p") ||
                       $(el).hasClass("dl") ||
                       $(el).hasClass("download");

    // Also check for known download hosts
    const isDownloadHost = /linkos|epios|gdrive|mega|mediafire|pixeldrain|gofile|streamtape|doodstream|mixdrop|uptobox|1fichier|rapidgator|nitroflare|katfile|uploadhaven|turbobit/i.test(href);

    if (isDownload || isDownloadHost) {
      seenUrls.add(href);
      const fullText = $(el).text().trim() + " " + $(el).closest("p, div, td").text();
      const quality = extractQualityFromText(fullText) || "HD";
      const language = extractLanguageFromText(fullText) || "Dual Audio";

      links.push({
        quality,
        language,
        url: href,
        source: "WorldFree4u",
      });
    }
  });

  // Look for links in tables (common in WorldFree4u)
  $("table a, .download-box a, .download-links a").each((_, el) => {
    const href = $(el).attr("href")?.trim();
    if (!href || seenUrls.has(href)) return;
    if (!href.startsWith("http")) return;
    if (href.includes("worldfree4u")) return;

    seenUrls.add(href);
    const rowText = $(el).closest("tr, div").text();
    const quality = extractQualityFromText(rowText) || "HD";
    const language = extractLanguageFromText(rowText) || "Dual Audio";

    links.push({
      quality,
      language,
      url: href,
      source: "WorldFree4u",
    });
  });

  console.log(`[WORLD SCRAPE] Extracted ${links.length} raw links`);

  // Resolve redirect URLs to get actual download links
  const resolvedLinks: { quality: string; language: string; url: string; source: string }[] = [];

  for (const link of links) {
    try {
      const resolvedUrl = await resolveRedirectUrl(link.url);
      resolvedLinks.push({
        ...link,
        url: resolvedUrl,
      });
    } catch (e) {
      // Keep original if resolution fails
      resolvedLinks.push(link);
    }
  }

  console.log(`[WORLD SCRAPE] Resolved ${resolvedLinks.length} links`);
  return resolvedLinks;
}

function extractQualityFromText(text: string): string {
  const qualityPatterns = [
    { pattern: /2160p|4k|uhd/i, quality: "2160p" },
    { pattern: /1080p|full\s*hd|fhd/i, quality: "1080p" },
    { pattern: /720p|hd/i, quality: "720p" },
    { pattern: /480p|sd/i, quality: "480p" },
    { pattern: /300\s*mb/i, quality: "300MB" },
  ];

  for (const { pattern, quality } of qualityPatterns) {
    if (pattern.test(text)) return quality;
  }

  return "";
}

function extractLanguageFromText(text: string): string {
  const langPatterns = [
    { pattern: /dual\s*audio/i, lang: "Dual Audio" },
    { pattern: /hindi\s*dubbed/i, lang: "Hindi Dubbed" },
    { pattern: /english/i, lang: "English" },
    { pattern: /hindi/i, lang: "Hindi" },
  ];

  for (const { pattern, lang } of langPatterns) {
    if (pattern.test(text)) return lang;
  }

  return "";
}

function extractYear($: cheerio.CheerioAPI, title: string, url: string): string {
  // Check title first
  const titleMatch = title.match(/\((\d{4})\)/);
  if (titleMatch) return titleMatch[1];

  // Check URL
  const urlMatch = url.match(/\b(19|20)\d{2}\b/);
  if (urlMatch) return urlMatch[0];

  // Check page content
  const bodyText = $("body").text();
  const contentMatch = bodyText.match(/release[d]?\s*:?\s*(19|20)\d{2}|year\s*:?\s*(19|20)\d{2}/i);
  if (contentMatch) {
    const yearMatch = contentMatch[0].match(/(19|20)\d{2}/);
    if (yearMatch) return yearMatch[0];
  }

  return "";
}

function extractGenres($: cheerio.CheerioAPI): string[] {
  const genres: string[] = [];
  const seenGenres = new Set<string>();

  // Look for genre links
  $('a[href*="/genre/"], a[href*="/category/"], .genre a, .genres a').each((_, el) => {
    const text = $(el).text().trim().toLowerCase();
    if (text && text.length < 30 && !seenGenres.has(text)) {
      // Filter out non-genre categories
      if (!/(download|link|720p|1080p|300mb|dual|audio|hindi|dubbed)/i.test(text)) {
        seenGenres.add(text);
        genres.push(text.charAt(0).toUpperCase() + text.slice(1));
      }
    }
  });

  return genres.slice(0, 5);
}

function extractRuntime($: cheerio.CheerioAPI): string {
  const text = $("body").text();
  const runtimeMatch = text.match(/runtime\s*:?\s*(\d+)\s*(min|hour|hr)/i) ||
                       text.match(/duration\s*:?\s*(\d+)\s*(min|hour|hr)/i) ||
                       text.match(/(\d+)\s*(min|minutes)/i);

  if (runtimeMatch) {
    const value = parseInt(runtimeMatch[1]);
    const unit = runtimeMatch[2].toLowerCase();
    if (unit.includes("hour") || unit.includes("hr")) {
      return `${value * 60}`;
    }
    return value > 0 && value < 500 ? `${value}` : "";
  }

  return "";
}

function extractRating($: cheerio.CheerioAPI): string {
  const text = $("body").text();
  const ratingMatch = text.match(/imdb\s*:?\s*(\d+\.?\d*)/i) ||
                      text.match(/rating\s*:?\s*(\d+\.?\d*)/i);

  if (ratingMatch) {
    const rating = parseFloat(ratingMatch[1]);
    if (rating > 0 && rating <= 10) {
      return rating.toFixed(1);
    }
  }

  return "";
}

function extractDirector($: cheerio.CheerioAPI): string {
  const text = $("body").text();
  const directorMatch = text.match(/director\s*:?\s*([A-Za-z\s]+?)(?:\n|,|$)/i);

  if (directorMatch) {
    const director = directorMatch[1].trim();
    if (director.length > 2 && director.length < 100) {
      return director;
    }
  }

  return "";
}

function extractCast($: cheerio.CheerioAPI): string[] {
  const cast: string[] = [];
  const text = $("body").text();

  const castMatch = text.match(/cast\s*:?\s*([^\n]+)/i) ||
                    text.match(/starring\s*:?\s*([^\n]+)/i) ||
                    text.match(/stars\s*:?\s*([^\n]+)/i);

  if (castMatch) {
    const castText = castMatch[1];
    const names = castText.split(/[,&]/).map(s => s.trim()).filter(s => s.length > 2 && s.length < 50);
    cast.push(...names.slice(0, 10));
  }

  return cast;
}

// Clean title aggressively for TMDB search
function cleanTitleForTMDB(title: string): string {
  return title
    // Remove year in parentheses
    .replace(/\(\d{4}\)/g, "")
    // Remove standalone year
    .replace(/\b(19|20)\d{2}\b/g, "")
    // Remove quality markers
    .replace(/\s*(480p|720p|1080p|2160p|4k|hd|hdtc|hdts|hdcam|hdrip|webrip|bluray|dvdrip|camrip|300mb|400mb|500mb|600mb|700mb|800mb|1gb|2gb)/gi, "")
    // Remove audio/language markers
    .replace(/\s*(dual\s*audio|hindi\s*dubbed|hindi|dubbed|english|tamil|telugu)/gi, "")
    // Remove source markers
    .replace(/\s*(download|movie|film|free|watch|online|stream|full)/gi, "")
    // Remove format markers
    .replace(/\s*(x264|x265|hevc|10bit|aac|esub|msubs|web-dl|webrip|amzn|nf|hmax)/gi, "")
    // Remove special chars but keep spaces
    .replace(/[^\w\s]/g, " ")
    // Clean multiple spaces
    .replace(/\s+/g, " ")
    .trim();
}

// Search TMDB for movie data
async function searchTMDB(title: string, year: string): Promise<{
  title: string;
  posterUrl: string;
  backdropUrl: string;
  description: string;
  rating: string;
  genres: string[];
  runtime: string;
} | null> {
  try {
    const searchUrl = `https://api.themoviedb.org/3/search/movie?query=${encodeURIComponent(title)}${year ? `&year=${year}` : ""}&api_key=${process.env.TMDB_API_KEY}`;

    const searchRes = await fetch(searchUrl);
    const searchData = await searchRes.json();

    if (!searchData.results?.length) return null;

    const movie = searchData.results[0];

    // Get full details
    const detailsUrl = `https://api.themoviedb.org/3/movie/${movie.id}?api_key=${process.env.TMDB_API_KEY}`;
    const detailsRes = await fetch(detailsUrl);
    const details = await detailsRes.json();

    return {
      title: movie.title || "",
      posterUrl: movie.poster_path ? `https://image.tmdb.org/t/p/w500${movie.poster_path}` : "",
      backdropUrl: movie.backdrop_path ? `https://image.tmdb.org/t/p/original${movie.backdrop_path}` : "",
      description: movie.overview || "",
      rating: movie.vote_average?.toFixed(1) || "",
      genres: details.genres?.map((g: { name: string }) => g.name) || [],
      runtime: details.runtime?.toString() || "",
    };

  } catch (e) {
    console.log("[WORLD SCRAPE] TMDB error:", e);
    return null;
  }
}
