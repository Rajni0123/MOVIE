import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import * as cheerio from "cheerio";

interface ScrapedData {
  title: string;
  description: string;
  posterUrl: string;
  backdropUrl: string;
  screenshots: string[];
  downloadLinks: { quality: string; language: string; url: string }[];
  genres: string[];
  releaseYear: string;
  runtime: string;
  rating: string;
  director: string;
  cast: string[];
  keywords: string[];
  trailerUrl?: string;
}

interface TMDBMovieData {
  backdropUrl: string;
  posterUrl: string;
  trailerUrl: string;
  description: string;
  rating: string;
  genres: string[];
  runtime: string;
}

// POST /api/scraping/url - Scrape movie data from URL
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

    // Validate URL
    try {
      new URL(url);
    } catch {
      return NextResponse.json(
        { success: false, error: "Invalid URL format" },
        { status: 400 }
      );
    }

    // Fetch the page with redirect handling and timeout
    let response;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15000); // 15s timeout
    
    try {
      response = await fetch(url, {
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
          "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
          "Accept-Language": "en-US,en;q=0.5",
          "Referer": url,
          "Cache-Control": "no-cache",
        },
        redirect: "follow",
        signal: controller.signal,
      });
    } catch (fetchError: unknown) {
      clearTimeout(timeout);
      console.error("Fetch error:", fetchError);
      const errorMessage = fetchError instanceof Error && fetchError.name === "AbortError" 
        ? "Request timed out (15s)"
        : "Failed to connect to the website";
      return NextResponse.json(
        { success: false, error: errorMessage },
        { status: 400 }
      );
    } finally {
      clearTimeout(timeout);
    }

    if (!response.ok) {
      // Even for non-200 responses, try to get the content in case it's a soft 404
      console.log(`URL returned status ${response.status}, attempting to parse anyway`);
    }

    const html = await response.text();
    const $ = cheerio.load(html);
    
    // Only do homepage check for manual single-URL scraping, not for bulk
    // We'll skip this check if the URL path looks like a movie page
    const urlPath = new URL(url).pathname.toLowerCase();
    const looksLikeMoviePage = urlPath.length > 10 || 
      urlPath.includes("movie") || 
      urlPath.includes("download") || 
      urlPath.includes("film") ||
      urlPath.match(/\d{4}/) !== null || // Contains year
      urlPath.match(/-[a-z]+-/) !== null; // Contains slug-like patterns
    
    // Skip homepage detection for URLs that look like movie pages
    if (!looksLikeMoviePage) {
      const movieLinks = $('a[href*="/movie"], a[href*="/download"], article, .post').length;
      const singleMovieIndicators = $('h1, .movie-title, .entry-title, .post-title').length;
      
      if (movieLinks > 20 && singleMovieIndicators <= 1) {
        return NextResponse.json(
          { success: false, error: "This looks like a homepage or listing page, not a single movie page." },
          { status: 400 }
        );
      }
    }

    // Extract data using common patterns
    const rawTitle = extractTitle($);
    const cleanedTitle = removeWebsiteNames(rawTitle, url);
    const releaseYear = extractReleaseYear($);
    
    // Extract download links from main page
    let downloadLinks = extractDownloadLinks($, url);
    
    // If few or no download links found, look for download page links and scrape them
    if (downloadLinks.length < 3) {
      console.log("Few download links found, looking for download pages...");
      const downloadPageUrls = findDownloadPageUrls($, url);
      
      if (downloadPageUrls.length > 0) {
        console.log(`Found ${downloadPageUrls.length} download page URLs, scraping...`);
        
        // Scrape each download page (limit to 5 pages)
        for (const pageUrl of downloadPageUrls.slice(0, 5)) {
          try {
            const pageLinks = await scrapeDownloadPage(pageUrl);
            if (pageLinks.length > 0) {
              console.log(`Found ${pageLinks.length} links from ${pageUrl}`);
              downloadLinks = [...downloadLinks, ...pageLinks];
            }
          } catch (err) {
            console.log(`Failed to scrape download page: ${pageUrl}`);
          }
        }
        
        // Remove duplicates
        const seenUrls = new Set<string>();
        downloadLinks = downloadLinks.filter(link => {
          if (seenUrls.has(link.url)) return false;
          seenUrls.add(link.url);
          return true;
        });
      }
    }
    
    let scrapedData: ScrapedData = {
      title: cleanedTitle,
      description: cleanDescription(extractDescription($), url),
      posterUrl: extractPosterUrl($, url),
      backdropUrl: extractBackdropUrl($, url),
      screenshots: extractScreenshots($, url),
      downloadLinks: downloadLinks,
      genres: extractGenres($),
      releaseYear: releaseYear,
      runtime: extractRuntime($),
      rating: extractRating($),
      director: extractDirector($),
      cast: extractCast($),
      keywords: generateKeywords($, cleanedTitle),
      trailerUrl: extractTrailerUrl($),
    };
    
    if (scrapedData.trailerUrl) {
      console.log("Trailer found on page:", scrapedData.trailerUrl);
    }

    // ALWAYS try to get data from TMDB for better quality data
    try {
      console.log("Fetching TMDB data for:", cleanedTitle, releaseYear);
      const tmdbData = await searchTMDBForMovie(cleanedTitle, releaseYear);
      if (tmdbData) {
        console.log("TMDB data found:", {
          backdrop: !!tmdbData.backdropUrl,
          poster: !!tmdbData.posterUrl,
          trailer: !!tmdbData.trailerUrl,
          rating: tmdbData.rating,
          genres: tmdbData.genres?.length || 0,
        });
        
        // ALWAYS use TMDB backdrop (better quality)
        if (tmdbData.backdropUrl) {
          scrapedData.backdropUrl = tmdbData.backdropUrl;
          console.log("Using TMDB backdrop");
        }
        // ALWAYS use TMDB poster (much better quality than scraped)
        if (tmdbData.posterUrl) {
          scrapedData.posterUrl = tmdbData.posterUrl;
          console.log("Using TMDB poster:", tmdbData.posterUrl);
        }
        // Always use TMDB trailer if available (usually better)
        if (tmdbData.trailerUrl) {
          scrapedData.trailerUrl = tmdbData.trailerUrl;
          console.log("Using TMDB trailer:", tmdbData.trailerUrl);
        } else {
          console.log("No trailer URL from TMDB");
        }
        // Fill in missing description
        if (!scrapedData.description && tmdbData.description) {
          scrapedData.description = tmdbData.description;
        }
        // ALWAYS prefer TMDB rating (more reliable than scraped)
        if (tmdbData.rating && parseFloat(tmdbData.rating) > 0) {
          scrapedData.rating = tmdbData.rating;
          console.log("Using TMDB rating:", tmdbData.rating);
        }
        // Use TMDB genres if we don't have any
        if (scrapedData.genres.length === 0 && tmdbData.genres && tmdbData.genres.length > 0) {
          scrapedData.genres = tmdbData.genres;
        }
        // Use TMDB runtime if not found
        if (!scrapedData.runtime && tmdbData.runtime) {
          scrapedData.runtime = tmdbData.runtime;
        }
      } else {
        console.log("No TMDB data found for:", cleanedTitle);
      }
    } catch (tmdbError) {
      console.log("TMDB fallback failed:", tmdbError);
      // Continue without TMDB data
    }

    // Final fallback: If no backdrop but has poster, use poster as backdrop
    if (!scrapedData.backdropUrl && scrapedData.posterUrl) {
      scrapedData.backdropUrl = scrapedData.posterUrl;
      console.log("Using poster as backdrop fallback");
    }

    return NextResponse.json({
      success: true,
      data: scrapedData,
    });
  } catch (error) {
    console.error("Scraping error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to scrape URL. The website may be blocking requests." },
      { status: 500 }
    );
  }
}

// Helper functions to extract data
function extractTitle($: cheerio.CheerioAPI): string {
  // Try common title patterns - prioritize specific movie title selectors
  const selectors = [
    // Specific movie title classes
    "h1.entry-title",
    "h1.post-title", 
    "h1.movie-title",
    "h1.single-title",
    "h1.page-title",
    ".entry-title h1",
    ".post-title h1",
    ".movie-title h1",
    ".single-post-title",
    ".movie-name",
    ".film-title",
    // Generic h1 inside article/main content
    "article h1",
    ".content h1",
    ".main-content h1",
    ".post-content h1",
    ".entry-content h1",
    "main h1",
    // Fallback to first h1
    "h1",
    // Meta tags as last resort
    'meta[property="og:title"]',
    "title",
  ];

  for (const selector of selectors) {
    if (selector.startsWith("meta")) {
      const content = $(selector).attr("content");
      if (content && content.length > 2 && content.length < 200) {
        return cleanText(content);
      }
    } else if (selector === "title") {
      const text = $(selector).first().text();
      if (text && text.length > 2 && text.length < 200) {
        return cleanText(text);
      }
    } else {
      const el = $(selector).first();
      // Skip if it's inside header/nav (likely site title)
      if (el.parents("header, nav, .header, .nav, .site-header, .navbar").length > 0) {
        continue;
      }
      const text = el.text();
      if (text && text.length > 2 && text.length < 200) {
        return cleanText(text);
      }
    }
  }

  return "";
}

function extractDescription($: cheerio.CheerioAPI): string {
  // First try specific movie description selectors
  const specificSelectors = [
    ".movie-description",
    ".movie-synopsis",
    ".movie-story",
    ".movie-plot",
    ".synopsis",
    ".overview", 
    ".plot",
    ".story",
    ".storyline",
    ".film-description",
    ".description",
    '[class*="description"]',
    '[class*="synopsis"]',
    '[class*="story"]',
    '[class*="plot"]',
  ];

  for (const selector of specificSelectors) {
    const text = $(selector).first().text();
    if (text && text.length > 50 && text.length < 2000) {
      return cleanText(text);
    }
  }

  // Try meta descriptions
  const metaSelectors = [
    'meta[property="og:description"]',
    'meta[name="description"]',
  ];

  for (const selector of metaSelectors) {
    const content = $(selector).attr("content");
    if (content && content.length > 30) {
      return cleanText(content);
    }
  }

  // Try content area paragraphs
  const contentSelectors = [
    ".entry-content > p",
    ".post-content > p",
    ".content > p",
    ".main-content > p",
    "article > p",
    ".single-content > p",
  ];

  for (const selector of contentSelectors) {
    const paragraphs: string[] = [];
    $(selector).each((i, el) => {
      const text = $(el).text().trim();
      // Skip short paragraphs or ones that look like download info
      if (text.length > 50 && !text.match(/download|click|720p|1080p|480p|mb|gb/i)) {
        paragraphs.push(text);
      }
    });
    
    if (paragraphs.length > 0) {
      return cleanText(paragraphs.slice(0, 2).join(" ").slice(0, 1000));
    }
  }

  return "";
}

function extractPosterUrl($: cheerio.CheerioAPI, baseUrl: string): string {
  // Helper to validate poster URL - skip bad images
  const isValidPosterUrl = (url: string): boolean => {
    if (!url) return false;
    const lowerUrl = url.toLowerCase();
    
    // Skip small/thumbnail patterns
    const badPatterns = [
      "logo", "icon", "avatar", "banner", "ad-", "sponsor",
      "emoji", "smil", "thumb-", "-thumb", "_thumb", "small",
      "mini", "tiny", "badge", "button", "arrow", "social",
      "facebook", "twitter", "instagram", "share", "comment",
      "rating", "star", "like", "play-", "loading", "spinner",
      "-50x", "-75x", "-100x", "-150x", "-200x", // WordPress small sizes
      "x50.", "x75.", "x100.", "x150.", "x200.",
      "w=50", "w=75", "w=100", "w=150", "w=200",
      "resize=50", "resize=75", "resize=100",
    ];
    
    if (badPatterns.some(p => lowerUrl.includes(p))) return false;
    
    // Prefer images with poster-like dimensions in URL
    // Good poster URLs often have larger sizes
    return true;
  };

  // Priority 1: Look for TMDB/IMDb poster URLs (best quality)
  const tmdbImdbSelectors = [
    'img[src*="tmdb.org"]',
    'img[src*="themoviedb.org"]',
    'img[src*="imdb.com"]',
    'img[data-src*="tmdb.org"]',
    'img[data-src*="themoviedb.org"]',
  ];
  
  for (const selector of tmdbImdbSelectors) {
    try {
      const el = $(selector).first();
      const src = el.attr("src") || el.attr("data-src");
      if (src && isImageUrl(src)) {
        return makeAbsoluteUrl(src, baseUrl);
      }
    } catch {
      continue;
    }
  }

  // Priority 2: Meta tags (usually good quality)
  const metaSelectors = [
    'meta[property="og:image"]',
    'meta[name="og:image"]',
    'meta[property="twitter:image"]',
    'meta[name="twitter:image"]',
  ];
  
  for (const selector of metaSelectors) {
    const content = $(selector).attr("content");
    if (content && isImageUrl(content) && isValidPosterUrl(content)) {
      // Check if it's a decent size image (not a small thumb)
      if (!content.includes("-150x") && !content.includes("-200x") && !content.includes("-300x")) {
        return makeAbsoluteUrl(content, baseUrl);
      }
    }
  }

  // Priority 3: Specific poster class selectors
  const posterSelectors = [
    ".poster img",
    ".movie-poster img",
    ".film-poster img",
    ".post-poster img",
    ".entry-poster img",
    '[class*="poster"] img',
  ];

  for (const selector of posterSelectors) {
    try {
      const el = $(selector).first();
      const src = el.attr("src") || el.attr("data-src") || el.attr("data-lazy-src") || el.attr("data-original");
      if (src && isImageUrl(src) && isValidPosterUrl(src)) {
        return makeAbsoluteUrl(src, baseUrl);
      }
    } catch {
      continue;
    }
  }

  // Priority 4: WordPress featured image (but check size)
  const wpSelectors = [
    ".wp-post-image",
    ".attachment-post-thumbnail",
    ".attachment-full",
    ".size-full",
  ];

  for (const selector of wpSelectors) {
    try {
      const el = $(selector).first();
      const src = el.attr("src") || el.attr("data-src") || el.attr("data-lazy-src");
      if (src && isImageUrl(src) && isValidPosterUrl(src)) {
        return makeAbsoluteUrl(src, baseUrl);
      }
    } catch {
      continue;
    }
  }

  // Priority 5: Find best large image
  const allImages: { url: string; width: number; height: number; score: number }[] = [];
  $("img").each((_, el) => {
    const src = $(el).attr("src") || $(el).attr("data-src") || $(el).attr("data-lazy-src");
    if (!src || !isImageUrl(src) || !isValidPosterUrl(src)) return;
    
    const width = parseInt($(el).attr("width") || "0") || 0;
    const height = parseInt($(el).attr("height") || "0") || 0;
    
    // Skip very small images
    if (width > 0 && width < 200) return;
    if (height > 0 && height < 200) return;
    
    // Calculate score (prefer taller images - poster ratio)
    let score = 0;
    if (height > width) score += 10; // Portrait orientation (poster-like)
    if (width >= 300) score += 5;
    if (height >= 400) score += 5;
    
    allImages.push({ url: makeAbsoluteUrl(src, baseUrl), width, height, score });
  });

  // Sort by score and return best
  allImages.sort((a, b) => b.score - a.score);
  if (allImages.length > 0) {
    return allImages[0].url;
  }

  return "";
}

function extractBackdropUrl($: cheerio.CheerioAPI, baseUrl: string): string {
  // Priority 1: Common backdrop/banner selectors
  const backdropSelectors = [
    ".backdrop img",
    ".banner img",
    ".hero-image img",
    ".hero img",
    ".featured-bg",
    ".movie-backdrop img",
    ".film-backdrop img",
    ".background-image img",
    ".bg-image img",
    '[class*="backdrop"] img',
    '[class*="banner"] img',
    '[class*="hero"] img',
    ".cover img",
    ".cover-image img",
    ".header-image img",
  ];

  for (const selector of backdropSelectors) {
    try {
      const el = $(selector).first();
      const src = el.attr("src") || el.attr("data-src") || el.attr("data-lazy-src") || el.attr("data-original");
      if (src && isImageUrl(src)) {
        return makeAbsoluteUrl(src, baseUrl);
      }
    } catch {
      continue;
    }
  }

  // Priority 2: Check for background-image in style attributes
  let foundBackdrop = "";
  $('[style*="background"]').each((_, el) => {
    if (foundBackdrop) return false; // Break loop if found
    const style = $(el).attr("style") || "";
    const match = style.match(/background(?:-image)?:\s*url\(['"]?([^'")\s]+)['"]?\)/i);
    if (match && match[1] && isImageUrl(match[1])) {
      foundBackdrop = makeAbsoluteUrl(match[1], baseUrl);
      return false; // Break loop
    }
  });
  if (foundBackdrop) return foundBackdrop;

  // Priority 3: Look for wide/landscape images (likely backdrops)
  const wideImages: string[] = [];
  $("img").each((_, el) => {
    const src = $(el).attr("src") || $(el).attr("data-src") || $(el).attr("data-lazy-src");
    if (!src || !isImageUrl(src)) return;
    
    const width = parseInt($(el).attr("width") || "0") || 0;
    const height = parseInt($(el).attr("height") || "0") || 0;
    
    // Look for landscape orientation (wider than tall)
    if (width > 0 && height > 0 && width > height * 1.5) {
      wideImages.push(makeAbsoluteUrl(src, baseUrl));
    }
    
    // Also check for large images that might be backdrops
    const lowerSrc = src.toLowerCase();
    if (lowerSrc.includes("backdrop") || lowerSrc.includes("banner") || lowerSrc.includes("cover") || lowerSrc.includes("background")) {
      wideImages.push(makeAbsoluteUrl(src, baseUrl));
    }
  });

  if (wideImages.length > 0) {
    return wideImages[0];
  }

  // Priority 4: Use second largest image as backdrop (first is likely poster)
  const allImages: string[] = [];
  $("img").each((_, el) => {
    const src = $(el).attr("src") || $(el).attr("data-src") || $(el).attr("data-lazy-src");
    if (!src || !isImageUrl(src)) return;
    
    const lowerSrc = src.toLowerCase();
    if (lowerSrc.includes("logo") || lowerSrc.includes("icon") || lowerSrc.includes("avatar")) return;
    if (lowerSrc.includes("ad") || lowerSrc.includes("sponsor")) return;
    
    allImages.push(makeAbsoluteUrl(src, baseUrl));
  });

  // Return second image if available (assuming first is poster)
  if (allImages.length > 1) {
    return allImages[1];
  }

  return "";
}

function extractScreenshots($: cheerio.CheerioAPI, baseUrl: string): string[] {
  const screenshots: string[] = [];
  const seenUrls = new Set<string>();
  
  // Helper to add screenshot
  const addScreenshot = (src: string) => {
    if (!src || !isImageUrl(src)) return;
    const absUrl = makeAbsoluteUrl(src, baseUrl);
    if (seenUrls.has(absUrl)) return;
    
    // Skip small images and common non-screenshot patterns
    const lowerSrc = absUrl.toLowerCase();
    if (lowerSrc.includes("logo") || lowerSrc.includes("icon") || lowerSrc.includes("avatar")) return;
    if (lowerSrc.includes("ad-") || lowerSrc.includes("sponsor") || lowerSrc.includes("banner")) return;
    if (lowerSrc.includes("poster") || lowerSrc.includes("thumb")) return; // Skip poster images
    
    seenUrls.add(absUrl);
    screenshots.push(absUrl);
  };
  
  // Priority selectors for screenshots
  const selectors = [
    ".screenshots img",
    ".screenshot img",
    ".gallery img",
    ".screen-shots img",
    ".movie-screenshots img",
    ".movie-gallery img",
    ".film-screenshots img",
    ".screens img",
    ".movie-screens img",
    '[class*="screenshot"] img',
    '[class*="gallery"] img',
    '[class*="screen"] img',
    ".lightbox img",
    ".fancybox img",
    ".magnific img",
    "a[data-fancybox] img",
    "a[data-lightbox] img",
    ".wp-block-gallery img",
    ".gallery-item img",
  ];

  for (const selector of selectors) {
    try {
      $(selector).each((_, el) => {
        if (screenshots.length >= 15) return false;
        const src = $(el).attr("src") || $(el).attr("data-src") || $(el).attr("data-lazy-src") || $(el).attr("data-original");
        if (src) addScreenshot(src);

        // Also check for larger version in parent link
        const parentHref = $(el).parent("a").attr("href");
        if (parentHref && isImageUrl(parentHref)) {
          addScreenshot(parentHref);
        }
      });
    } catch {
      continue;
    }
    if (screenshots.length >= 10) break;
  }

  // If not enough screenshots, look in content area
  if (screenshots.length < 5) {
    const contentSelectors = [
      ".entry-content img",
      ".post-content img",
      ".content img",
      "article img",
      ".single-content img",
    ];
    
    for (const selector of contentSelectors) {
      try {
        $(selector).each((i, el) => {
          if (screenshots.length >= 15) return false;
          if (i < 2) return; // Skip first 2 images (likely poster/banner)

          const src = $(el).attr("src") || $(el).attr("data-src") || $(el).attr("data-lazy-src");
          if (src) addScreenshot(src);
        });
      } catch {
        continue;
      }
    }
  }

  // If still not enough, look for any landscape images
  if (screenshots.length < 3) {
    $("img").each((_, el) => {
      if (screenshots.length >= 15) return false;
      
      const src = $(el).attr("src") || $(el).attr("data-src");
      if (!src || !isImageUrl(src)) return;
      
      const width = parseInt($(el).attr("width") || "0") || 0;
      const height = parseInt($(el).attr("height") || "0") || 0;
      
      // Screenshots are typically landscape (wider than tall)
      if (width > 0 && height > 0 && width > height && width > 300) {
        addScreenshot(src);
      }
    });
  }

  return screenshots.slice(0, 15);
}

function extractDownloadLinks($: cheerio.CheerioAPI, baseUrl: string): { quality: string; language: string; url: string }[] {
  const links: { quality: string; language: string; url: string }[] = [];
  const seenUrls = new Set<string>();
  
  // Get the source website domain - NEVER add links from this domain
  let sourceDomain = "";
  try {
    sourceDomain = new URL(baseUrl).hostname.toLowerCase();
  } catch {
    sourceDomain = "";
  }
  
  // Helper to check if URL is from source website (should be excluded)
  const isSourceWebsiteUrl = (url: string): boolean => {
    if (!sourceDomain) return false;
    try {
      const urlDomain = new URL(url).hostname.toLowerCase();
      // Check if it's the same domain or subdomain
      return urlDomain === sourceDomain || 
             urlDomain.endsWith("." + sourceDomain) ||
             sourceDomain.endsWith("." + urlDomain);
    } catch {
      return false;
    }
  };
  
  // Helper to add a link
  const addLink = (href: string, text: string, parentText: string) => {
    if (!href) return;
    
    // CRITICAL: Clean the URL first - remove leading/trailing spaces
    let cleanHref = href.trim();
    
    // Check if href contains multiple URLs (space-separated) - take only the actual download link
    if (cleanHref.includes(" http")) {
      // Split by space and find the actual download URL (not the source site)
      const urls = cleanHref.split(/\s+/).filter(u => u.startsWith("http"));
      if (urls.length > 1) {
        // Find the URL that's NOT the base URL domain
        const externalUrl = urls.find(u => !isSourceWebsiteUrl(u));
        cleanHref = externalUrl || urls[urls.length - 1];
      } else if (urls.length === 1) {
        cleanHref = urls[0];
      }
    }
    
    // Also handle case where URL has space at the start
    if (cleanHref.includes(" ")) {
      // Try to extract the http URL part
      const httpMatch = cleanHref.match(/(https?:\/\/[^\s]+)/);
      if (httpMatch) {
        cleanHref = httpMatch[1];
      }
    }
    
    if (!cleanHref || seenUrls.has(cleanHref)) return;
    if (cleanHref.startsWith("#") || cleanHref.startsWith("javascript:")) return;
    
    // CRITICAL: NEVER add source website URLs as download links
    // This prevents adding other movie page URLs from the same site
    if (cleanHref.startsWith("http") && isSourceWebsiteUrl(cleanHref)) {
      return; // Skip - this is from the source website, not a download link
    }
    
    // Also skip relative URLs that would resolve to source website
    if (!cleanHref.startsWith("http")) {
      return; // Skip relative URLs - they're from the source site
    }
    
    const lowerHref = cleanHref.toLowerCase();
    const combinedText = (text + " " + parentText).toLowerCase();
    
    // Skip social/nav links
    const skipPatterns = [
      "facebook.com", "twitter.com", "instagram.com", "youtube.com",
      "telegram.me", "telegram.org", "whatsapp.com", "pinterest.com",
      "#comment", "#respond", "wp-login", "wp-admin", "/feed/",
      "javascript:", "mailto:", "tel:", "/search", "?s=",
    ];
    if (skipPatterns.some(p => lowerHref.includes(p))) return;
    
    seenUrls.add(cleanHref);
    
    // Detect quality
    let quality = "720p";
    if (combinedText.includes("480") || lowerHref.includes("480")) quality = "480p";
    else if (combinedText.includes("1080") || lowerHref.includes("1080")) quality = "1080p";
    else if (combinedText.includes("2160") || combinedText.includes("4k") || lowerHref.includes("2160") || lowerHref.includes("4k")) quality = "4K";
    else if (combinedText.includes("720") || lowerHref.includes("720")) quality = "720p";
    else if (combinedText.includes("hdrip") || combinedText.includes("webrip") || combinedText.includes("bluray")) quality = "720p";

    // Detect language
    let language = "Hindi";
    if (combinedText.includes("english") || combinedText.includes(" eng ") || combinedText.includes("[eng]")) language = "English";
    else if (combinedText.includes("dual") || combinedText.includes("hin-eng") || combinedText.includes("hindi-english")) language = "Dual Audio";
    else if (combinedText.includes("tamil")) language = "Tamil";
    else if (combinedText.includes("telugu")) language = "Telugu";
    else if (combinedText.includes("korean")) language = "Korean";
    else if (combinedText.includes("japanese")) language = "Japanese";
    else if (combinedText.includes("hindi")) language = "Hindi";

    links.push({
      quality,
      language,
      url: makeAbsoluteUrl(cleanHref, baseUrl),
    });
  };
  
  // AGGRESSIVE METHOD 1: Find ALL links with download-related text content
  $("a").each((_, el) => {
    const href = $(el).attr("href") || "";
    const text = $(el).text().trim();
    const title = $(el).attr("title") || "";
    const className = $(el).attr("class") || "";
    const parentClass = $(el).parent().attr("class") || "";
    const parentText = $(el).parent().text().trim();
    const combinedText = (text + " " + title + " " + className + " " + parentClass).toLowerCase();
    
    // Check if text/class indicates download
    const downloadKeywords = [
      "download", "descargar", "telecharger", "480p", "720p", "1080p", "2160p", "4k",
      "hdrip", "webrip", "bluray", "brrip", "dvdrip", "hdtv", "webdl", "web-dl",
      "direct link", "g-drive", "gdrive", "google drive", "mediafire", "mega",
      "fast download", "slow download", "server", "link", "mirror"
    ];
    
    if (downloadKeywords.some(kw => combinedText.includes(kw))) {
      addLink(href, text, parentText);
    }
  });
  
  // AGGRESSIVE METHOD 2: Find links with download-related URLs
  const urlPatterns = [
    "drive.google", "docs.google", "mediafire", "mega.nz", "mega.co",
    "1fichier", "uptobox", "rapidgator", "nitroflare", "uploadrar",
    "dropbox", "onedrive", "gdrive", "hubcloud", "pixeldrain",
    "gofile", "anonfiles", "zippyshare", "clicknupload", "ddownload",
    "katfile", "hexupload", "filepress", "sendcm", "streamtape",
    "upstream", "racaty", "hxfile", "krakenfiles", "bayfiles",
    "letsupload", "mirrorace", "uploadhaven", "tusfiles", "usersdrive",
    "userscloud", "indishare", "dropapk", "gdtot", "apkadmin",
    "download", "dl=", "file=", "get=", ".mkv", ".mp4", ".avi",
    "filecrypt", "oload", "openload", "fembed", "vidcloud", "mixdrop",
    "doodstream", "filemoon", "streamlare", "uqload", "vtube",
    "filelion", "linkbox", "terabox", "wetransfer", "gplinks",
    "shrinkme", "exe.io", "ouo.io", "sharer.pw", "shorte.st",
  ];
  
  $("a").each((_, el) => {
    const href = $(el).attr("href") || "";
    const lowerHref = href.toLowerCase();
    
    if (urlPatterns.some(p => lowerHref.includes(p))) {
      const text = $(el).text().trim();
      const parentText = $(el).parent().text().trim();
      addLink(href, text, parentText);
    }
  });
  
  // AGGRESSIVE METHOD 3: Look inside common download containers
  const containerSelectors = [
    ".download-links", ".download-box", ".download-section", ".download-buttons",
    ".downloadlinks", ".dlink", ".dl-box", ".dl-link", ".download",
    '[class*="download"]', '[id*="download"]', ".entry-content", ".post-content",
    ".content", "article", ".single-content", ".movie-info", ".movie-download",
    "table", ".wp-block-table", ".links-table", "#links", ".links",
  ];
  
  for (const selector of containerSelectors) {
    try {
      $(selector).find("a").each((_, el) => {
        const href = $(el).attr("href") || "";
        if (!href || href === "#" || href.startsWith("javascript:")) return;
        
        const text = $(el).text().trim();
        const parentText = $(el).parent().text().trim();
        
        // Skip very short text (likely icons) and navigation links
        if (text.length < 2 && !href.includes("download")) return;
        
        // Skip internal page links
        const sameDomain = href.startsWith("/") || href.includes(new URL(baseUrl).hostname);
        const internalSkip = ["/tag/", "/category/", "/author/", "/page/", "?p=", "/comments"];
        if (sameDomain && internalSkip.some(s => href.includes(s))) return;
        
        // If it's an external link or has download indicators, add it
        const isExternal = href.startsWith("http") && !href.includes(new URL(baseUrl).hostname);
        const hasDownloadIndicator = (text + parentText).toLowerCase().match(/(download|480|720|1080|link|server|mirror|gdrive|mega|mediafire)/);
        
        if (isExternal || hasDownloadIndicator) {
          addLink(href, text, parentText);
        }
      });
    } catch {
      // Skip invalid selectors
    }
  }
  
  // AGGRESSIVE METHOD 4: Find buttons that look like downloads
  $("button, .btn, [class*='button'], [role='button']").each((_, el) => {
    // Check if button has a data attribute or onclick with URL
    const dataHref = $(el).attr("data-href") || $(el).attr("data-url") || $(el).attr("data-link") || "";
    const onclick = $(el).attr("onclick") || "";
    const text = $(el).text().trim();
    const parentText = $(el).parent().text().trim();
    
    // Extract URL from onclick if present
    const urlMatch = onclick.match(/['"]((https?:\/\/|\/)[^'"]+)['"]/);
    const href = dataHref || (urlMatch ? urlMatch[1] : "");
    
    if (href && (text.toLowerCase().includes("download") || text.match(/\d{3,4}p/))) {
      addLink(href, text, parentText);
    }
  });

  // Sort by quality (480p first, then 720p, then 1080p, then 4K)
  const qualityOrder: Record<string, number> = { "480p": 1, "720p": 2, "1080p": 3, "4K": 4 };
  links.sort((a, b) => (qualityOrder[a.quality] || 2) - (qualityOrder[b.quality] || 2));

  return links.slice(0, 50); // Return up to 50 links
}

function extractGenres($: cheerio.CheerioAPI): string[] {
  const genres: string[] = [];
  const selectors = [
    ".genre a",
    ".genres a",
    ".movie-genre a",
    'a[rel="tag"]',
    ".tags a",
    ".category a",
  ];

  const validGenres = [
    "action", "adventure", "animation", "comedy", "crime", "documentary",
    "drama", "family", "fantasy", "history", "horror", "music", "mystery",
    "romance", "science fiction", "sci-fi", "thriller", "war", "western"
  ];

  for (const selector of selectors) {
    $(selector).each((_, el) => {
      const text = $(el).text().toLowerCase().trim();
      if (validGenres.some(g => text.includes(g)) && genres.length < 5) {
        const capitalizedGenre = text.charAt(0).toUpperCase() + text.slice(1);
        if (!genres.includes(capitalizedGenre)) {
          genres.push(capitalizedGenre);
        }
      }
    });
  }

  return genres;
}

function extractReleaseYear($: cheerio.CheerioAPI): string {
  // Try to find year in various places
  const text = $("body").text();
  const yearMatch = text.match(/\b(19|20)\d{2}\b/);
  
  // Also check specific selectors
  const selectors = [".year", ".release-year", ".movie-year"];
  for (const selector of selectors) {
    const yearText = $(selector).first().text();
    const match = yearText.match(/\b(19|20)\d{2}\b/);
    if (match) return match[0];
  }

  return yearMatch ? yearMatch[0] : "";
}

function extractRuntime($: cheerio.CheerioAPI): string {
  const text = $("body").text();
  const runtimeMatch = text.match(/(\d{1,3})\s*(min|minutes|mins)/i);
  if (runtimeMatch) {
    return runtimeMatch[1];
  }
  return "";
}

// Extract trailer URL from page (YouTube embeds, links, etc.)
function extractTrailerUrl($: cheerio.CheerioAPI): string {
  // Try to find YouTube embeds
  const youtubeSelectors = [
    'iframe[src*="youtube.com"]',
    'iframe[src*="youtu.be"]',
    'iframe[data-src*="youtube.com"]',
    'iframe[data-src*="youtu.be"]',
    'a[href*="youtube.com/watch"]',
    'a[href*="youtu.be/"]',
  ];

  for (const selector of youtubeSelectors) {
    try {
      const el = $(selector).first();
      if (el.length) {
        let url = el.attr("src") || el.attr("data-src") || el.attr("href") || "";
        
        // Extract video ID and convert to standard watch URL
        const videoIdMatch = url.match(/(?:youtube\.com\/(?:embed\/|watch\?v=)|youtu\.be\/)([a-zA-Z0-9_-]{11})/);
        if (videoIdMatch) {
          const trailerUrl = `https://www.youtube.com/watch?v=${videoIdMatch[1]}`;
          console.log("Found trailer from page:", trailerUrl);
          return trailerUrl;
        }
      }
    } catch {
      continue;
    }
  }

  // Try to find trailer links by text
  const trailerLinkSelectors = [
    'a:contains("Trailer")',
    'a:contains("TRAILER")',
    'a:contains("Watch Trailer")',
    '.trailer a',
    '.movie-trailer a',
  ];

  for (const selector of trailerLinkSelectors) {
    try {
      const el = $(selector).first();
      if (el.length) {
        const href = el.attr("href") || "";
        if (href.includes("youtube.com") || href.includes("youtu.be")) {
          const videoIdMatch = href.match(/(?:youtube\.com\/(?:embed\/|watch\?v=)|youtu\.be\/)([a-zA-Z0-9_-]{11})/);
          if (videoIdMatch) {
            const trailerUrl = `https://www.youtube.com/watch?v=${videoIdMatch[1]}`;
            console.log("Found trailer link from page:", trailerUrl);
            return trailerUrl;
          }
        }
      }
    } catch {
      continue;
    }
  }

  return "";
}

function extractRating($: cheerio.CheerioAPI): string {
  const selectors = [".rating", ".imdb-rating", ".movie-rating", ".score"];
  
  for (const selector of selectors) {
    const text = $(selector).first().text();
    const match = text.match(/(\d+\.?\d*)\s*\/?\s*10?/);
    if (match) {
      const rating = parseFloat(match[1]);
      if (rating <= 10) return rating.toString();
    }
  }
  
  return "";
}

function extractDirector($: cheerio.CheerioAPI): string {
  // First try specific class selectors
  const classSelectors = [
    ".director",
    ".movie-director",
    ".film-director",
    ".director-name",
    '[class*="director"]',
  ];

  for (const selector of classSelectors) {
    try {
      const el = $(selector).first();
      const text = el.text().trim();
      if (text && text.length > 2 && text.length < 100) {
        // Clean and validate
        const cleaned = cleanDirectorText(text);
        if (cleaned) return cleaned;
      }
    } catch {
      continue;
    }
  }

  // Try to find "Director:" pattern in content area only (not nav/header/footer)
  const contentSelectors = [".entry-content", ".post-content", ".content", "article", ".movie-info", ".single-info"];
  
  for (const contentSel of contentSelectors) {
    try {
      const content = $(contentSel).first();
      if (content.length === 0) continue;
      
      // Look for Director pattern in text
      const html = content.html() || "";
      const directorMatch = html.match(/Director\s*[:：]\s*<[^>]*>([^<]+)<|Director\s*[:：]\s*([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)/i);
      if (directorMatch) {
        const name = (directorMatch[1] || directorMatch[2] || "").trim();
        if (name && name.length > 2 && name.length < 50 && !name.includes("Home") && !name.includes("Search")) {
          return cleanDirectorText(name);
        }
      }
    } catch {
      continue;
    }
  }

  return "";
}

// Clean director text - remove garbage
function cleanDirectorText(text: string): string {
  if (!text) return "";
  
  // Remove common garbage patterns
  const garbage = [
    /Director/gi,
    /Cast/gi,
    /Shared\d*/gi,
    /Facebook/gi,
    /Twitter/gi,
    /Home/gi,
    /Movies/gi,
    /Search/gi,
    /Genres?/gi,
    /Hdmovies/gi,
    /Action/gi,
    /\d+Hdmovies/gi,
    /Season\s*\d+/gi,
    /Complete/gi,
    /Hindi/gi,
    /\(\d{4}\)/g,
    /[:：]/g,
  ];
  
  let cleaned = text;
  for (const pattern of garbage) {
    cleaned = cleaned.replace(pattern, " ");
  }
  
  // Clean up spaces
  cleaned = cleaned.replace(/\s+/g, " ").trim();
  
  // Validate - should be a proper name (letters, spaces, maybe periods)
  if (cleaned.length < 3 || cleaned.length > 50) return "";
  if (!/^[A-Za-z\s.'-]+$/.test(cleaned)) return "";
  if (cleaned.split(" ").length > 5) return ""; // Too many words
  
  return cleaned;
}

function extractCast($: cheerio.CheerioAPI): string[] {
  const cast: string[] = [];
  const selectors = [".cast a", ".actors a", ".starring a", ".movie-cast a"];

  for (const selector of selectors) {
    $(selector).each((_, el) => {
      const name = $(el).text().trim();
      if (name && name.length > 2 && name.length < 50 && cast.length < 10) {
        if (!cast.includes(name)) {
          cast.push(name);
        }
      }
    });
    if (cast.length >= 5) break;
  }

  return cast;
}

function generateKeywords($: cheerio.CheerioAPI, title: string): string[] {
  const keywords: string[] = [];
  
  if (title) {
    keywords.push(
      `${title} download`,
      `${title} full movie`,
      `${title} 480p`,
      `${title} 720p`,
      `${title} 1080p`,
      `${title} Hindi`,
      `${title} English`,
      `download ${title}`,
      `${title} free download`,
    );
  }

  // Extract meta keywords if available
  const metaKeywords = $('meta[name="keywords"]').attr("content");
  if (metaKeywords) {
    const moreKeywords = metaKeywords.split(",").map(k => k.trim()).filter(k => k.length > 2);
    keywords.push(...moreKeywords.slice(0, 10));
  }

  return keywords.slice(0, 20);
}

// Utility functions
function cleanText(text: string): string {
  return text.replace(/\s+/g, " ").trim();
}

// Remove website names and common patterns from text
function removeWebsiteNames(text: string, sourceUrl: string): string {
  if (!text) return text;
  
  // Extract domain name from source URL
  let domainName = "";
  try {
    const urlObj = new URL(sourceUrl);
    domainName = urlObj.hostname.replace("www.", "").split(".")[0];
  } catch {}

  // Common website name patterns to remove
  const patternsToRemove = [
    // Domain-based patterns
    new RegExp(`\\s*[-–|:]\\s*${domainName}.*$`, "gi"),
    new RegExp(`^${domainName}\\s*[-–|:]\\s*`, "gi"),
    new RegExp(`\\(${domainName}[^)]*\\)`, "gi"),
    new RegExp(`\\[${domainName}[^\\]]*\\]`, "gi"),
    
    // Common suffixes
    /\s*[-–|:]\s*(download|watch|stream|free|online|hd|full movie).*$/gi,
    /\s*[-–|:]\s*\S+\.(com|net|org|io|in|co|site|xyz|top|cc|me|tv|movie|film).*$/gi,
    
    // Common prefixes
    /^(download|watch|stream|free|hd)\s*[-–|:]\s*/gi,
    
    // Website names in brackets
    /\s*\([^)]*\.(com|net|org|io|in|co|site|xyz|top|cc|me|tv)[^)]*\)/gi,
    /\s*\[[^\]]*\.(com|net|org|io|in|co|site|xyz|top|cc|me|tv)[^\]]*\]/gi,
    
    // Common movie site names
    /\s*[-–|:]\s*(filmyzilla|movierulz|tamilrockers|filmywap|filmyhit|bolly4u|worldfree4u|khatrimaza|9xmovies|downloadhub|moviesbaba|filmypur|hdmoviespoint|moviesflix|cinemavilla|moviesmaza|isaimini|tamilyogi|moviesda|katmoviehd|extramovies|ssrmovies|themoviesflix|vegamovies|1337x|yts|rarbg|torrent|piratebay).*$/gi,
    
    // Quality tags at end
    /\s*(480p|720p|1080p|2160p|4k|hdrip|webrip|bluray|dvdrip|hdcam|camrip|hdtc|hd|full hd)\s*$/gi,
    
    // Language tags at end
    /\s*(hindi|english|tamil|telugu|dubbed|dual audio|multi audio)\s*$/gi,
  ];

  let cleaned = text;
  for (const pattern of patternsToRemove) {
    cleaned = cleaned.replace(pattern, "");
  }

  // Fix duplicate years - keep only the first year in parentheses
  // Handle patterns like "(2025)(2011)", "(2025) (2011)", "(2025)2011"
  cleaned = fixDuplicateYears(cleaned);

  // Clean up extra spaces and dashes
  cleaned = cleaned
    .replace(/\s*[-–|:]\s*$/, "")
    .replace(/^\s*[-–|:]\s*/, "")
    .replace(/\s+/g, " ")
    .trim();

  return cleaned;
}

// Fix duplicate years in title
function fixDuplicateYears(text: string): string {
  if (!text) return text;
  
  // Find all years in parentheses
  const yearsInParens = text.match(/\(\d{4}\)/g) || [];
  
  // If multiple years in parentheses, keep only the first one
  if (yearsInParens.length > 1) {
    console.log("Fixing duplicate years in:", text);
    let firstYearKept = false;
    let cleaned = text.replace(/\s*\(\d{4}\)/g, (match) => {
      if (!firstYearKept) {
        firstYearKept = true;
        return match;
      }
      return ""; // Remove subsequent years
    });
    cleaned = cleaned.replace(/\s+/g, " ").trim();
    console.log("Fixed to:", cleaned);
    return cleaned;
  }
  
  // Handle year in parentheses followed by standalone year: "(2025) 2011" or "(2025)2011"
  let cleaned = text.replace(/(\(\d{4}\))\s*\d{4}(?!\d)/g, "$1");
  
  // Handle standalone year followed by year in parentheses: "2025 (2011)" -> "(2011)"
  cleaned = cleaned.replace(/\b\d{4}\s+(\(\d{4}\))/g, "$1");
  
  // Remove standalone years at the end if there's already a year in parentheses
  if (cleaned.match(/\(\d{4}\)/)) {
    cleaned = cleaned.replace(/\s+\d{4}\s*$/g, "");
  }
  
  // Clean up any resulting double spaces
  cleaned = cleaned.replace(/\s+/g, " ").trim();
  
  return cleaned;
  
  return cleaned;
}

// Clean description - remove website promotions
function cleanDescription(text: string, sourceUrl: string): string {
  if (!text) return text;
  
  let domainName = "";
  try {
    const urlObj = new URL(sourceUrl);
    domainName = urlObj.hostname.replace("www.", "").split(".")[0].toLowerCase();
  } catch {}

  // Check if the entire description is just website promotional text
  const lowerText = text.toLowerCase();
  const promoKeywords = [
    "watch online", "download free", "free download", "movies free",
    "online free", "latest movies", "free movies", "hd movies",
    "bollywood movies", "hollywood movies", "tamil movies", "telugu movies",
    "watch online movie", "download movie", "movies online"
  ];
  
  // If description contains website name + multiple promo keywords, it's just promotional
  const hasWebsiteName = domainName && lowerText.includes(domainName);
  const promoCount = promoKeywords.filter(kw => lowerText.includes(kw)).length;
  
  // If it's mostly promotional text (website name + 3+ promo keywords), return empty
  if (hasWebsiteName && promoCount >= 2) {
    console.log("Description is promotional text, clearing it");
    return "";
  }
  
  // Check for pipe-separated promotional text pattern
  if (text.includes("|") && promoCount >= 2) {
    console.log("Description is pipe-separated promotional text, clearing it");
    return "";
  }

  // Patterns to remove from description
  const patternsToRemove = [
    // Website name mentions (case insensitive)
    domainName ? new RegExp(`${domainName}\\s*[-–—:]?\\s*`, "gi") : null,
    domainName ? new RegExp(`${domainName}[^|.]*[|.]`, "gi") : null,
    
    // Full promotional sentences with pipe separators
    /[^|]*watch online[^|]*\|/gi,
    /[^|]*download[^|]*free[^|]*\|/gi,
    /[^|]*movies free[^|]*\|/gi,
    /[^|]*online free[^|]*\|/gi,
    /\|[^|]*movies[^|]*\|/gi,
    
    // Website mentions
    new RegExp(`(visit|check out|download from|available on|watch on)\\s+\\S+\\.(com|net|org|io|in|osaka)`, "gi"),
    
    // Promotional text
    /download\s+(now|here|free|from)\s+[^.]+\./gi,
    /click\s+(here|below)\s+[^.]+\./gi,
    /join\s+(our|the)\s+(telegram|channel|group)[^.]+\./gi,
    /(for more|more movies|latest movies)[^.]+\.(com|net|org|io)[^.]*/gi,
    
    // Common promotional phrases
    /watch online movie and download/gi,
    /movies online free download/gi,
    /latest bollywood movies/gi,
    /bollywood movies free/gi,
    /hollywood movies free/gi,
    /tamil hd movies/gi,
    /telugu hd movies/gi,
    
    // Links in text
    /https?:\/\/[^\s]+/gi,
    /www\.[^\s]+/gi,
    
    // Common footer text
    /\s*(disclaimer|copyright|all rights reserved)[^.]*\.?/gi,
    
    // Orphan pipes
    /^\s*\|\s*/g,
    /\s*\|\s*$/g,
    /\|\s*\|/g,
  ].filter(Boolean) as RegExp[];

  let cleaned = text;
  for (const pattern of patternsToRemove) {
    cleaned = cleaned.replace(pattern, "");
  }

  // Remove multiple periods and pipes
  cleaned = cleaned
    .replace(/\.{2,}/g, ".")
    .replace(/\|{2,}/g, "|")
    .replace(/^\s*\|\s*/, "")
    .replace(/\s*\|\s*$/, "")
    .replace(/\s+/g, " ")
    .trim();
  
  // If what's left is very short or just punctuation, return empty
  if (cleaned.length < 20 || /^[\s|.,;:-]*$/.test(cleaned)) {
    return "";
  }

  return cleaned;
}

function makeAbsoluteUrl(url: string, baseUrl: string): string {
  try {
    // Clean the URL first
    let cleanUrl = url.trim();
    
    // If URL contains spaces with multiple http URLs, extract the correct one
    if (cleanUrl.includes(" http")) {
      const baseDomain = new URL(baseUrl).hostname;
      const urls = cleanUrl.split(/\s+/).filter(u => u.startsWith("http"));
      if (urls.length > 1) {
        // Prefer external URL (not the base domain)
        const externalUrl = urls.find(u => {
          try {
            return new URL(u).hostname !== baseDomain;
          } catch {
            return false;
          }
        });
        cleanUrl = externalUrl || urls[urls.length - 1];
      } else if (urls.length === 1) {
        cleanUrl = urls[0];
      }
    }
    
    // Extract http URL if there's garbage around it
    if (cleanUrl.includes(" ")) {
      const httpMatch = cleanUrl.match(/(https?:\/\/[^\s]+)/);
      if (httpMatch) {
        cleanUrl = httpMatch[1];
      }
    }
    
    if (cleanUrl.startsWith("//")) {
      return "https:" + cleanUrl;
    }
    if (cleanUrl.startsWith("/")) {
      const base = new URL(baseUrl);
      return base.origin + cleanUrl;
    }
    if (!cleanUrl.startsWith("http")) {
      const base = new URL(baseUrl);
      return base.origin + "/" + cleanUrl;
    }
    return cleanUrl;
  } catch {
    return url.trim();
  }
}

function isImageUrl(url: string): boolean {
  const imageExtensions = [".jpg", ".jpeg", ".png", ".webp", ".gif"];
  const lowerUrl = url.toLowerCase();
  return imageExtensions.some(ext => lowerUrl.includes(ext));
}

function isDownloadUrl(url: string): boolean {
  if (!url || url.startsWith("#") || url.startsWith("javascript:") || url.startsWith("mailto:")) {
    return false;
  }
  
  // Skip social/tracking links
  const skipPatterns = [
    "facebook.com", "twitter.com", "instagram.com", "youtube.com/watch",
    "telegram.me", "telegram.org", "whatsapp.com", "pinterest.com", "reddit.com",
    "#comment", "#respond", "wp-login", "wp-admin",
    "/tag/", "/category/", "/author/", "?s=", "/feed/",
  ];
  
  const lowerUrl = url.toLowerCase();
  
  if (skipPatterns.some(pattern => lowerUrl.includes(pattern))) {
    return false;
  }
  
  // Very permissive - accept most external links and download indicators
  const downloadIndicators = [
    "drive.google", "docs.google", "mediafire", "mega.nz", "mega.co",
    "1fichier", "uptobox", "rapidgator", "nitroflare", "uploadrar",
    "dropbox", "onedrive", "gdrive", "hubcloud", "pixeldrain",
    "gofile", "anonfiles", "zippyshare", "clicknupload", "ddownload",
    "katfile", "hexupload", "filepress", "sendcm", "streamtape",
    "upstream", "racaty", "hxfile", "files.fm", "krakenfiles",
    "bayfiles", "letsupload", "mirrorace", "mirrored", "uploadhaven",
    "tusfiles", "usersdrive", "userscloud", "userupload",
    "indishare", "dropapk", "download", "gdtot", "apkadmin",
    "sharer.pw", "gplink", "shrinkme", "exe.io", "ouo.io",
    ".mkv", ".mp4", ".avi", ".mov", ".wmv", ".webm",
    "filecrypt", "oload", "openload", "fembed", "vidcloud", "mixdrop",
    "doodstream", "filemoon", "streamlare", "uqload", "vtube",
    "filelion", "linkbox", "terabox", "wetransfer", "480p", "720p",
    "1080p", "2160p", "4k", "dl=", "file=", "get=", "link=", "server",
  ];
  
  // Accept if URL has any download indicator
  if (downloadIndicators.some(ind => lowerUrl.includes(ind))) {
    return true;
  }
  
  // Accept external links (different domain)
  if (url.startsWith("http")) {
    return true; // Be very permissive for external links
  }
  
  return false;
}

// Search TMDB for movie data (backdrop, trailer, etc.)
async function searchTMDBForMovie(title: string, year?: string): Promise<TMDBMovieData | null> {
  // Try multiple ways to get API key
  const TMDB_API_KEY = process.env.TMDB_API_KEY || "8a8538af2a855e77e8c4a70a48a6447a";
  
  console.log("=== TMDB SEARCH START ===");
  console.log("Title:", title);
  console.log("Year:", year);
  console.log("API Key available:", !!TMDB_API_KEY, "Length:", TMDB_API_KEY?.length);
  
  if (!TMDB_API_KEY || TMDB_API_KEY === "your_tmdb_api_key_here") {
    console.log("TMDB API key not configured, skipping TMDB lookup");
    return null;
  }

  try {
    // Clean the title for search
    let cleanTitle = title
      .replace(/\(\d{4}\)/g, "") // Remove year in parentheses
      .replace(/\s*(480p|720p|1080p|4k|hdrip|webrip|bluray).*$/gi, "")
      .replace(/\s*(hindi|english|dual audio|dubbed).*$/gi, "")
      .replace(/\s*season\s*\d+.*$/gi, "") // Remove "Season X"
      .replace(/\s*s\d+.*$/gi, "") // Remove "S01" etc
      .replace(/\s*complete.*$/gi, "")
      .trim();
    
    console.log("Clean title for TMDB search:", cleanTitle);

    // Check if it's a TV series
    const isTVSeries = title.toLowerCase().includes("season") || 
                       title.toLowerCase().includes("series") ||
                       title.toLowerCase().includes("episode") ||
                       /\bs\d+\b/i.test(title);

    let movieData = null;
    let movieId = null;
    let isTV = false;

    // Try movie search first (unless clearly a TV series)
    if (!isTVSeries) {
      const searchUrl = new URL("https://api.themoviedb.org/3/search/movie");
      searchUrl.searchParams.set("api_key", TMDB_API_KEY);
      searchUrl.searchParams.set("query", cleanTitle);
      searchUrl.searchParams.set("language", "en-US");
      if (year) {
        searchUrl.searchParams.set("year", year);
      }

      console.log("TMDB Movie Search URL:", searchUrl.toString().replace(TMDB_API_KEY, "***"));
      
      try {
        const searchRes = await fetch(searchUrl.toString());
        console.log("TMDB Movie Search Response Status:", searchRes.status);
        
        if (searchRes.ok) {
          const searchData = await searchRes.json();
          console.log("TMDB Movie Search Results:", searchData.results?.length || 0);
          
          if (searchData.results && searchData.results.length > 0) {
            movieData = searchData.results[0];
            movieId = movieData.id;
            console.log("TMDB Movie Found:", movieData.title, "ID:", movieId);
          }
        } else {
          const errorText = await searchRes.text();
          console.log("TMDB Movie Search Error:", errorText);
        }
      } catch (fetchError) {
        console.log("TMDB Movie Search Fetch Error:", fetchError);
      }
    } else {
      console.log("Skipping movie search - detected as TV series");
    }

    // If no movie found or is TV series, try TV search
    if (!movieData) {
      console.log("No movie found, trying TV search...");
      const tvSearchUrl = new URL("https://api.themoviedb.org/3/search/tv");
      tvSearchUrl.searchParams.set("api_key", TMDB_API_KEY);
      tvSearchUrl.searchParams.set("query", cleanTitle);
      tvSearchUrl.searchParams.set("language", "en-US");
      if (year) {
        tvSearchUrl.searchParams.set("first_air_date_year", year);
      }

      try {
        const tvSearchRes = await fetch(tvSearchUrl.toString());
        console.log("TMDB TV Search Response Status:", tvSearchRes.status);
        
        if (tvSearchRes.ok) {
          const tvSearchData = await tvSearchRes.json();
          console.log("TMDB TV Search Results:", tvSearchData.results?.length || 0);
          
          if (tvSearchData.results && tvSearchData.results.length > 0) {
            movieData = tvSearchData.results[0];
            movieId = movieData.id;
            isTV = true;
            console.log("Found as TV series:", movieData.name, "ID:", movieId);
          }
        }
      } catch (tvFetchError) {
        console.log("TMDB TV Search Fetch Error:", tvFetchError);
      }
    }

    // If still no results, try without year
    if (!movieData && year) {
      // Try movie without year
      const searchUrl = new URL("https://api.themoviedb.org/3/search/movie");
      searchUrl.searchParams.set("api_key", TMDB_API_KEY);
      searchUrl.searchParams.set("query", cleanTitle);
      searchUrl.searchParams.set("language", "en-US");

      const searchRes = await fetch(searchUrl.toString());
      if (searchRes.ok) {
        const searchData = await searchRes.json();
        if (searchData.results && searchData.results.length > 0) {
          movieData = searchData.results[0];
          movieId = movieData.id;
        }
      }
      
      // Try TV without year if still no results
      if (!movieData) {
        const tvSearchUrl = new URL("https://api.themoviedb.org/3/search/tv");
        tvSearchUrl.searchParams.set("api_key", TMDB_API_KEY);
        tvSearchUrl.searchParams.set("query", cleanTitle);
        tvSearchUrl.searchParams.set("language", "en-US");

        const tvSearchRes = await fetch(tvSearchUrl.toString());
        if (tvSearchRes.ok) {
          const tvSearchData = await tvSearchRes.json();
          if (tvSearchData.results && tvSearchData.results.length > 0) {
            movieData = tvSearchData.results[0];
            movieId = tvSearchData.results[0].id;
            isTV = true;
          }
        }
      }
    }

    if (!movieData || !movieId) {
      console.log("No TMDB results for:", cleanTitle);
      return null;
    }
    
    console.log(`TMDB found: ${isTV ? 'TV' : 'Movie'} - ${movieData.title || movieData.name}`);

    // Get details with videos (different endpoint for TV)
    const detailsUrl = isTV 
      ? `https://api.themoviedb.org/3/tv/${movieId}?api_key=${TMDB_API_KEY}&append_to_response=videos`
      : `https://api.themoviedb.org/3/movie/${movieId}?api_key=${TMDB_API_KEY}&append_to_response=videos`;
    
    console.log("Fetching TMDB details for ID:", movieId, "Type:", isTV ? "TV" : "Movie");
    
    const detailsRes = await fetch(detailsUrl);
    console.log("TMDB Details Response Status:", detailsRes.status);
    
    if (!detailsRes.ok) {
      console.log("TMDB details fetch failed:", detailsRes.status);
      const errorText = await detailsRes.text();
      console.log("TMDB Details Error:", errorText);
      // Fall back to basic data from search results
      return {
        backdropUrl: movieData.backdrop_path 
          ? `https://image.tmdb.org/t/p/original${movieData.backdrop_path}`
          : "",
        posterUrl: movieData.poster_path
          ? `https://image.tmdb.org/t/p/w500${movieData.poster_path}`
          : "",
        trailerUrl: "",
        description: movieData.overview || "",
        rating: movieData.vote_average ? movieData.vote_average.toFixed(1) : "",
        genres: [],
        runtime: "",
      };
    }

    const details = await detailsRes.json();

    // Get trailer URL - try multiple types
    let trailerUrl = "";
    if (details.videos && details.videos.results && details.videos.results.length > 0) {
      console.log("TMDB videos found:", details.videos.results.length);
      
      // Priority order: Trailer > Teaser > Clip > Featurette > any video
      const videoTypes = ["Trailer", "Teaser", "Clip", "Featurette"];
      
      for (const videoType of videoTypes) {
        const video = details.videos.results.find(
          (v: { type: string; site: string; key: string }) => 
            v.type === videoType && v.site === "YouTube" && v.key
        );
        if (video) {
          trailerUrl = `https://www.youtube.com/watch?v=${video.key}`;
          console.log(`TMDB trailer found (${videoType}):`, trailerUrl);
          break;
        }
      }
      
      // If still no trailer, try any YouTube video
      if (!trailerUrl) {
        const anyVideo = details.videos.results.find(
          (v: { site: string; key: string }) => v.site === "YouTube" && v.key
        );
        if (anyVideo) {
          trailerUrl = `https://www.youtube.com/watch?v=${anyVideo.key}`;
          console.log("TMDB trailer (any video):", trailerUrl);
        }
      }
    } else {
      console.log("No TMDB videos found for this title");
    }

    // Build backdrop URL
    const backdropUrl = details.backdrop_path 
      ? `https://image.tmdb.org/t/p/original${details.backdrop_path}`
      : "";

    // Build poster URL
    const posterUrl = details.poster_path
      ? `https://image.tmdb.org/t/p/w500${details.poster_path}`
      : "";

    // Get genres
    const genres = details.genres
      ? details.genres.map((g: { name: string }) => g.name)
      : [];

    // Get runtime (different for TV shows)
    let runtime = "";
    if (details.runtime) {
      runtime = details.runtime.toString();
    } else if (details.episode_run_time && details.episode_run_time.length > 0) {
      runtime = details.episode_run_time[0].toString();
    }

    // Get rating
    const rating = details.vote_average ? details.vote_average.toFixed(1) : "";
    
    console.log("=== TMDB FINAL RESULT ===");
    console.log("Rating:", rating);
    console.log("Trailer:", trailerUrl);
    console.log("Backdrop:", backdropUrl ? "Yes" : "No");
    console.log("Poster:", posterUrl ? "Yes" : "No");
    console.log("Genres:", genres.length);
    console.log("=========================");

    return {
      backdropUrl,
      posterUrl,
      trailerUrl,
      description: details.overview || "",
      rating,
      genres,
      runtime,
    };
  } catch (error) {
    console.error("TMDB search error:", error);
    return null;
  }
}

// Find download page URLs on the main movie page
function findDownloadPageUrls($: cheerio.CheerioAPI, baseUrl: string): string[] {
  const downloadPageUrls: string[] = [];
  const seenUrls = new Set<string>();
  const baseUrlObj = new URL(baseUrl);
  const domain = baseUrlObj.hostname;

  // Selectors for download page links
  const downloadPageSelectors = [
    // Common download button/link patterns
    'a:contains("Download")',
    'a:contains("DOWNLOAD")',
    'a:contains("Click to Download")',
    'a:contains("Download Now")',
    'a:contains("Download Links")',
    'a:contains("Get Download")',
    'a:contains("Direct Download")',
    'a:contains("Download Page")',
    'a:contains("Go to Download")',
    'a:contains("Download Here")',
    'a:contains("Click Here")',
    
    // Hindi patterns
    'a:contains("डाउनलोड")',
    'a:contains("यहाँ क्लिक करें")',
    
    // Button classes
    '.download-btn',
    '.download-button',
    '.btn-download',
    '[class*="download-link"]',
    '[class*="download-btn"]',
    '[class*="download-button"]',
    '[id*="download"]',
    
    // Common link patterns
    'a[href*="/download/"]',
    'a[href*="/downloads/"]',
    'a[href*="/dl/"]',
    'a[href*="/link/"]',
    'a[href*="/links/"]',
    'a[href*="/get/"]',
    'a[href*="download="]',
    'a[href*="/go/"]',
    'a[href*="/redirect/"]',
    'a[href*="/out/"]',
    
    // Table links (often used for download pages)
    'table a[href*="download"]',
    '.entry-content a[href*="download"]',
    '.post-content a[href*="download"]',
  ];

  for (const selector of downloadPageSelectors) {
    try {
      $(selector).each((_, el) => {
        const href = $(el).attr("href");
        if (!href || seenUrls.has(href)) return;
        if (href.startsWith("#") || href.startsWith("javascript:")) return;
        
        // Make absolute URL
        let fullUrl = href;
        if (!href.startsWith("http")) {
          fullUrl = href.startsWith("/") ? baseUrlObj.origin + href : baseUrlObj.origin + "/" + href;
        }
        
        // Check if same domain (internal link to download page)
        try {
          const linkDomain = new URL(fullUrl).hostname;
          // Accept same domain or known short URL services
          if (linkDomain !== domain && 
              !linkDomain.includes("bit.ly") && 
              !linkDomain.includes("tinyurl") &&
              !linkDomain.includes("goo.gl") &&
              !linkDomain.includes("shorturl")) {
            // Skip if it's a direct file host link (not a download page)
            const fileHosts = ["drive.google", "mediafire", "mega.nz", "dropbox", "pixeldrain"];
            if (fileHosts.some(h => linkDomain.includes(h))) return;
          }
        } catch {
          return;
        }
        
        // Skip social/navigation links and other movie pages
        const skipPatterns = [
          "facebook.com", "twitter.com", "instagram.com", "telegram",
          "whatsapp", "#comment", "wp-login", "/tag/", "/category/",
          "/author/", "?s=", "/search", "/page/", "/genre/", "/year/",
          "/movies/", "/series/", "/tv-shows/", "/web-series/",
          "imdb.com", "themoviedb.org", "rotten", "youtube.com",
        ];
        if (skipPatterns.some(p => fullUrl.toLowerCase().includes(p))) return;
        
        // Check if URL looks like another movie page (not a download page)
        // Movie pages typically have movie names in the URL, download pages have "download", "link", etc.
        const currentSlug = baseUrlObj.pathname.split("/").filter(Boolean).pop() || "";
        const linkPath = new URL(fullUrl).pathname.toLowerCase();
        
        // Skip if it looks like a different movie page
        if (linkPath !== baseUrlObj.pathname.toLowerCase()) {
          // If the link doesn't contain download-related keywords, skip it
          const downloadKeywords = ["download", "link", "dl", "get", "go", "redirect", "out", "file"];
          const hasDownloadKeyword = downloadKeywords.some(kw => linkPath.includes(kw));
          
          // If no download keyword and looks like a movie page, skip
          if (!hasDownloadKeyword) {
            // Check for movie-like patterns (year, title, etc.)
            if (linkPath.match(/\d{4}/) && !linkPath.includes(currentSlug.slice(0, 10))) {
              return; // Likely another movie page
            }
          }
        }
        
        seenUrls.add(href);
        downloadPageUrls.push(fullUrl);
      });
    } catch {
      continue;
    }
  }

  return downloadPageUrls.slice(0, 3); // Limit to 3 download pages to avoid other movie pages
}

// Scrape download links from a download page
async function scrapeDownloadPage(pageUrl: string): Promise<{ quality: string; language: string; url: string }[]> {
  const links: { quality: string; language: string; url: string }[] = [];
  
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000); // 10s timeout
    
    const response = await fetch(pageUrl, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.5",
        "Referer": pageUrl,
      },
      redirect: "follow",
      signal: controller.signal,
    });
    
    clearTimeout(timeout);
    
    if (!response.ok) {
      console.log(`Download page returned ${response.status}`);
      return links;
    }
    
    const html = await response.text();
    const $ = cheerio.load(html);
    const baseUrl = new URL(pageUrl).origin;
    const sourceDomain = new URL(pageUrl).hostname.toLowerCase();
    
    // Use the same extraction logic as main page
    const seenUrls = new Set<string>();
    
    // Helper to check if URL is from source website (should be excluded)
    const isSourceWebsiteUrl = (url: string): boolean => {
      try {
        const urlDomain = new URL(url).hostname.toLowerCase();
        return urlDomain === sourceDomain || 
               urlDomain.endsWith("." + sourceDomain) ||
               sourceDomain.endsWith("." + urlDomain);
      } catch {
        return false;
      }
    };
    
    // Helper to add a link
    const addLink = (href: string, text: string, parentText: string) => {
      if (!href) return;
      
      // CRITICAL: Clean the URL first - remove leading/trailing spaces and handle multiple URLs
      let cleanHref = href.trim();
      
      // Check if href contains multiple URLs (space-separated)
      if (cleanHref.includes(" http")) {
        const urls = cleanHref.split(/\s+/).filter(u => u.startsWith("http"));
        if (urls.length > 1) {
          // Find URL that's NOT the source domain
          const externalUrl = urls.find(u => !isSourceWebsiteUrl(u));
          cleanHref = externalUrl || urls[urls.length - 1];
        } else if (urls.length === 1) {
          cleanHref = urls[0];
        }
      }
      
      // Extract http URL if there's garbage
      if (cleanHref.includes(" ")) {
        const httpMatch = cleanHref.match(/(https?:\/\/[^\s]+)/);
        if (httpMatch) {
          cleanHref = httpMatch[1];
        }
      }
      
      if (!cleanHref || seenUrls.has(cleanHref)) return;
      if (cleanHref.startsWith("#") || cleanHref.startsWith("javascript:")) return;
      
      // CRITICAL: NEVER add source website URLs as download links
      if (cleanHref.startsWith("http") && isSourceWebsiteUrl(cleanHref)) {
        return; // Skip - this is from the source website
      }
      
      // Skip relative URLs - they resolve to source website
      if (!cleanHref.startsWith("http")) {
        return;
      }
      
      const lowerHref = cleanHref.toLowerCase();
      const combinedText = (text + " " + parentText).toLowerCase();
      
      // Skip social/nav links
      const skipPatterns = [
        "facebook.com", "twitter.com", "instagram.com", "youtube.com/watch",
        "telegram.me", "telegram.org", "whatsapp.com", "pinterest.com",
        "#comment", "#respond", "wp-login", "wp-admin",
        "/tag/", "/category/", "/author/", "?s=", "/feed/", "/search"
      ];
      if (skipPatterns.some(p => lowerHref.includes(p))) return;
      
      seenUrls.add(cleanHref);
      
      // Detect quality
      let quality = "720p";
      if (combinedText.includes("480") || lowerHref.includes("480")) quality = "480p";
      else if (combinedText.includes("1080") || lowerHref.includes("1080")) quality = "1080p";
      else if (combinedText.includes("2160") || combinedText.includes("4k") || lowerHref.includes("2160") || lowerHref.includes("4k")) quality = "4K";
      else if (combinedText.includes("720") || lowerHref.includes("720")) quality = "720p";

      // Detect language
      let language = "Hindi";
      if (combinedText.includes("english") || combinedText.includes(" eng ") || combinedText.includes("[eng]")) language = "English";
      else if (combinedText.includes("dual") || combinedText.includes("hin-eng")) language = "Dual Audio";
      else if (combinedText.includes("tamil")) language = "Tamil";
      else if (combinedText.includes("telugu")) language = "Telugu";
      else if (combinedText.includes("hindi")) language = "Hindi";

      // URL is already absolute and external
      links.push({ quality, language, url: cleanHref });
    };
    
    // Find all links with download-related patterns
    const downloadHosts = [
      "drive.google", "mediafire", "mega.nz", "mega.co", "dropbox",
      "pixeldrain", "gofile", "hubcloud", "gdtot", "filepress",
      "1fichier", "uptobox", "rapidgator", "nitroflare", "uploadrar"
    ];
    
    $("a").each((_, el) => {
      const href = $(el).attr("href") || "";
      const text = $(el).text().trim();
      const parentText = $(el).parent().text().trim();
      const lowerHref = href.toLowerCase();
      const combinedText = (text + " " + parentText).toLowerCase();
      
      // Check for download hosts
      if (downloadHosts.some(h => lowerHref.includes(h))) {
        addLink(href, text, parentText);
        return;
      }
      
      // Check for quality indicators
      if (combinedText.match(/480p|720p|1080p|2160p|4k/i)) {
        addLink(href, text, parentText);
        return;
      }
      
      // Check for download keywords
      if (combinedText.includes("download") || combinedText.includes("link") || combinedText.includes("server")) {
        // Must have an external link or file extension
        if (href.startsWith("http") || href.includes(".mkv") || href.includes(".mp4")) {
          addLink(href, text, parentText);
        }
      }
    });

    // Also check buttons with data attributes
    $("button, [role='button'], .btn").each((_, el) => {
      const dataHref = $(el).attr("data-href") || $(el).attr("data-url") || $(el).attr("data-link") || "";
      const onclick = $(el).attr("onclick") || "";
      const text = $(el).text().trim();
      const parentText = $(el).parent().text().trim();
      
      // Extract URL from onclick if present
      const urlMatch = onclick.match(/['"]((https?:\/\/|\/)[^'"]+)['"]/);
      const href = dataHref || (urlMatch ? urlMatch[1] : "");
      
      if (href) {
        addLink(href, text, parentText);
      }
    });

  } catch (error) {
    console.error("Error scraping download page:", error);
  }
  
  return links;
}
