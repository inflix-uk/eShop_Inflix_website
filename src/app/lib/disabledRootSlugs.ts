/**
 * Root `/[slug]` URLs that are intentionally off (legacy pages moved to `_disabled_*`).
 * Server returns 404 immediately; Trustpilot strip is hidden on these paths via
 * `slugPagesWithoutTopBar`.
 */
/** Empty = no root slugs are hard-blocked; CMS `[slug]` can serve any published page. */
export const DISABLED_ROOT_SLUGS = new Set<string>([]);

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
