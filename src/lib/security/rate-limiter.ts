/**
 * Simple in-memory rate limiter for API endpoints
 * Tracks requests per IP and enforces limits
 */

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

const rateLimitStore = new Map<string, RateLimitEntry>();

// Clean up expired entries every 5 minutes
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of rateLimitStore.entries()) {
    if (entry.resetAt < now) {
      rateLimitStore.delete(key);
    }
  }
}, 5 * 60 * 1000);

export interface RateLimitConfig {
  maxRequests: number;    // Max requests allowed
  windowMs: number;       // Time window in milliseconds
  keyPrefix?: string;     // Prefix for rate limit key
}

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetAt: number;
  retryAfter?: number;    // Seconds until reset (only if blocked)
}

/**
 * Check rate limit for a given identifier (usually IP address)
 */
export function checkRateLimit(
  identifier: string,
  config: RateLimitConfig
): RateLimitResult {
  const key = `${config.keyPrefix || "rl"}:${identifier}`;
  const now = Date.now();

  let entry = rateLimitStore.get(key);

  // If no entry or expired, create new one
  if (!entry || entry.resetAt < now) {
    entry = {
      count: 1,
      resetAt: now + config.windowMs,
    };
    rateLimitStore.set(key, entry);

    return {
      allowed: true,
      remaining: config.maxRequests - 1,
      resetAt: entry.resetAt,
    };
  }

  // Increment count
  entry.count++;

  // Check if over limit
  if (entry.count > config.maxRequests) {
    const retryAfter = Math.ceil((entry.resetAt - now) / 1000);
    return {
      allowed: false,
      remaining: 0,
      resetAt: entry.resetAt,
      retryAfter,
    };
  }

  return {
    allowed: true,
    remaining: config.maxRequests - entry.count,
    resetAt: entry.resetAt,
  };
}

/**
 * Get client IP from request headers
 */
export function getClientIP(request: Request): string {
  // Check various headers for real IP (behind proxy/CDN)
  const forwardedFor = request.headers.get("x-forwarded-for");
  if (forwardedFor) {
    return forwardedFor.split(",")[0].trim();
  }

  const realIP = request.headers.get("x-real-ip");
  if (realIP) {
    return realIP;
  }

  const cfConnectingIP = request.headers.get("cf-connecting-ip");
  if (cfConnectingIP) {
    return cfConnectingIP;
  }

  return "unknown";
}

// Predefined rate limit configs
export const RATE_LIMITS = {
  // Login: 5 attempts per 15 minutes
  login: {
    maxRequests: 5,
    windowMs: 15 * 60 * 1000,
    keyPrefix: "login",
  },
  // Forgot password: 3 requests per hour
  forgotPassword: {
    maxRequests: 3,
    windowMs: 60 * 60 * 1000,
    keyPrefix: "forgot",
  },
  // API general: 100 requests per minute
  api: {
    maxRequests: 100,
    windowMs: 60 * 1000,
    keyPrefix: "api",
  },
  // Search: 30 requests per minute
  search: {
    maxRequests: 30,
    windowMs: 60 * 1000,
    keyPrefix: "search",
  },
  // Scraping: 10 jobs per hour
  scraping: {
    maxRequests: 10,
    windowMs: 60 * 60 * 1000,
    keyPrefix: "scrape",
  },
} as const;
