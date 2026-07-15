import { slimBlogForCard } from "@/app/lib/slimBlogForCard";
import type { Blog } from "../../../types";

const API_URL = process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, "") || "";

/**
 * Server-side function to prefetch latest blogs for SSR.
 */
export async function prefetchLatestBlogs(limit: number = 6): Promise<Blog[]> {
  if (!API_URL) return [];

  const clampedLimit = Math.min(12, Math.max(1, limit));

  try {
    const res = await fetch(`${API_URL}/get/blog/latest`, {
      next: { revalidate: 300 },
      headers: { Accept: "application/json" },
    });

    if (!res.ok) return [];

    const data = await res.json().catch(() => ({}));
    const raw = Array.isArray(data?.data) ? data.data : [];
    
    return raw
      .slice(0, clampedLimit)
      .map((row: Record<string, unknown>) => slimBlogForCard(row) as unknown as Blog);
  } catch {
    return [];
  }
}
