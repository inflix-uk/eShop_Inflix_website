/**
 * Single switch for URL shape site-wide.
 * Must stay in sync with `trailingSlash` in `next.config.ts`.
 */
export const SITE_USES_TRAILING_SLASH = true;

/**
 * Lowercase pathname + trailing-slash policy (same rules as middleware).
 * Use for client `location.pathname` / `history.replaceState` so URLs match canonical.
 */
export function normalizeSitePathname(pathname: string): string {
  const lower = pathname.toLowerCase();
  if (SITE_USES_TRAILING_SLASH) {
    if (lower === "/") return "/";
    const noTrailing = lower.replace(/\/+$/, "") || "/";
    if (noTrailing === "/") return "/";
    return noTrailing.endsWith("/") ? noTrailing : `${noTrailing}/`;
  }
  if (lower === "/") return "/";
  return lower.replace(/\/+$/, "") || "/";
}
