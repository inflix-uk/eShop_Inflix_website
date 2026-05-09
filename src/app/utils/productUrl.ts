/**
 * Strip trailing 13-digit numeric timestamps from product URL slugs.
 * e.g. "luxury-hilton-car-air-freshener-vent-clip-1776179916702"
 *    → "luxury-hilton-car-air-freshener-vent-clip"
 *
 * Leaves URLs that don't end with a 13-digit segment untouched.
 */
export function cleanProductSlug(slug: string | undefined | null): string {
  if (!slug) return "";
  return slug.replace(/-\d{13}$/, "");
}

function normalizePreferredOrigin(raw: string): string {
  const input = String(raw || "").trim();
  if (!input) return "";
  const withProtocol = /^https?:\/\//i.test(input) ? input : `https://${input}`;
  try {
    const url = new URL(withProtocol);
    // Production preference: avoid protocol/domain flip on hover by forcing canonical https + non-www.
    if (!/localhost|127\.0\.0\.1/i.test(url.hostname)) {
      url.protocol = "https:";
      url.hostname = url.hostname.replace(/^www\./i, "");
    }
    return `${url.protocol}//${url.host}`.replace(/\/+$/, "");
  } catch {
    return "";
  }
}

export function getPreferredSiteOrigin(): string {
  return normalizePreferredOrigin(
    process.env.NEXT_PUBLIC_SITE_URL || process.env.NEXT_PUBLIC_BASE_URL || ""
  );
}

export function buildProductHref(slug: string | undefined | null): string {
  const clean = cleanProductSlug(slug);
  const path = `/products/${clean}`;
  const origin = getPreferredSiteOrigin();
  return origin ? `${origin}${path}` : path;
}
