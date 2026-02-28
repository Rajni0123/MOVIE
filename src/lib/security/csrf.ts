/**
 * CSRF Protection using Origin/Referer header validation
 * Works alongside SameSite cookies for defense in depth
 */

import { NextRequest } from "next/server";

/**
 * Validate request origin to prevent CSRF attacks
 * Returns true if request is safe, false if potentially malicious
 */
export function validateCsrf(request: NextRequest): boolean {
  // Only check for state-changing methods
  const method = request.method.toUpperCase();
  if (["GET", "HEAD", "OPTIONS"].includes(method)) {
    return true;
  }

  // Get the host from the request
  const host = request.headers.get("host");
  if (!host) {
    return false;
  }

  // Check Origin header first (more reliable)
  const origin = request.headers.get("origin");
  if (origin) {
    try {
      const originUrl = new URL(origin);
      // Allow if origin matches the host
      if (originUrl.host === host) {
        return true;
      }
      // Allow localhost in development
      if (process.env.NODE_ENV === "development") {
        if (originUrl.hostname === "localhost" || originUrl.hostname === "127.0.0.1") {
          return true;
        }
      }
      return false;
    } catch {
      return false;
    }
  }

  // Fallback to Referer header
  const referer = request.headers.get("referer");
  if (referer) {
    try {
      const refererUrl = new URL(referer);
      if (refererUrl.host === host) {
        return true;
      }
      // Allow localhost in development
      if (process.env.NODE_ENV === "development") {
        if (refererUrl.hostname === "localhost" || refererUrl.hostname === "127.0.0.1") {
          return true;
        }
      }
      return false;
    } catch {
      return false;
    }
  }

  // If neither Origin nor Referer is present, block the request
  // (Most browsers send at least one for form submissions)
  // Exception: Allow if it's an API call with proper auth header
  const authHeader = request.headers.get("authorization");
  if (authHeader && authHeader.startsWith("Bearer ")) {
    return true;
  }

  // Also allow if auth cookie is present (for same-site requests)
  const authCookie = request.cookies.get("auth_token");
  if (authCookie) {
    // SameSite=Lax already provides protection
    return true;
  }

  return false;
}

/**
 * CSRF protection wrapper for API routes
 * Use this to protect sensitive endpoints
 */
export function withCsrfProtection<T>(
  handler: (request: NextRequest) => Promise<T>
): (request: NextRequest) => Promise<T | Response> {
  return async (request: NextRequest) => {
    if (!validateCsrf(request)) {
      return new Response(
        JSON.stringify({ success: false, error: "CSRF validation failed" }),
        { status: 403, headers: { "Content-Type": "application/json" } }
      );
    }
    return handler(request);
  };
}
