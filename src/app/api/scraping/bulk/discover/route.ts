import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import * as cheerio from "cheerio";

// POST /api/scraping/bulk/discover - Discover years or movies from a website
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
    const { url, type } = body;

    if (!url) {
      return NextResponse.json(
        { success: false, error: "URL is required" },
        { status: 400 }
      );
    }

    // Fetch the page
    console.log(`[DISCOVER] Fetching URL: ${url}`);
    const response = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.5",
        "Cache-Control": "no-cache",
        "Pragma": "no-cache",
      },
      cache: "no-store",
    });

    console.log(`[DISCOVER] Response status: ${response.status}`);

    if (!response.ok) {
      console.log(`[DISCOVER] Failed to fetch: ${response.status}`);
      return NextResponse.json(
        { success: false, error: `Failed to fetch URL: ${response.status}` },
        { status: 400 }
      );
    }

    const html = await response.text();
    console.log(`[DISCOVER] HTML length: ${html.length} bytes`);
    const $ = cheerio.load(html);
    const baseUrl = new URL(url).origin;

    if (type === "years") {
      // Discover years from the website
      const years = discoverYears($, baseUrl);
      
      if (years.length === 0) {
        // Try to generate years manually if not found
        const currentYear = new Date().getFullYear();
        const generatedYears = [];
        for (let y = currentYear; y >= currentYear - 10; y--) {
          generatedYears.push({
            year: y.toString(),
            count: 0,
            url: `${baseUrl}/year/${y}`,
          });
        }
        return NextResponse.json({
          success: true,
          years: generatedYears,
          note: "Years auto-generated. Click to check availability.",
        });
      }

      return NextResponse.json({
        success: true,
        years,
      });
    } else if (type === "movies") {
      // Extract target year from URL (e.g., /release/2025/ or /2025/)
      const yearFromUrl = extractYearFromUrl(url);
      
      // Extract genre from URL (e.g., /genre/hindi-dubbed/)
      const genreFromUrl = extractGenreFromUrl(url);
      
      // If URL is a year-only page (e.g., /release/2025/), we're already on the listing page
      // Just discover movies from it - the year filter will handle filtering
      console.log(`Discovering movies from: ${url}`);
      if (yearFromUrl) {
        console.log(`✅ Year ${yearFromUrl} detected in URL - will filter movies to this year only`);
      }
      if (genreFromUrl) {
        console.log(`✅ Genre "${genreFromUrl}" detected in URL`);
      }
      
      // Discover movies from a year/listing page
      // This will automatically skip year-only links and only get actual movie pages
      const allMovies = discoverMovies($, baseUrl, url);
      console.log(`[DISCOVER] Movies found on page: ${allMovies.length}`);
      if (allMovies.length > 0) {
        console.log(`[DISCOVER] First 3 movies:`, allMovies.slice(0, 3).map(m => m.url));
      }
      console.log(`Total movies discovered (before year filter): ${allMovies.length}`);
      
      // Year filtering - RELAXED for better results
      // If user is browsing a year/release page, trust that the website shows relevant content
      // Only filter if explicitly requested via query param, not just from URL path
      let movies = allMovies;

      // Check if this is a release/year page (trust the website's categorization)
      const isYearReleasePage = url.match(/\/release\/\d{4}|\/year\/\d{4}|\/movies\/\d{4}/i);

      if (yearFromUrl && !isYearReleasePage) {
        // Only apply strict year filter for non-year pages (like search results)
        movies = allMovies.filter(movie => {
          // Check year in movie URL
          const movieYearFromUrl = extractYearFromUrl(movie.url);
          if (movieYearFromUrl && movieYearFromUrl === yearFromUrl) {
            return true;
          }

          // Check year field
          if (movie.year) {
            const movieYear = parseInt(movie.year);
            if (movieYear === yearFromUrl) {
              return true;
            }
          }

          // Check year in title
          const titleYearPatterns = [
            new RegExp(`\\(${yearFromUrl}\\)`, 'i'),
            new RegExp(`\\[${yearFromUrl}\\]`, 'i'),
            new RegExp(`-${yearFromUrl}[-/]`, 'i'),
          ];

          for (const pattern of titleYearPatterns) {
            if (pattern.test(movie.title) || pattern.test(movie.url)) {
              return true;
            }
          }

          return false;
        });

        console.log(`Year filter ${yearFromUrl}: ${allMovies.length} total -> ${movies.length} matching`);
      } else if (yearFromUrl && isYearReleasePage) {
        // For year/release pages, trust the website and include all movies
        console.log(`📅 Year release page detected - including all ${allMovies.length} movies (trusting website categorization)`);
        movies = allMovies;
      }
      
      // Note: Genre filtering is handled by the website itself (genre pages show genre-specific movies)
      // We just track it for display purposes
      
      // Detect pagination and total count
      const paginationInfo = detectPagination($, baseUrl, url, genreFromUrl);
      const totalCount = detectTotalCount($);
      
      // If no movies found, provide helpful error message
      if (movies.length === 0) {
        // Check if page loaded correctly
        const pageTitle = $("title").text() || "";
        const hasContent = $("body").text().length > 100;
        
        let errorMessage = "Could not find movies on this page.";
        if (!hasContent) {
          errorMessage += " The page appears to be empty or failed to load.";
        } else {
          errorMessage += " Try using 'Direct Scrape' method or check if the URL is correct.";
        }
        
        console.log("Movie discovery failed:", {
          url,
          pageTitle,
          hasContent,
          bodyLength: $("body").text().length,
          linkCount: $("a").length,
        });
        
        return NextResponse.json({
          success: false,
          error: errorMessage,
          movies: [],
          pagination: paginationInfo,
          totalCount,
          debug: {
            pageTitle,
            linkCount: $("a").length,
            hasContent,
          },
        });
      }
      
      return NextResponse.json({
        success: true,
        movies,
        pagination: paginationInfo,
        totalCount,
        yearFilter: yearFromUrl || null,
        genreFilter: genreFromUrl || null,
      });
    }

    return NextResponse.json(
      { success: false, error: "Invalid type. Use 'years' or 'movies'" },
      { status: 400 }
    );
  } catch (error) {
    console.error("Discovery error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to analyze website" },
      { status: 500 }
    );
  }
}

// Discover years from website
function discoverYears($: cheerio.CheerioAPI, baseUrl: string): { year: string; count: number; url: string }[] {
  const years: { year: string; count: number; url: string }[] = [];
  const seenYears = new Set<string>();

  // Common year link patterns
  const yearSelectors = [
    'a[href*="/year/"]',
    'a[href*="/release-year/"]',
    'a[href*="/movies/year/"]',
    'a[href*="year="]',
    '.year-filter a',
    '.years a',
    '.release-year a',
    'select[name*="year"] option',
    '.filter-year a',
    'a[href*="/20"]', // 2020, 2021, etc.
    'a[href*="/19"]', // 1990s
  ];

  for (const selector of yearSelectors) {
    $(selector).each((_, el) => {
      const href = $(el).attr("href") || $(el).attr("value") || "";
      const text = $(el).text().trim();
      
      // Extract year from href or text
      const yearMatch = (href + " " + text).match(/\b(19|20)\d{2}\b/);
      if (yearMatch) {
        const year = yearMatch[0];
        if (!seenYears.has(year)) {
          seenYears.add(year);
          
          // Get full URL
          let fullUrl = href;
          if (href && !href.startsWith("http")) {
            fullUrl = href.startsWith("/") ? baseUrl + href : baseUrl + "/" + href;
          }
          
          // Try to get count from text
          const countMatch = text.match(/\((\d+)\)/);
          const count = countMatch ? parseInt(countMatch[1]) : 0;

          years.push({ year, count, url: fullUrl || `${baseUrl}/year/${year}` });
        }
      }
    });
  }

  // Sort by year descending
  years.sort((a, b) => parseInt(b.year) - parseInt(a.year));

  return years.slice(0, 20); // Return last 20 years
}

// Discover movies from a listing page
function discoverMovies($: cheerio.CheerioAPI, baseUrl: string, pageUrl: string): { title: string; url: string; year?: string; posterUrl?: string }[] {
  const movies: { title: string; url: string; year?: string; posterUrl?: string }[] = [];
  const seenUrls = new Set<string>();

  // Expanded movie link patterns - more aggressive
  const movieSelectors = [
    // Specific movie containers
    ".movie-item a",
    ".post-item a",
    ".film-item a",
    ".movie a",
    ".film a",
    "article.post a",
    ".entry a",
    ".content-item a",
    ".video-item a",
    ".item a",
    // List containers
    ".movies-list a",
    ".movie-list a",
    ".post-list a",
    ".film-list a",
    ".entry-list a",
    // Title links
    "h2 a",
    "h3 a",
    "h4 a",
    ".title a",
    ".post-title a",
    ".entry-title a",
    ".movie-title a",
    ".film-title a",
    // URL pattern matching
    'a[href*="/movie/"]',
    'a[href*="/download/"]',
    'a[href*="/film/"]',
    'a[href*="/release/"]',
    'a[href*="/watch/"]',
    'a[href*="-download"]',
    'a[href*="-full-movie"]',
    'a[href*="-movie"]',
    // Grid/list items
    ".grid-item a",
    ".list-item a",
    ".card a",
    ".box a",
    // WordPress patterns
    "article a",
    ".post a",
    ".type-post a",
    // Generic content links (fallback)
    "main a",
    ".content a",
    ".main-content a",
    "#content a",
    // WorldFree4u and similar sites - image card links
    'a.cursor-pointer',
    'a.group',
    'a.block',
    'a[class*="cursor-pointer"]',
    'a[class*="overflow-hidden"]',
    // Year-based URL patterns
    'a[href*="-2024"]',
    'a[href*="-2025"]',
    'a[href*="-2026"]',
    'a[href*="-hdrip"]',
    'a[href*="-webrip"]',
    'a[href*="-web-series"]',
    'a[href*="-season-"]',
    'a[href*="dual-audio"]',
    ".home-categories a",
    ".trending a",
    ".latest a",
  ];

  // Get domain to filter out external links
  const domain = new URL(pageUrl).hostname;

  // First pass: Try specific selectors
  for (const selector of movieSelectors) {
    try {
      $(selector).each((_, el) => {
        const href = $(el).attr("href") || "";
        // Get title from multiple sources - including child img alt attribute
        let title = $(el).attr("title") ||
                    $(el).attr("alt") ||
                    $(el).find("img").attr("alt") ||  // WorldFree4u style - title in child img alt
                    $(el).find(".title").text().trim() ||
                    $(el).text().trim();
        
        // Skip empty, external, or already seen
        if (!href || seenUrls.has(href)) return;
        if (href.startsWith("#") || href.startsWith("javascript:") || href.startsWith("mailto:")) return;
        
        // Make absolute URL
        let fullUrl = href;
        if (!href.startsWith("http")) {
          fullUrl = href.startsWith("/") ? baseUrl + href : baseUrl + "/" + href;
        }
        
        // Check if it's same domain
        try {
          const linkDomain = new URL(fullUrl).hostname;
          if (linkDomain !== domain) return;
        } catch {
          return;
        }
        
        // CRITICAL: URL must look like a movie page (not too short, has meaningful path)
        const urlPath = new URL(fullUrl).pathname;
        const pathParts = urlPath.split("/").filter(p => p && p.length > 0);
        
        // Skip if URL is too short or looks like a utility page
        if (pathParts.length < 2) {
          // Root or single-level paths are usually not movies
          // Allow only if it contains movie indicators
          if (!urlPath.match(/\/movie|\/film|\/download|\/watch|\/release/i)) {
            return;
          }
        }

        // Relaxed filtering - allow release/year pages but skip obvious non-movie pages
        const skipPatterns = [
          /\/category\//i,
          /\/tag\//i,
          /\/author\//i,
          /\/search/i,
          /\/page\/\d+\/?$/i, // Skip pagination links (with or without trailing slash)
          /\/page\/\d+\/?(?:\?|#|$)/i, // Also catch pagination with query strings
          /\/genre\//i,
          /\/archive\//i,
          /\?s=/i, // Search queries
          /\/feed\//i,
          /\/rss\//i,
          /wp-login/i,
          /wp-admin/i,
          // Authentication and account pages
          /\/login/i,
          /\/register/i,
          /\/signup/i,
          /\/sign-in/i,
          /\/sign-up/i,
          /\/forgot-password/i,
          /\/reset-password/i,
          /\/lost-password/i,
          /\/password-reset/i,
          /\/account/i,
          /\/profile/i,
          /\/dashboard/i,
          /\/admin/i,
          /\/user/i,
          /\/members/i,
          // Navigation and utility pages
          /\/about/i,
          /\/contact/i,
          /\/privacy/i,
          /\/terms/i,
          /\/dmca/i,
          /\/disclaimer/i,
          /\/cookie/i,
          /\/sitemap/i,
        ];
        
        let shouldSkip = false;
        for (const pattern of skipPatterns) {
          if (pattern.test(fullUrl)) {
            shouldSkip = true;
            break;
          }
        }
        if (shouldSkip) return;
        
      // Skip if title is too short or generic
      if (!title || title.length < 3 || title.length > 200) return;
      
      // CRITICAL: Skip if title is just a year
      if (/^\d{4}$/.test(title.trim())) {
        return; // Title is just a year, skip it
      }
      
      // CRITICAL: Skip authentication and navigation links
      const authNavTitles = [
        /^register/i,
        /^login/i,
        /^sign in/i,
        /^sign up/i,
        /^sign up/i,
        /^lost.*password/i,
        /^forgot.*password/i,
        /^reset.*password/i,
        /^password.*reset/i,
        /^create.*account/i,
        /^new.*account/i,
        /^my account/i,
        /^my profile/i,
        /^dashboard/i,
        /^home$/i,
        /^about$/i,
        /^contact$/i,
        /^privacy$/i,
        /^terms$/i,
        /^dmca$/i,
        /^disclaimer$/i,
        /^cookie$/i,
        /^sitemap$/i,
        /^more$/i,
        /^read more$/i,
        /^download$/i,
        /^click$/i,
        /^next$/i,
        /^previous$/i,
        /^prev$/i,
        /^back$/i,
        /^menu$/i,
        /^navigation$/i,
        /^skip$/i,
        /^continue$/i,
      ];
      
      const titleLower = title.toLowerCase().trim();
      
      // Check exact matches first
      if (authNavTitles.some(pattern => pattern.test(titleLower))) {
        return; // Skip authentication/navigation links
      }
      
      // Also check if title contains common auth phrases (even as part of longer text)
      const authPhrases = [
        'register a new account',
        'lost your password',
        'forgot password',
        'reset password',
        'create account',
        'sign up',
        'sign in',
        'log in',
        'log out',
      ];
      
      if (authPhrases.some(phrase => titleLower.includes(phrase))) {
        return; // Skip if title contains auth phrases
      }
      
      // Also check URL for authentication patterns
      const urlLower = fullUrl.toLowerCase();
      if (/\/login|\/register|\/signup|\/sign-in|\/sign-up|\/forgot|\/reset|\/password|\/account|\/profile|\/dashboard|\/admin|\/user/i.test(urlLower)) {
        return; // Skip if URL contains auth patterns
      }

      seenUrls.add(href);
      
      // Clean title
      title = cleanMovieTitle(title);
      if (!title || title.length < 3) return;
      
      // Final check: Skip if cleaned title is just a year
      if (/^\d{4}$/.test(title.trim())) {
        return;
      }

        // Try to find poster - check parent elements too
        let posterUrl = "";
        const img = $(el).find("img").first();
        if (img.length) {
          posterUrl = img.attr("src") || img.attr("data-src") || img.attr("data-lazy-src") || img.attr("data-original") || "";
          if (posterUrl && !posterUrl.startsWith("http")) {
            posterUrl = posterUrl.startsWith("/") ? baseUrl + posterUrl : baseUrl + "/" + posterUrl;
          }
        } else {
          // Check parent for image
          const parentImg = $(el).parent().find("img").first();
          if (parentImg.length) {
            posterUrl = parentImg.attr("src") || parentImg.attr("data-src") || parentImg.attr("data-lazy-src") || "";
            if (posterUrl && !posterUrl.startsWith("http")) {
              posterUrl = posterUrl.startsWith("/") ? baseUrl + posterUrl : baseUrl + "/" + posterUrl;
            }
          }
        }

        // Try to find year from URL or title (but don't use year as title)
        const yearMatch = (fullUrl + " " + title).match(/\b(19|20)\d{2}\b/);
        const year = yearMatch ? yearMatch[0] : undefined;
        
        // Final validation: Ensure title is not just a year
        // If title is just a year after all processing, try to extract from URL
        if (title && /^\d{4}$/.test(title.trim())) {
          // Title is just a year - try to get proper title from URL slug
          const urlPath = new URL(fullUrl).pathname;
          const urlParts = urlPath.split('/').filter(p => p && p.length > 2 && !/^\d{4}$/.test(p));
          if (urlParts.length > 0) {
            // Use the last meaningful URL part as title
            const lastPart = urlParts[urlParts.length - 1];
            title = lastPart
              .replace(/[-_]/g, ' ')
              .replace(/\b\w/g, l => l.toUpperCase())
              .trim();
          } else {
            // Can't extract proper title, skip this link
            return;
          }
        }
        
        // One more check: if title is still just a year or too short, skip
        if (!title || title.length < 3 || /^\d{4}$/.test(title.trim())) {
          return;
        }

        movies.push({ title, url: fullUrl, year, posterUrl });
      });
    } catch (err) {
      // Continue if selector fails
      continue;
    }

    if (movies.length >= 200) break; // Limit to 200 movies per page
  }

  // Second pass: If no movies found, try more aggressive fallback
  if (movies.length === 0) {
    console.log("No movies found with standard selectors, trying fallback method...");

    // Get all links and filter manually
    $("a").each((_, el) => {
      const href = $(el).attr("href") || "";
      // Get title from multiple sources
      let title = $(el).attr("title") ||
                  $(el).attr("alt") ||
                  $(el).find("img").attr("alt") ||  // WorldFree4u style
                  $(el).text().trim();
      
      if (!href || seenUrls.has(href)) return;
      if (href.startsWith("#") || href.startsWith("javascript:") || href.startsWith("mailto:")) return;
      
      // Make absolute URL
      let fullUrl = href;
      if (!href.startsWith("http")) {
        fullUrl = href.startsWith("/") ? baseUrl + href : baseUrl + "/" + href;
      }
      
      // Check if it's same domain
      try {
        const linkDomain = new URL(fullUrl).hostname;
        if (linkDomain !== domain) return;
      } catch {
        return;
      }

      // Skip obvious non-movie pages but allow release/year pages
      const skipPatterns = [
        /\/category\//i,
        /\/tag\//i,
        /\/author\//i,
        /\/search/i,
        /\/page\/\d+\/?$/i, // Skip pagination links (with or without trailing slash)
        /\/page\/\d+\/?(?:\?|#|$)/i, // Also catch pagination with query strings
        /\/genre\//i,
        /\?s=/i,
        /wp-login/i,
        /wp-admin/i,
        // Authentication and account pages
        /\/login/i,
        /\/register/i,
        /\/signup/i,
        /\/sign-in/i,
        /\/sign-up/i,
        /\/forgot-password/i,
        /\/reset-password/i,
        /\/lost-password/i,
        /\/password-reset/i,
        /\/account/i,
        /\/profile/i,
        /\/dashboard/i,
        /\/admin/i,
        /\/user/i,
        /\/members/i,
        // Navigation and utility pages
        /\/about/i,
        /\/contact/i,
        /\/privacy/i,
        /\/terms/i,
        /\/dmca/i,
        /\/disclaimer/i,
        /\/cookie/i,
        /\/sitemap/i,
      ];
      
      let shouldSkip = false;
      for (const pattern of skipPatterns) {
        if (pattern.test(fullUrl)) {
          shouldSkip = true;
          break;
        }
      }
      if (shouldSkip) return;
      
      // Check if URL looks like a movie page (has meaningful path segments)
      const pathParts = new URL(fullUrl).pathname.split("/").filter(p => p && p.length > 2);
      
      // CRITICAL: URL must have meaningful content or movie indicators
      const urlPath = new URL(fullUrl).pathname.toLowerCase();
      const hasMovieIndicators = urlPath.match(/\/movie|\/film|\/download|\/watch|\/release|\/title/i);
      
      if (pathParts.length < 1 && !hasMovieIndicators) {
        return; // Too short to be a movie page and no movie indicators
      }
      
      // Skip if URL is just a single word (likely navigation)
      if (pathParts.length === 1 && pathParts[0].length < 5 && !hasMovieIndicators) {
        return; // Too short, likely not a movie
      }
      
      // Skip if title is too short or generic
      if (!title || title.length < 3 || title.length > 200) return;
      
      // CRITICAL: Skip if title is just a year (e.g., "2025", "2024")
      // This prevents year listing pages from being treated as movies
      const titleTrimmed = title.trim();
      if (/^\d{4}$/.test(titleTrimmed)) {
        return; // Title is just a year number, this is a year listing page, skip it
      }
      
      // CRITICAL: Skip authentication and navigation links
      const authNavTitles = [
        /^register/i,
        /^login/i,
        /^sign in/i,
        /^sign up/i,
        /^lost.*password/i,
        /^forgot.*password/i,
        /^reset.*password/i,
        /^password.*reset/i,
        /^create.*account/i,
        /^new.*account/i,
        /^my account/i,
        /^my profile/i,
        /^dashboard/i,
        /^home$/i,
        /^about$/i,
        /^contact$/i,
        /^privacy$/i,
        /^terms$/i,
        /^dmca$/i,
        /^disclaimer$/i,
        /^cookie$/i,
        /^sitemap$/i,
        /^more$/i,
        /^read more$/i,
        /^download$/i,
        /^click$/i,
        /^next$/i,
        /^previous$/i,
        /^prev$/i,
        /^back$/i,
        /^menu$/i,
        /^navigation$/i,
        /^skip$/i,
        /^continue$/i,
      ];
      
      const titleLower = title.toLowerCase().trim();
      
      // Check exact matches first
      if (authNavTitles.some(pattern => pattern.test(titleLower))) {
        return; // Skip authentication/navigation links
      }
      
      // Also check if title contains common auth phrases (even as part of longer text)
      const authPhrases = [
        'register a new account',
        'lost your password',
        'forgot password',
        'reset password',
        'create account',
        'sign up',
        'sign in',
        'log in',
        'log out',
      ];
      
      if (authPhrases.some(phrase => titleLower.includes(phrase))) {
        return; // Skip if title contains auth phrases
      }
      
      // Also check URL for authentication patterns
      const urlLower = fullUrl.toLowerCase();
      if (/\/login|\/register|\/signup|\/sign-in|\/sign-up|\/forgot|\/reset|\/password|\/account|\/profile|\/dashboard|\/admin|\/user/i.test(urlLower)) {
        return; // Skip if URL contains auth patterns
      }

      seenUrls.add(href);
      
      // Clean title
      title = cleanMovieTitle(title);
      if (!title || title.length < 3) return;
      
      // Final check: Skip if cleaned title is just a year
      if (/^\d{4}$/.test(title.trim())) {
        return; // After cleaning, title is just a year, skip it
      }

      // Try to find poster
      let posterUrl = "";
      const img = $(el).find("img").first();
      if (img.length) {
        posterUrl = img.attr("src") || img.attr("data-src") || img.attr("data-lazy-src") || "";
        if (posterUrl && !posterUrl.startsWith("http")) {
          posterUrl = posterUrl.startsWith("/") ? baseUrl + posterUrl : baseUrl + "/" + posterUrl;
        }
      }

      // Try to find year from URL or title (but don't use year as title)
      const yearMatch = (fullUrl + " " + title).match(/\b(19|20)\d{2}\b/);
      const year = yearMatch ? yearMatch[0] : undefined;
      
      // Ensure title is not just a year
      if (title && /^\d{4}$/.test(title.trim())) {
        // If title is just a year, try to get better title from URL or skip
        const urlParts = fullUrl.split('/').filter(p => p && p.length > 2);
        const lastPart = urlParts[urlParts.length - 1];
        if (lastPart && lastPart !== year && lastPart.length > 3) {
          // Use URL slug as title if available
          title = lastPart.replace(/[-_]/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
        } else {
          // Skip if we can't get a proper title
          return;
        }
      }

      movies.push({ title, url: fullUrl, year, posterUrl });
      
      if (movies.length >= 200) return false; // Break
    });
  }

  console.log(`Discovered ${movies.length} movies from ${pageUrl}`);
  return movies;
}

// Clean movie title
function cleanMovieTitle(title: string): string {
  // Remove common website suffixes
  const patterns = [
    /\s*[-–|:]\s*(download|watch|stream|free|online|hd|full movie).*$/gi,
    /\s*[-–|:]\s*\S+\.(com|net|org|io|in|co|site|xyz|top|cc|me|tv|movie|film).*$/gi,
    /\s*(480p|720p|1080p|2160p|4k|hdrip|webrip|bluray|dvdrip).*$/gi,
    /\s*\([^)]*\.(com|net|org)[^)]*\)/gi,
    /\s*\[[^\]]*\]/gi,
    /download\s*$/i,
    /\s*full\s*movie\s*$/i,
  ];

  let cleaned = title;
  for (const pattern of patterns) {
    cleaned = cleaned.replace(pattern, "");
  }

  // Fix duplicate years
  cleaned = fixDuplicateYears(cleaned);

  return cleaned.replace(/\s+/g, " ").trim();
}

// Detect pagination information
function detectPagination($: cheerio.CheerioAPI, baseUrl: string, currentUrl: string, genreFromUrl?: string | null): {
  hasNextPage: boolean;
  nextPageUrl: string | null;
  currentPage: number;
  totalPages: number | null;
  pagePattern: string | null;
} {
  let hasNextPage = false;
  let nextPageUrl: string | null = null;
  let currentPage = 1;
  let totalPages: number | null = null;
  let pagePattern: string | null = null;

  // Detect if this is a genre/category page (for better pagination handling)
  const isGenrePage = /\/genre\/[^\/]+\/?$/i.test(currentUrl) ||
                       /\/category\/[^\/]+\/?$/i.test(currentUrl) ||
                       /\/tag\/[^\/]+\/?$/i.test(currentUrl);

  // Try to find pagination links - more aggressive search
  const paginationSelectors = [
    '.pagination a',
    '.pager a',
    '.page-numbers a',
    '.pagination-nav a',
    '.wp-pagenavi a',
    'a[rel="next"]',
    'a.next',
    '.next-page a',
    'nav a',
    '.pagination li a',
    '.pagination .next',
    '.pager .next',
    'a[class*="next"]',
    'a[class*="Next"]',
    '.page-nav a',
    '.paging a',
    // Additional selectors for movie sites
    '.nav-links a',
    '.navigation a',
    '.page-link',
    'a[href*="/page/"]',
    'a[href*="?page="]',
  ];

  // Find next page link
  for (const selector of paginationSelectors) {
    $(selector).each((_, el) => {
      const text = $(el).text().toLowerCase().trim();
      const href = $(el).attr("href") || "";
      const classes = $(el).attr("class") || "";
      const id = $(el).attr("id") || "";

      // Check for next page indicators - more patterns
      if (
        text.includes("next") ||
        text.includes(">") ||
        text === "»" ||
        text === "→" ||
        classes.toLowerCase().includes("next") ||
        id.toLowerCase().includes("next") ||
        $(el).attr("rel") === "next" ||
        $(el).attr("aria-label")?.toLowerCase().includes("next")
      ) {
        if (href && !href.startsWith("#") && !href.includes("javascript:") && href.trim() !== "") {
          let fullUrl = href;
          if (!href.startsWith("http")) {
            fullUrl = href.startsWith("/") ? baseUrl + href : baseUrl + "/" + href;
          }
          // Validate URL
          try {
            new URL(fullUrl);
            hasNextPage = true;
            nextPageUrl = fullUrl;
            return false; // Break the loop
          } catch {
            // Invalid URL, continue
          }
        }
      }
    });
    if (hasNextPage) break;
  }

  // Also check for numbered page links (2, 3, 4, etc.) - if we see page 2, there's a next page
  if (!hasNextPage) {
    $('.pagination a, .page-numbers a, .pager a, a[href*="page"]').each((_, el) => {
      const text = $(el).text().trim();
      const href = $(el).attr("href") || "";
      const num = parseInt(text);
      
      // If we find a link with number 2, assume there's pagination
      if (num === 2 && href && !href.startsWith("#")) {
        let fullUrl = href;
        if (!href.startsWith("http")) {
          fullUrl = href.startsWith("/") ? baseUrl + href : baseUrl + "/" + href;
        }
        try {
          new URL(fullUrl);
          hasNextPage = true;
          nextPageUrl = fullUrl;
          return false;
        } catch {
          // Invalid URL
        }
      }
    });
  }

  // Try to detect current page number from URL
  const currentPageMatch = currentUrl.match(/[\/\?&]page[\/=]?(\d+)/i);
  if (currentPageMatch) {
    currentPage = parseInt(currentPageMatch[1]);
  } else {
    // Check if we're on page 1 (no page number in URL)
    const page1Indicators = $('.pagination .current, .page-numbers .current, .pager .active, .pagination .active');
    if (page1Indicators.length === 0) {
      currentPage = 1;
    } else {
      // Try to extract page number from active indicator
      const activeText = page1Indicators.first().text().trim();
      const activeNum = parseInt(activeText);
      if (!isNaN(activeNum)) {
        currentPage = activeNum;
      }
    }
  }

  // Try to find total pages from page numbers
  const pageNumbers: number[] = [];
  $('.pagination a, .page-numbers a, .pager a, a[href*="page"]').each((_, el) => {
    const text = $(el).text().trim();
    const num = parseInt(text);
    if (!isNaN(num) && num > 0 && num < 10000) {
      pageNumbers.push(num);
    }
  });

  if (pageNumbers.length > 0) {
    totalPages = Math.max(...pageNumbers);
  }

  // Detect page pattern from URL - more patterns including /movies/page/2/ and /page/2/
  const urlObj = new URL(currentUrl);
  if (urlObj.searchParams.has("page") || urlObj.searchParams.has("p") || urlObj.searchParams.has("paged")) {
    pagePattern = "query";
  } else if (currentUrl.match(/\/movies\/page\/\d+/i)) {
    pagePattern = "movies-path"; // /movies/page/2/
  } else if (currentUrl.match(/\/genre\/[^\/]+\/page\/\d+/i) || currentUrl.match(/\/category\/[^\/]+\/page\/\d+/i)) {
    pagePattern = "genre-path"; // /genre/hindi-dubbed/page/2/
  } else if (currentUrl.match(/\/genre\/[^\/]+\/?$/i) || currentUrl.match(/\/category\/[^\/]+\/?$/i)) {
    // First page of genre/category - set pattern for page 2
    pagePattern = "genre-path";
    // For genre pages on first page, build next page URL
    if (!nextPageUrl) {
      const cleanUrl = currentUrl.replace(/\/$/, '');
      nextPageUrl = `${cleanUrl}/page/2/`;
      hasNextPage = true; // Assume pagination exists for genre pages
      console.log(`Genre page detected (first page), assuming pagination exists: ${nextPageUrl}`);
    }
  } else if (currentUrl.match(/\/page\/\d+/i)) {
    pagePattern = "path"; // /page/2/
  } else if (currentUrl.match(/\/\d+$/)) {
    pagePattern = "path-end";
  } else {
    // Default: try path pattern
    pagePattern = "path";
  }

  // If we found page numbers but no explicit next link, assume pagination exists
  if (!hasNextPage && pageNumbers.length > 0 && currentPage < Math.max(...pageNumbers)) {
    hasNextPage = true;
  }

  // IMPORTANT: For genre/category pages, always assume pagination exists if movies were found
  // Most movie sites paginate their genre listings
  if (isGenrePage && !hasNextPage && currentPage === 1) {
    hasNextPage = true;
    if (!nextPageUrl) {
      const cleanUrl = currentUrl.replace(/\/$/, '');
      nextPageUrl = `${cleanUrl}/page/2/`;
    }
    console.log(`Genre page on first page - assuming more pages exist: ${nextPageUrl}`);
  }

  return {
    hasNextPage: hasNextPage || (pageNumbers.length > 0 && currentPage < Math.max(...pageNumbers)),
    nextPageUrl,
    currentPage,
    totalPages,
    pagePattern,
  };
}

// Detect total count of movies/files on website
function detectTotalCount($: cheerio.CheerioAPI): number | null {
  // Try multiple patterns to find total count
  const countPatterns = [
    // Text patterns
    /(\d+)\s*(?:movies?|files?|posts?|items?|total)/i,
    /(?:total|all|showing)\s*(?:of|:)?\s*(\d+)/i,
    /(\d+)\s*(?:results?|entries?)/i,
    
    // Common class/ID patterns
    '.total-count',
    '.movie-count',
    '.file-count',
    '.post-count',
    '#total-count',
    '[data-count]',
    '[data-total]',
  ];

  // Check text content
  const bodyText = $('body').text();
  const countMatches = bodyText.match(/(\d{1,6})\s*(?:movies?|files?|posts?|total|results?)/i);
  if (countMatches) {
    const count = parseInt(countMatches[1]);
    if (count > 0 && count < 1000000) {
      return count;
    }
  }

  // Check specific elements
  for (const pattern of countPatterns) {
    if (typeof pattern === 'string') {
      const element = $(pattern).first();
      if (element.length) {
        const text = element.text().trim();
        const match = text.match(/(\d{1,6})/);
        if (match) {
          const count = parseInt(match[1]);
          if (count > 0 && count < 1000000) {
            return count;
          }
        }
      }
    }
  }

  // Try to count from pagination
  const lastPageLink = $('.pagination a, .page-numbers a, .pager a')
    .filter((_, el) => {
      const text = $(el).text().trim();
      return /^\d+$/.test(text);
    })
    .map((_, el) => parseInt($(el).text().trim()))
    .get();

  if (lastPageLink.length > 0) {
    const maxPage = Math.max(...lastPageLink);
    // Estimate: assume ~20-50 items per page
    return maxPage * 30; // Rough estimate
  }

  return null;
}

// Extract genre from URL (e.g., /genre/hindi-dubbed/)
function extractGenreFromUrl(url: string): string | null {
  try {
    // Try to find genre in URL path
    const genrePatterns = [
      /\/genre\/([^\/\?]+)\/?/i,        // /genre/hindi-dubbed/
      /\/category\/([^\/\?]+)\/?/i,     // /category/hindi-dubbed/
      /\/tag\/([^\/\?]+)\/?/i,          // /tag/hindi-dubbed/
      /\/movies\/([^\/\?]+)\/?/i,       // /movies/hindi-dubbed/ (if not a year)
    ];
    
    for (const pattern of genrePatterns) {
      const match = url.match(pattern);
      if (match) {
        const genre = match[1].toLowerCase();
        // Validate it's not a year (4 digits)
        if (!/^\d{4}$/.test(genre)) {
          console.log(`Extracted genre "${genre}" from URL: ${url}`);
          return genre;
        }
      }
    }
    
    return null;
  } catch {
    return null;
  }
}

// Extract year from URL (e.g., /release/2025/ or /2025/)
function extractYearFromUrl(url: string): number | null {
  try {
    // Try to find year in URL path - prioritize specific patterns
    // Patterns: /release/2025/, /2025/, /year/2025/, /movies/2025/, etc.
    const yearPatterns = [
      /\/release\/(\d{4})\/?/i,      // /release/2025/ or /release/2025
      /\/year\/(\d{4})\/?/i,         // /year/2025/
      /\/movies\/(\d{4})\/?/i,       // /movies/2025/
      /\/film\/(\d{4})\/?/i,         // /film/2025/
      /\/category\/(\d{4})\/?/i,     // /category/2025/
      /\/(\d{4})\/?$/i,              // /2025/ or /2025 at end
      /\/(\d{4})\//,                 // /2025/ in middle
    ];
    
    for (const pattern of yearPatterns) {
      const match = url.match(pattern);
      if (match) {
        const year = parseInt(match[1]);
        // Validate year is reasonable (1900-2100)
        if (year >= 1900 && year <= 2100) {
          console.log(`Extracted year ${year} from URL: ${url}`);
          return year;
        }
      }
    }
    
    // Try query parameter
    try {
      const urlObj = new URL(url);
      const yearParam = urlObj.searchParams.get("year") || urlObj.searchParams.get("y") || urlObj.searchParams.get("release_year");
      if (yearParam) {
        const year = parseInt(yearParam);
        if (year >= 1900 && year <= 2100) {
          console.log(`Extracted year ${year} from query param: ${url}`);
          return year;
        }
      }
    } catch {
      // Not a valid URL, continue
    }
    
    return null;
  } catch {
    return null;
  }
}

// Fix duplicate years in title
function fixDuplicateYears(text: string): string {
  if (!text) return text;
  
  // Find all years in the text
  const yearPattern = /\(?(19|20)\d{2}\)?/g;
  const matches = text.match(yearPattern);
  
  if (!matches || matches.length <= 1) {
    return text;
  }
  
  // Remove standalone years that follow a year in parentheses
  let cleaned = text.replace(/\(\d{4}\)\s*\d{4}/g, (match) => {
    const yearInParen = match.match(/\((\d{4})\)/);
    return yearInParen ? `(${yearInParen[1]})` : match;
  });
  
  // Remove duplicate consecutive years in parentheses - keep the more recent
  cleaned = cleaned.replace(/\((\d{4})\)\s*\((\d{4})\)/g, (match, year1, year2) => {
    const y1 = parseInt(year1);
    const y2 = parseInt(year2);
    return `(${Math.max(y1, y2)})`;
  });
  
  // Remove standalone years at the end if there's already a year in parentheses
  if (cleaned.match(/\(\d{4}\)/)) {
    cleaned = cleaned.replace(/\s+\d{4}\s*$/g, "");
  }
  
  // Keep only the first year in parentheses
  let foundFirst = false;
  cleaned = cleaned.replace(/\(\d{4}\)/g, (match) => {
    if (!foundFirst) {
      foundFirst = true;
      return match;
    }
    return "";
  });
  
  return cleaned.replace(/\s+/g, " ").trim();
}
