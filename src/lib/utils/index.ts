import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

/**
 * Utility function for merging Tailwind CSS classes
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Format date for display
 */
export function formatDate(date: Date | string | null | undefined): string {
  if (!date) return "N/A";
  
  const d = new Date(date);
  if (isNaN(d.getTime())) return "N/A";
  
  return d.toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

/**
 * Format runtime in minutes to hours and minutes
 */
export function formatRuntime(minutes: number | null | undefined): string {
  if (!minutes) return "N/A";
  
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  
  if (hours === 0) return `${mins}m`;
  if (mins === 0) return `${hours}h`;
  
  return `${hours}h ${mins}m`;
}

/**
 * Truncate text to a maximum length
 */
export function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength - 3) + "...";
}

/**
 * Generate meta description from movie description
 */
export function generateMetaDescription(description: string, maxLength = 155): string {
  if (!description) return "";

  // Clean out structured metadata that shouldn't be in meta description
  let cleaned = description
    .replace(/IMDb Rating:\s*[\d.]+\/10/gi, "")
    .replace(/Genre:\s*[^.]+/gi, "")
    .replace(/Director:\s*[^.]+/gi, "")
    .replace(/Release Date:\s*[^.]+/gi, "")
    .replace(/Star Cast:\s*[^.]+/gi, "")
    .replace(/Movie Name:\s*[^.]+/gi, "")
    .replace(/Quality:\s*[^.]+/gi, "")
    .replace(/Language:\s*[^.]+/gi, "")
    .replace(/Size:\s*[^.]+/gi, "")
    .replace(/Format:\s*[^.]+/gi, "")
    .replace(/\s+/g, " ")
    .trim();

  // Try to extract story/synopsis if present
  const storyMatch = cleaned.match(/(?:Movie Story|Story|Synopsis|Plot)[:\s]+(.+)/i);
  if (storyMatch && storyMatch[1] && storyMatch[1].length > 50) {
    cleaned = storyMatch[1].trim();
  }

  return truncateText(cleaned, maxLength);
}

/**
 * Generate SEO-friendly meta description from movie data
 */
export function generateSeoDescription(
  title: string,
  description?: string,
  genres?: string[],
  year?: string | number,
  maxLength = 155
): string {
  // If we have a good description, use it
  if (description && description.length > 50) {
    const cleaned = generateMetaDescription(description, maxLength);
    // Check if cleaned description is still good
    if (cleaned.length > 50 && !cleaned.match(/rating|genre|director|release|cast/i)) {
      return cleaned;
    }
  }

  // Generate SEO description from movie data
  const genreStr = genres?.length ? genres.slice(0, 2).join(" & ") : "";
  const yearStr = year ? ` (${year})` : "";

  if (genreStr) {
    return truncateText(
      `Download ${title}${yearStr} full movie in HD. Watch this ${genreStr.toLowerCase()} film online free. Available in 480p, 720p, 1080p quality with dual audio.`,
      maxLength
    );
  }

  return truncateText(
    `Download ${title}${yearStr} full movie in HD quality. Watch online free in 480p, 720p, 1080p with Hindi & English audio.`,
    maxLength
  );
}

/**
 * Generate meta title for movie
 */
export function generateMetaTitle(title: string, year?: number | string): string {
  const yearStr = year ? ` (${year})` : "";
  return `Download ${title}${yearStr} - Full Movie | MovPix`;
}

/**
 * Delay execution for specified milliseconds
 */
export function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Parse JSON safely with fallback
 */
export function safeJsonParse<T>(json: string, fallback: T): T {
  try {
    return JSON.parse(json) as T;
  } catch {
    return fallback;
  }
}
