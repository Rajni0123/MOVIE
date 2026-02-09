import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import * as cheerio from "cheerio";

// POST /api/scraping/analyze - Analyze a website to get total content count
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

    // Fetch the page
    const response = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.5",
      },
    });

    if (!response.ok) {
      return NextResponse.json(
        { success: false, error: `Failed to fetch URL: ${response.status}` },
        { status: 400 }
      );
    }

    const html = await response.text();
    const $ = cheerio.load(html);
    const baseUrl = new URL(url).origin;

    // Get website info
    const websiteTitle = $("title").text().trim() || new URL(url).hostname;
    const websiteLogo = $('link[rel="icon"]').attr("href") ||
                        $('link[rel="shortcut icon"]').attr("href") ||
                        $('meta[property="og:image"]').attr("content") || "";

    // Count movies on current page
    const moviesOnPage = countMoviesOnPage($, baseUrl, url);

    // Detect pagination and estimate total
    const paginationData = analyzePagination($, baseUrl, url);

    // Find available categories/years FIRST (needed for estimation)
    const categories = findCategories($, baseUrl);
    const years = findYears($, baseUrl);

    // Estimate total content
    let totalEstimate = 0;
    let estimateMethod = "unknown";

    // Method 1: Try to find explicit count on page
    const explicitCount = findExplicitCount($);
    if (explicitCount && explicitCount > 0) {
      totalEstimate = explicitCount;
      estimateMethod = "explicit_count";
    }
    // Method 2: Calculate from pagination
    else if (paginationData.totalPages && paginationData.totalPages > 1) {
      // Estimate items per page (usually 20-30 on movie sites)
      const itemsPerPage = moviesOnPage > 0 ? Math.min(moviesOnPage, 30) : 20;
      totalEstimate = paginationData.totalPages * itemsPerPage;
      estimateMethod = "pagination_calc";
    }
    // Method 3: Estimate from last page number
    else if (paginationData.lastPageNumber && paginationData.lastPageNumber > 1) {
      const itemsPerPage = moviesOnPage > 0 ? Math.min(moviesOnPage, 30) : 20;
      totalEstimate = paginationData.lastPageNumber * itemsPerPage;
      estimateMethod = "last_page_calc";
    }
    // Method 4: If homepage has no pagination, check categories for total
    else if (categories.length > 0 && !paginationData.hasPages) {
      // Try to get total from first few categories
      let categoryTotal = 0;
      const categoriesToCheck = categories.slice(0, 3);

      for (const cat of categoriesToCheck) {
        try {
          const catResponse = await fetch(cat.url, {
            headers: {
              "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
              "Accept": "text/html,application/xhtml+xml",
            },
          });

          if (catResponse.ok) {
            const catHtml = await catResponse.text();
            const $cat = cheerio.load(catHtml);
            const catPagination = analyzePagination($cat, baseUrl, cat.url);

            if (catPagination.totalPages && catPagination.totalPages > 1) {
              // Count movies on category page
              const catMoviesOnPage = countMoviesOnPage($cat, baseUrl, cat.url);
              const itemsPerPage = catMoviesOnPage > 0 ? Math.min(catMoviesOnPage, 30) : 20;
              const catTotal = catPagination.totalPages * itemsPerPage;
              categoryTotal = Math.max(categoryTotal, catTotal);
              console.log(`Category ${cat.name}: ${catPagination.totalPages} pages × ${itemsPerPage} = ~${catTotal} movies`);
            }
          }
        } catch (e) {
          console.error(`Failed to check category ${cat.name}:`, e);
        }
      }

      if (categoryTotal > 0) {
        totalEstimate = categoryTotal;
        estimateMethod = "category_scan";
      } else {
        totalEstimate = moviesOnPage;
        estimateMethod = "current_page_only";
      }
    }
    // Method 5: Just count current page
    else {
      totalEstimate = moviesOnPage;
      estimateMethod = "current_page_only";
    }

    return NextResponse.json({
      success: true,
      data: {
        websiteTitle,
        websiteLogo: websiteLogo ? (websiteLogo.startsWith("http") ? websiteLogo : baseUrl + websiteLogo) : null,
        baseUrl,
        analyzedUrl: url,

        // Content counts
        moviesOnCurrentPage: moviesOnPage,
        totalLifetimeEstimate: totalEstimate,
        estimateMethod,

        // Pagination info
        pagination: {
          hasPages: paginationData.hasPages,
          totalPages: paginationData.totalPages,
          lastPageNumber: paginationData.lastPageNumber,
          itemsPerPage: moviesOnPage,
        },

        // Available filters
        categories: categories.slice(0, 20),
        years: years.slice(0, 15),

        // Import options
        importOptions: {
          canImportAll: totalEstimate > 0,
          estimatedTime: Math.ceil(totalEstimate * 3 / 60), // ~3 seconds per movie
        }
      }
    });

  } catch (error) {
    console.error("Analyze error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to analyze website" },
      { status: 500 }
    );
  }
}

// Count movies on current page
function countMoviesOnPage($: cheerio.CheerioAPI, baseUrl: string, pageUrl: string): number {
  const seenUrls = new Set<string>();
  const domain = new URL(pageUrl).hostname;

  const movieSelectors = [
    ".movie-item a", ".post-item a", ".film-item a",
    ".movie a", ".film a", "article.post a", ".entry a",
    ".content-item a", ".video-item a", ".item a",
    ".movies-list a", ".movie-list a", ".post-list a",
    "h2 a", "h3 a", "h4 a", ".title a", ".post-title a",
    'a[href*="/movie/"]', 'a[href*="/download/"]',
    'a[href*="/film/"]', 'a[href*="/watch/"]',
    'a[href*="-download"]', 'a[href*="-movie"]',
    ".grid-item a", ".card a", "article a",
  ];

  const skipPatterns = [
    /\/category\//i, /\/tag\//i, /\/author\//i, /\/search/i,
    /\/page\/\d+$/i, /\/genre\//i, /\?s=/i, /wp-login/i,
    /\/login/i, /\/register/i, /\/account/i, /\/about/i,
    /\/contact/i, /\/privacy/i, /\/terms/i,
  ];

  for (const selector of movieSelectors) {
    try {
      $(selector).each((_, el) => {
        const href = $(el).attr("href") || "";
        const title = $(el).attr("title") || $(el).text().trim();

        if (!href || seenUrls.has(href)) return;
        if (href.startsWith("#") || href.startsWith("javascript:")) return;

        let fullUrl = href;
        if (!href.startsWith("http")) {
          fullUrl = href.startsWith("/") ? baseUrl + href : baseUrl + "/" + href;
        }

        try {
          const linkDomain = new URL(fullUrl).hostname;
          if (linkDomain !== domain) return;
        } catch { return; }

        // Skip non-movie pages
        if (skipPatterns.some(p => p.test(fullUrl))) return;

        // Skip if title is too short or is just a year
        if (!title || title.length < 3 || /^\d{4}$/.test(title.trim())) return;

        // Skip auth/nav links
        const titleLower = title.toLowerCase();
        if (['login', 'register', 'home', 'about', 'contact'].some(t => titleLower === t)) return;

        seenUrls.add(href);
      });
    } catch { continue; }

    if (seenUrls.size >= 100) break;
  }

  return seenUrls.size;
}

// Analyze pagination to estimate total pages
function analyzePagination($: cheerio.CheerioAPI, baseUrl: string, currentUrl: string): {
  hasPages: boolean;
  totalPages: number | null;
  lastPageNumber: number | null;
} {
  let hasPages = false;
  let totalPages: number | null = null;
  let lastPageNumber: number | null = null;

  // Find all page numbers
  const pageNumbers: number[] = [];

  const paginationSelectors = [
    '.pagination a', '.page-numbers a', '.pager a',
    '.wp-pagenavi a', 'a[href*="page"]', '.pagination li a',
    'nav.pagination a', '.paging a', '.page-nav a',
    '.nav-links a', '.page-link',
  ];

  for (const selector of paginationSelectors) {
    $(selector).each((_, el) => {
      const text = $(el).text().trim();
      const num = parseInt(text);
      if (!isNaN(num) && num > 0 && num < 100000) {
        pageNumbers.push(num);
      }
    });
  }

  // IMPORTANT: Check for "Last" page links - extract page number from href
  $('a').each((_, el) => {
    const text = $(el).text().trim().toLowerCase();
    const href = $(el).attr("href") || "";

    // Check if it's a "Last" link
    if (text === 'last' || text === 'last »' || text === '»»' || text.includes('last')) {
      // Extract page number from URL like /page/157/ or ?page=157
      const pageMatch = href.match(/\/page\/(\d+)/i) || href.match(/[?&]page=(\d+)/i) || href.match(/\/(\d+)\/?$/);
      if (pageMatch) {
        const num = parseInt(pageMatch[1]);
        if (!isNaN(num) && num > 0 && num < 100000) {
          pageNumbers.push(num);
          console.log(`Found "Last" page link: ${num}`);
        }
      }
    }
  });

  // Also check all links for page numbers in URLs
  $('a[href*="page"]').each((_, el) => {
    const href = $(el).attr("href") || "";
    const pageMatch = href.match(/\/page\/(\d+)/i) || href.match(/[?&]page=(\d+)/i);
    if (pageMatch) {
      const num = parseInt(pageMatch[1]);
      if (!isNaN(num) && num > 0 && num < 100000) {
        pageNumbers.push(num);
      }
    }
  });

  // Check for "next" link
  const hasNext = $('a[rel="next"], a.next, .next-page a, a:contains("Next"), a:contains("»")').length > 0;

  if (pageNumbers.length > 0) {
    hasPages = true;
    lastPageNumber = Math.max(...pageNumbers);
    totalPages = lastPageNumber;
  } else if (hasNext) {
    hasPages = true;
  }

  // Try to find total pages from text like "Page 1 of 50"
  const bodyText = $('body').text();
  const totalMatch = bodyText.match(/page\s*\d+\s*(?:of|\/)\s*(\d+)/i);
  if (totalMatch) {
    const total = parseInt(totalMatch[1]);
    if (total > 0 && total < 100000) {
      totalPages = total;
      lastPageNumber = total;
      hasPages = true;
    }
  }

  return { hasPages, totalPages, lastPageNumber };
}

// Find explicit count on page
function findExplicitCount($: cheerio.CheerioAPI): number | null {
  const countPatterns = [
    /(\d{1,6})\s*(?:movies?|films?|posts?|items?|results?|total)/i,
    /(?:total|all|showing|found)\s*(?:of|:)?\s*(\d{1,6})/i,
    /(\d{1,6})\s*entries/i,
  ];

  // Check specific elements first
  const countElements = [
    '.total-count', '.movie-count', '.post-count', '.result-count',
    '#total-count', '[data-count]', '[data-total]', '.count',
  ];

  for (const selector of countElements) {
    const el = $(selector).first();
    if (el.length) {
      const text = el.text().trim();
      const match = text.match(/(\d{1,6})/);
      if (match) {
        const count = parseInt(match[1]);
        if (count > 0 && count < 1000000) return count;
      }
    }
  }

  // Check body text
  const bodyText = $('body').text();
  for (const pattern of countPatterns) {
    const match = bodyText.match(pattern);
    if (match) {
      const count = parseInt(match[1]);
      if (count > 10 && count < 1000000) return count;
    }
  }

  return null;
}

// Find categories on the page
function findCategories($: cheerio.CheerioAPI, baseUrl: string): { name: string; url: string; count?: number }[] {
  const categories: { name: string; url: string; count?: number }[] = [];
  const seen = new Set<string>();

  const categorySelectors = [
    'a[href*="/category/"]', 'a[href*="/genre/"]', 'a[href*="/tag/"]',
    '.category-list a', '.genre-list a', '.categories a', '.genres a',
    'nav a[href*="category"]', '.sidebar a[href*="category"]',
    'nav a[href*="genre"]', '.sidebar a[href*="genre"]',
    '.menu a[href*="genre"]', '.menu a[href*="category"]',
    'header a[href*="genre"]', 'header a[href*="category"]',
    // Common movie site categories
    'a[href*="bollywood"]', 'a[href*="hollywood"]', 'a[href*="south"]',
    'a[href*="dual-audio"]', 'a[href*="web-series"]', 'a[href*="netflix"]',
    'a[href*="hindi"]', 'a[href*="english"]', 'a[href*="tamil"]', 'a[href*="telugu"]',
  ];

  for (const selector of categorySelectors) {
    $(selector).each((_, el) => {
      const href = $(el).attr("href") || "";
      let name = $(el).text().trim();

      if (!href || !name || name.length < 2) return;
      if (/^\d{4}$/.test(name)) return; // Skip years

      // Skip if it's just navigation
      const nameLower = name.toLowerCase();
      if (['home', 'about', 'contact', 'dmca', 'login', 'register'].includes(nameLower)) return;

      let fullUrl = href;
      if (!href.startsWith("http")) {
        fullUrl = href.startsWith("/") ? baseUrl + href : baseUrl + "/" + href;
      }

      // Extract category name from URL if text is generic
      if (name.length < 3 || name === '»' || name === 'View more') {
        const urlPath = new URL(fullUrl).pathname;
        const pathParts = urlPath.split('/').filter(p => p && p.length > 2);
        if (pathParts.length > 0) {
          const lastPart = pathParts[pathParts.length - 1];
          name = lastPart.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
        }
      }

      // Extract count if present
      const countMatch = name.match(/\((\d+)\)/);
      const cleanName = name.replace(/\(\d+\)/, "").replace(/»/g, "").trim();

      if (cleanName.length > 1 && cleanName.length < 50 && !seen.has(cleanName.toLowerCase())) {
        seen.add(cleanName.toLowerCase());
        categories.push({
          name: cleanName,
          url: fullUrl,
          count: countMatch ? parseInt(countMatch[1]) : undefined,
        });
      }
    });
  }

  return categories;
}

// Find years on the page
function findYears($: cheerio.CheerioAPI, baseUrl: string): { year: string; url: string; count?: number }[] {
  const years: { year: string; url: string; count?: number }[] = [];
  const seen = new Set<string>();

  const yearSelectors = [
    'a[href*="/year/"]', 'a[href*="/release/"]', 'a[href*="/20"]', 'a[href*="/19"]',
    '.year-list a', '.years a', '.release-year a',
  ];

  for (const selector of yearSelectors) {
    $(selector).each((_, el) => {
      const href = $(el).attr("href") || "";
      const text = $(el).text().trim();

      const yearMatch = (href + " " + text).match(/\b(19|20)\d{2}\b/);
      if (!yearMatch) return;

      const year = yearMatch[0];
      if (seen.has(year)) return;

      let fullUrl = href;
      if (!href.startsWith("http")) {
        fullUrl = href.startsWith("/") ? baseUrl + href : baseUrl + "/" + href;
      }

      // Extract count if present
      const countMatch = text.match(/\((\d+)\)/);

      seen.add(year);
      years.push({
        year,
        url: fullUrl,
        count: countMatch ? parseInt(countMatch[1]) : undefined,
      });
    });
  }

  // Sort by year descending
  years.sort((a, b) => parseInt(b.year) - parseInt(a.year));

  return years;
}
