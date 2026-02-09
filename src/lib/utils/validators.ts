import { MovieFormData } from "@/types/movie";
import { ScrapingSourceFormData } from "@/types/scraping";

export interface ValidationError {
  field: string;
  message: string;
}

export interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
}

/**
 * Validate movie form data
 */
export function validateMovieData(data: Partial<MovieFormData>): ValidationResult {
  const errors: ValidationError[] = [];

  if (!data.title || data.title.trim().length === 0) {
    errors.push({ field: "title", message: "Title is required" });
  } else if (data.title.length > 500) {
    errors.push({ field: "title", message: "Title must be less than 500 characters" });
  }

  if (data.rating !== undefined) {
    if (data.rating < 0 || data.rating > 10) {
      errors.push({ field: "rating", message: "Rating must be between 0 and 10" });
    }
  }

  if (data.runtime !== undefined) {
    if (data.runtime < 0 || data.runtime > 1000) {
      errors.push({ field: "runtime", message: "Runtime must be between 0 and 1000 minutes" });
    }
  }

  if (data.posterUrl && !isValidUrl(data.posterUrl)) {
    errors.push({ field: "posterUrl", message: "Invalid poster URL" });
  }

  if (data.backdropUrl && !isValidUrl(data.backdropUrl)) {
    errors.push({ field: "backdropUrl", message: "Invalid backdrop URL" });
  }

  if (data.trailerUrl && !isValidUrl(data.trailerUrl)) {
    errors.push({ field: "trailerUrl", message: "Invalid trailer URL" });
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

/**
 * Validate scraping source form data
 */
export function validateScrapingSource(data: Partial<ScrapingSourceFormData>): ValidationResult {
  const errors: ValidationError[] = [];

  if (!data.name || data.name.trim().length === 0) {
    errors.push({ field: "name", message: "Name is required" });
  }

  if (!data.baseUrl || data.baseUrl.trim().length === 0) {
    errors.push({ field: "baseUrl", message: "Base URL is required" });
  } else if (!isValidUrl(data.baseUrl)) {
    errors.push({ field: "baseUrl", message: "Invalid base URL" });
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

/**
 * Validate email format
 */
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Validate URL format
 */
export function isValidUrl(url: string): boolean {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
}

/**
 * Sanitize string for safe storage
 */
export function sanitizeString(str: string): string {
  return str.trim().replace(/[<>]/g, "");
}

/**
 * Validate pagination parameters
 */
export function validatePagination(page?: number, pageSize?: number): { page: number; pageSize: number } {
  const validPage = Math.max(1, Math.floor(page || 1));
  const validPageSize = Math.min(100, Math.max(1, Math.floor(pageSize || 20)));
  
  return { page: validPage, pageSize: validPageSize };
}
