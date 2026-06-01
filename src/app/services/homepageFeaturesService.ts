/**
 * Homepage Features Service
 * Fetches the homepage features section from the backend API
 */

import { cache } from "react";
import { cmsServerFetchJson } from "@/app/lib/cmsServerFetch";

// Get API base URL from environment variable
const getApiBaseUrl = (): string => {
  const apiUrl = process.env.NEXT_PUBLIC_API_URL;
  if (!apiUrl) {
    console.warn(
      "NEXT_PUBLIC_API_URL is not set in environment variables. Using default."
    );
    return `${process.env.NEXT_PUBLIC_API_URL}`;
  }
  return apiUrl;
};

const API_BASE_URL = getApiBaseUrl();

export interface HomepageFeature {
  _id: string;
  title: string;
  subtitle: string;
  iconImage?: string | null;
  order?: number;
  isActive?: boolean;
}

export interface HomepageFeaturesResponse {
  success: boolean;
  data: HomepageFeature[] | null;
  message?: string;
}

/**
 * Constructs the full image URL from a relative path for feature icons.
 * Handles various path formats from the backend API.
 * CRITICAL: Prepends /uploads/ if path starts with /homepage-features/ but not /uploads/
 */
export const getFeatureImageUrl = (
  imagePath: string | undefined | null
): string | null => {
  if (!imagePath || imagePath.trim() === "") {
    return null;
  }

  const trimmedPath = imagePath.trim();

  // If already a full URL, return as-is
  if (
    trimmedPath.startsWith("http://") ||
    trimmedPath.startsWith("https://")
  ) {
    return trimmedPath;
  }

  // If data URL, return as-is
  if (trimmedPath.startsWith("data:")) {
    return trimmedPath;
  }

  const baseUrl = API_BASE_URL.endsWith("/")
    ? API_BASE_URL.slice(0, -1)
    : API_BASE_URL;
  let path = trimmedPath.startsWith("/") ? trimmedPath : `/${trimmedPath}`;

  // CRITICAL: If path starts with /homepage-features/ but not /uploads/homepage-features/, prepend /uploads/
  if (
    path.startsWith("/homepage-features/") &&
    !path.startsWith("/uploads/homepage-features/")
  ) {
    path = `/uploads${path}`;
  }
  // If path doesn't start with /uploads/ at all, prepend it
  else if (!path.startsWith("/uploads/")) {
    path = `/uploads${path}`;
  }

  return `${baseUrl}${path}`;
};

/**
 * Fetches homepage features from the API (ISR-aligned server fetch).
 * @returns Promise with array of active features sorted by order, or [] on error
 */
export const getHomepageFeatures = cache(async (): Promise<HomepageFeature[]> => {
  const base = API_BASE_URL.replace(/\/$/, "");
  if (!base) return [];

  try {
    const data = await cmsServerFetchJson<HomepageFeaturesResponse>(
      `${base}/get/homepage-features/active`
    );

    if (data.success && Array.isArray(data.data) && data.data.length > 0) {
      return data.data
        .filter((f) => f.isActive !== false)
        .sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
    }

    return [];
  } catch (error) {
    console.warn("[HomepageFeatures] fetch failed:", error);
    return [];
  }
});
