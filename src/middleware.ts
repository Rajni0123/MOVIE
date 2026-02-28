import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// Domain settings cache
let domainCache: {
  primaryDomain: string;
  oldDomains: string[];
  redirectEnabled: boolean;
  lastFetched: number;
} | null = null;

const CACHE_TTL = 60 * 1000; // 1 minute cache

async function getDomainSettings(request: NextRequest) {
  const now = Date.now();

  // Return cached settings if valid
  if (domainCache && (now - domainCache.lastFetched) < CACHE_TTL) {
    return domainCache;
  }

  try {
    // Build absolute URL for internal API call
    const protocol = request.headers.get("x-forwarded-proto") || "https";
    const host = request.headers.get("host") || "localhost:3000";
    const apiUrl = `${protocol}://${host}/api/settings/domains`;

    const res = await fetch(apiUrl, {
      headers: {
        "Content-Type": "application/json",
      },
      // Don't wait too long - fall back to no redirect
      signal: AbortSignal.timeout(2000),
    });

    if (res.ok) {
      const data = await res.json();
      if (data.success) {
        domainCache = {
          primaryDomain: data.data.primaryDomain,
          oldDomains: data.data.oldDomains,
          redirectEnabled: data.data.redirectEnabled,
          lastFetched: now,
        };
        return domainCache;
      }
    }
  } catch (error) {
    // If fetch fails, use cached data or defaults
    console.error("Failed to fetch domain settings:", error);
  }

  // Return cached or defaults
  return domainCache || {
    primaryDomain: "",
    oldDomains: [],
    redirectEnabled: false,
    lastFetched: now,
  };
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const host = request.headers.get("host") || "";

  // Skip API routes and static files
  if (
    pathname.startsWith("/api/") ||
    pathname.startsWith("/_next/") ||
    pathname.startsWith("/static/") ||
    pathname.includes(".") // Static files like .ico, .png, etc.
  ) {
    return NextResponse.next();
  }

  // Get domain settings
  const settings = await getDomainSettings(request);

  // Skip if redirect not enabled or no primary domain set
  if (!settings.redirectEnabled || !settings.primaryDomain) {
    return NextResponse.next();
  }

  // Extract hostname without port
  const currentHost = host.split(":")[0];
  const primaryHost = settings.primaryDomain.replace(/^https?:\/\//, "").split(":")[0];

  // Check if current domain is in old domains list
  const isOldDomain = settings.oldDomains.some(oldDomain => {
    const oldHost = oldDomain.replace(/^https?:\/\//, "").split(":")[0];
    return currentHost === oldHost;
  });

  // Redirect old domain to primary domain
  if (isOldDomain && currentHost !== primaryHost) {
    const newUrl = new URL(request.url);
    newUrl.host = primaryHost;
    newUrl.protocol = "https:";

    // 301 permanent redirect for SEO
    return NextResponse.redirect(newUrl, { status: 301 });
  }

  return NextResponse.next();
}

// Only run middleware on non-static routes
export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico, robots.txt, sitemap.xml (static files)
     */
    "/((?!api|_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml).*)",
  ],
};
