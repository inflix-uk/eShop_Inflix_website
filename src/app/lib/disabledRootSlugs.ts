/**
 * Root `/[slug]` URLs that are intentionally off (legacy pages moved to `_disabled_*`).
 * Server returns 404 immediately; Trustpilot strip is hidden on these paths via
 * `slugPagesWithoutTopBar`.
 */
export const DISABLED_ROOT_SLUGS = new Set([
  "terms-and-conditions",
  "refund-and-return-policy",
  /** Explicit `(routes)/contact-us` uses `notFound()`; still hide top strip on that URL. */
  "contact-us",
]);

export function isDisabledRootSlug(slug: string): boolean {
  if (!slug) return false;
  try {
    return DISABLED_ROOT_SLUGS.has(
      decodeURIComponent(slug).toLowerCase().trim()
    );
  } catch {
    return false;
  }
}
