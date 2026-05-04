import { isDisabledRootSlug } from "@/app/lib/disabledRootSlugs";

const SLUGS_WITHOUT_TOPBAR = new Set([
  "about-us",
  "refund-policy",
  "terms-of-service",
]);

export function slugHidesTopBar(slug: string): boolean {
  if (!slug) return false;
  try {
    const normalized = decodeURIComponent(slug).toLowerCase().trim();
    return (
      SLUGS_WITHOUT_TOPBAR.has(normalized) || isDisabledRootSlug(normalized)
    );
  } catch {
    return false;
  }
}

/** For client layouts (loading / error) where only pathname is available. */
export function pathnameHidesTopBarForSlugRoute(pathname: string | null): boolean {
  if (!pathname) return false;
  const parts = pathname.split("/").filter(Boolean);
  if (parts[0]?.toLowerCase() === "footer-pages" && parts[1]) {
    return slugHidesTopBar(parts[1]);
  }
  /** /category/page-slug CMS routes — use page slug (second segment). */
  if (parts.length >= 2) {
    return slugHidesTopBar(parts[1]);
  }
  const segment = parts[0];
  return segment ? slugHidesTopBar(segment) : false;
}
