/**
 * Footer Page Service
 * Handles fetching footer pages from the backend API
 */

import { cache } from "react";
import { cmsServerFetch } from "@/app/lib/cmsServerFetch";

// Get API base URL from environment variable
// Make sure NEXT_PUBLIC_API_URL is set in your .env file
const getApiBaseUrl = (): string => {
  const apiUrl = process.env.NEXT_PUBLIC_API_URL;
  if (!apiUrl) {
    console.warn('NEXT_PUBLIC_API_URL is not set in environment variables. Using default.');
    return 'http://localhost:4000';
  }
  return apiUrl;
};

const API_BASE_URL = getApiBaseUrl();

// Export API_BASE_URL for use in other components if needed
export { API_BASE_URL };

export interface FooterPageBlock {
  type: 'text' | 'image';
  content: {
    url?: string;
    alt?: string;
    heading?: string;
    externalLink?: string;
    [key: string]: any;
  } | string; // For text blocks, content is a string (HTML)
}

export interface FooterPageColumn {
  width: number;
  blocks: FooterPageBlock[];
}

export interface FooterPageRow {
  columns: FooterPageColumn[];
}

export interface FooterPage {
  _id: string;
  title: string;
  slug: string;
  /** When set, live URL is /{categorySlug}/{slug}; otherwise /{slug}. */
  categorySlug?: string | null;
  blocks: FooterPageRow[];
  bannerImage?: string;
  bannerImageAlt?: string;
  bannerImageDescription?: string;
  metaTitle?: string;
  metaDescription?: string;
  metaTags?: string[];
  metaSchema?: string[];
  publishStatus?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface FooterPageResponse {
  success: boolean;
  data?: FooterPage;
  message?: string;
  requestedSlug?: string;
}

/**
 * Fetches a footer page by slug from the API
 * @param slug - The URL-friendly identifier (e.g., "terms-and-conditions")
 * @returns Promise with the footer page data or null if not found
 */
async function fetchFooterPageBySlugImpl(
  slug: string,
  categorySlug?: string | null
): Promise<FooterPage | null> {
  try {
    // URL encode the slug to handle special characters
    const encodedSlug = encodeURIComponent(slug);
    const qs =
      categorySlug && String(categorySlug).trim()
        ? `?categorySlug=${encodeURIComponent(String(categorySlug).trim())}`
        : "";
    const apiUrl = `${API_BASE_URL}/footer-pages/pagesBySlug/${encodedSlug}${qs}`;

    console.log(
      `[FooterPageService] Fetching page with slug: "${slug}"${categorySlug ? `, category: "${categorySlug}"` : ""} (encoded: "${encodedSlug}")`
    );
    console.log(`[FooterPageService] API URL: ${apiUrl}`);

    const response = await cmsServerFetch(apiUrl, {
      method: "GET",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
      },
    });

    const text = await response.text();
    const trimmed = text.trim();
    if (!trimmed) {
      console.warn(`[FooterPageService] Empty body for slug: "${slug}"`);
      return null;
    }
    let data: FooterPageResponse;
    try {
      data = JSON.parse(trimmed) as FooterPageResponse;
    } catch {
      console.warn(`[FooterPageService] Invalid JSON for slug: "${slug}"`);
      return null;
    }

    // Handle 404 response
    if (response.status === 404 || !data.success) {
      console.warn(
        `[FooterPageService] Page not found for slug: "${slug}".`,
        data.message ? `Message: ${data.message}` : '',
        data.requestedSlug ? `Requested slug: ${data.requestedSlug}` : ''
      );
      return null;
    }

    // Handle successful response
    if (data.success && data.data) {
      const page = data.data;
      console.log(
        `[FooterPageService] Successfully fetched page: "${page.title}" (slug: "${page.slug}", status: "${page.publishStatus || 'unknown'}")`
      );
      
      // Note: We return the page even if not published - let the component decide
      // This allows the component to show 404 for unpublished pages
      return page;
    }

    // Handle unexpected response format
    console.error('[FooterPageService] Unexpected response format:', data);
    return null;
  } catch (error) {
    console.error(`[FooterPageService] Error fetching footer page with slug "${slug}":`, error);
    return null;
  }
}

/** Dedupes within a single request (e.g. layout + generateMetadata). */
export const fetchFooterPageBySlug = cache(fetchFooterPageBySlugImpl);

/**
 * Uncached fetch using the same URL/base resolution as {@link fetchFooterPageBySlug}.
 * Use in RSC route guards so newly published pages are visible immediately and so
 * API base falls back to localhost when NEXT_PUBLIC_API_URL is unset (matches service default).
 */
export async function fetchFooterPageBySlugFresh(
  slug: string,
  categorySlug?: string | null
): Promise<FooterPage | null> {
  try {
    const encodedSlug = encodeURIComponent(slug);
    const qs =
      categorySlug && String(categorySlug).trim()
        ? `?categorySlug=${encodeURIComponent(String(categorySlug).trim())}`
        : "";
    const apiUrl = `${API_BASE_URL}/footer-pages/pagesBySlug/${encodedSlug}${qs}`;
    const response = await fetch(apiUrl, {
      method: "GET",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
      },
      cache: "no-store",
    });

    const text = await response.text();
    const trimmed = text.trim();
    if (!trimmed) return null;
    let data: FooterPageResponse;
    try {
      data = JSON.parse(trimmed) as FooterPageResponse;
    } catch {
      return null;
    }
    if (response.status === 404 || !data.success) return null;
    if (data.success && data.data) return data.data;
    return null;
  } catch {
    return null;
  }
}

/**
 * Fetches all footer pages from the API (useful for debugging)
 * @returns Promise with array of all footer pages
 */
export async function fetchAllFooterPages(): Promise<FooterPage[]> {
  try {
    const apiUrl = `${API_BASE_URL}/footer-pages/get/all/pages`;
    console.log(`[FooterPageService] Fetching all pages from: ${apiUrl}`);

    const response = await cmsServerFetch(apiUrl, {
      method: "GET",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      console.warn(
        `[FooterPageService] Failed to fetch all pages: ${response.status} ${response.statusText}`
      );
      return [];
    }

    const text = await response.text();
    const trimmed = text.trim();
    if (!trimmed) return [];

    let data: { success?: boolean; data?: FooterPage[] };
    try {
      data = JSON.parse(trimmed) as { success?: boolean; data?: FooterPage[] };
    } catch {
      return [];
    }

    if (data.success && Array.isArray(data.data)) {
      console.log(`[FooterPageService] Found ${data.data.length} footer pages`);
      return data.data;
    }

    return [];
  } catch (error) {
    console.error('[FooterPageService] Error fetching all footer pages:', error);
    return [];
  }
}

/**
 * Constructs the full image URL from a relative path
 * Handles various path formats from the backend API
 * @param url - The image URL (can be relative or absolute)
 * @returns The full image URL
 */
export function getImageUrl(url?: string): string {
  if (!url || url.trim() === '') {
    return '';
  }
  
  // Trim whitespace
  const trimmedUrl = url.trim();
  
  // 1. If URL is already absolute (http:// or https://), return as-is
  if (trimmedUrl.startsWith('http://') || trimmedUrl.startsWith('https://')) {
    return trimmedUrl;
  }
  
  // 2. If URL is a data URL, return as-is
  if (trimmedUrl.startsWith('data:')) {
    return trimmedUrl;
  }
  
  // 3. If URL starts with "/uploads/", prepend API_BASE_URL directly
  if (trimmedUrl.startsWith('/uploads/')) {
    const fullUrl = `${API_BASE_URL}${trimmedUrl}`;
    if (process.env.NODE_ENV === 'development') {
      console.log(`[getImageUrl] /uploads/ path: ${trimmedUrl} → ${fullUrl}`);
    }
    return fullUrl;
  }
  
  // 4. If URL starts with "/" (but not "/uploads/"), remove leading slash and prepend API_BASE_URL/uploads/
  if (trimmedUrl.startsWith('/')) {
    // Remove leading slash
    const pathWithoutSlash = trimmedUrl.substring(1);
    const fullUrl = `${API_BASE_URL}/uploads/${pathWithoutSlash}`;
    if (process.env.NODE_ENV === 'development') {
      console.log(`[getImageUrl] Absolute path: ${trimmedUrl} → ${fullUrl}`);
    }
    return fullUrl;
  }
  
  // 5. If URL doesn't start with "/" or "http", prepend API_BASE_URL/uploads/ directly
  const fullUrl = `${API_BASE_URL}/uploads/${trimmedUrl}`;
  if (process.env.NODE_ENV === 'development') {
    console.log(`[getImageUrl] Relative path: ${trimmedUrl} → ${fullUrl}`);
  }
  return fullUrl;
}
