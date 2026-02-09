import slugify from "slugify";

/**
 * Generate a URL-friendly slug from a movie title and optional year
 * @param title - Movie title
 * @param year - Optional release year
 * @returns URL-friendly slug
 */
export function generateSlug(title: string, year?: number | string): string {
  const baseSlug = slugify(title, {
    lower: true,
    strict: true,
    trim: true,
  });

  if (year) {
    return `${baseSlug}-${year}`;
  }

  return baseSlug;
}

/**
 * Generate a unique slug by appending a counter if needed
 * @param title - Movie title
 * @param year - Optional release year
 * @param existingSlugs - Array of existing slugs to check against
 * @returns Unique slug
 */
export function generateUniqueSlug(
  title: string,
  year?: number | string,
  existingSlugs: string[] = []
): string {
  const baseSlug = generateSlug(title, year);
  
  if (!existingSlugs.includes(baseSlug)) {
    return baseSlug;
  }

  let counter = 1;
  let uniqueSlug = `${baseSlug}-${counter}`;
  
  while (existingSlugs.includes(uniqueSlug)) {
    counter++;
    uniqueSlug = `${baseSlug}-${counter}`;
  }

  return uniqueSlug;
}

/**
 * Extract year from a release date string
 * @param releaseDate - Date string in various formats
 * @returns Year as number or undefined
 */
export function extractYear(releaseDate?: string | Date): number | undefined {
  if (!releaseDate) return undefined;
  
  const date = new Date(releaseDate);
  const year = date.getFullYear();
  
  return isNaN(year) ? undefined : year;
}
