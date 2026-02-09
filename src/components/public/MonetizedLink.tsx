"use client";

import { ReactNode } from "react";

interface MonetizedLinkProps {
  href: string;
  children: ReactNode;
  className?: string;
  monetizationUrl?: string;
  excludeDomains?: string[];
  enabled?: boolean;
}

// Check if URL should be excluded from monetization
function shouldExclude(url: string, excludeDomains: string[]): boolean {
  if (!excludeDomains || excludeDomains.length === 0) return false;
  
  try {
    const urlObj = new URL(url);
    const hostname = urlObj.hostname.toLowerCase();
    
    return excludeDomains.some(domain => {
      const cleanDomain = domain.toLowerCase().trim();
      if (cleanDomain.startsWith("*.")) {
        // Wildcard domain
        return hostname.endsWith(cleanDomain.slice(2));
      }
      return hostname === cleanDomain || hostname.endsWith("." + cleanDomain);
    });
  } catch {
    return false;
  }
}

// Create monetized URL
function createMonetizedUrl(originalUrl: string, monetizationUrl: string): string {
  try {
    // Encode the original URL: encodeURIComponent -> btoa (base64)
    const encoded = btoa(encodeURIComponent(originalUrl));
    
    // Ensure monetization URL ends with /
    const baseUrl = monetizationUrl.endsWith("/") 
      ? monetizationUrl 
      : monetizationUrl + "/";
    
    return `${baseUrl}token.php?post=${encoded}`;
  } catch {
    return originalUrl;
  }
}

export function MonetizedLink({
  href,
  children,
  className,
  monetizationUrl,
  excludeDomains = [],
  enabled = false,
}: MonetizedLinkProps) {
  // Determine final URL
  let finalUrl = href;
  
  if (enabled && monetizationUrl && href) {
    // Check if this domain should be excluded
    if (!shouldExclude(href, excludeDomains)) {
      finalUrl = createMonetizedUrl(href, monetizationUrl);
    }
  }
  
  return (
    <a
      href={finalUrl}
      target="_blank"
      rel="noopener noreferrer"
      className={className}
    >
      {children}
    </a>
  );
}

// Hook to get monetized URL (for use outside component)
export function useMonetizedUrl(
  originalUrl: string,
  monetizationUrl?: string,
  excludeDomains?: string[],
  enabled?: boolean
): string {
  if (!enabled || !monetizationUrl || !originalUrl) {
    return originalUrl;
  }
  
  if (shouldExclude(originalUrl, excludeDomains || [])) {
    return originalUrl;
  }
  
  return createMonetizedUrl(originalUrl, monetizationUrl);
}
