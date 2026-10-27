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

/** mailto:, tel:, #anchor, //cdn, and other non-http schemes. http(s) is handled separately. */
const SPECIAL_HREF = /^(?:[a-z][a-z0-9+.-]*:|\/\/)/i;

function addHostVariants(hosts: Set<string>, raw: string | undefined) {
  const value = String(raw ?? "").trim();
  if (!value) return;
  try {
    const url = new URL(/^https?:\/\//i.test(value) ? value : `https://${value}`);
    const host = url.hostname.toLowerCase();
    hosts.add(host);
    if (host.startsWith("www.")) hosts.add(host.slice(4));
    else if (host.includes(".")) hosts.add(`www.${host}`);
  } catch {
    /* ignore invalid host config */
  }
}

/**
 * Hosts whose absolute URLs are still internal pages.
 * CMS HTML often stores `https://aromadesire.com/categories/...` even when local env points elsewhere.
 */
function internalHostnames(): Set<string> {
  const hosts = new Set<string>();
  addHostVariants(hosts, process.env.NEXT_PUBLIC_SITE_URL);
  addHostVariants(hosts, process.env.NEXT_PUBLIC_BASE_URL);
  addHostVariants(hosts, process.env.FRONTEND_URL);
  addHostVariants(hosts, process.env.NEXT_PUBLIC_SITEMAP_STORE_DOMAIN);
  addHostVariants(hosts, process.env.NEXT_PUBLIC_SITEMAP_HOST);
  addHostVariants(hosts, "aromadesire.com");
  addHostVariants(hosts, "aromadesire.co.uk");
  if (typeof window !== "undefined") addHostVariants(hosts, window.location.hostname);
  return hosts;
}

/** Keep the same origin. Add the site trailing slash on same-site absolute page URLs. */
function normalizeSameSiteAbsoluteHref(value: string): string {
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    return value;
  }
  if (!internalHostnames().has(url.hostname.toLowerCase())) return value;

  let path = url.pathname || "/";
  if (!looksLikeFilePath(path)) {
    if (SITE_USES_TRAILING_SLASH) {
      if (path !== "/" && !path.endsWith("/")) path = `${path}/`;
    } else if (path !== "/") {
      path = path.replace(/\/+$/, "") || "/";
    }
  }
  return `${url.origin}${path}${url.search}${url.hash}`;
}

function splitHrefSuffix(value: string): { path: string; suffix: string } {
  const hash = value.indexOf("#");
  const query = value.indexOf("?");
  let cut = value.length;
  if (hash >= 0) cut = Math.min(cut, hash);
  if (query >= 0) cut = Math.min(cut, query);
  return { path: value.slice(0, cut), suffix: value.slice(cut) };
}

function looksLikeFilePath(path: string): boolean {
  const last = path.split("/").filter(Boolean).pop() || "";
  return /\.[a-z0-9]{1,8}$/i.test(last);
}

/**
 * CMS internal links are often saved without a leading `/` (`about-us`) and,
 * because this site uses trailing slashes, without a closing `/` (`/about-us`).
 * Both are added at render time so the admin value does not need a manual edit.
 * External, mailto, tel, hash-only, protocol-relative, and file URLs are unchanged.
 */
export function normalizeInternalHref(raw: string): string {
  const value = String(raw ?? "").trim();
  if (!value || value === "#") return value;
  if (/^https?:\/\//i.test(value)) return normalizeSameSiteAbsoluteHref(value);
  if (
    value.startsWith("#") ||
    value.startsWith("?") ||
    value.startsWith("./") ||
    value.startsWith("../") ||
    SPECIAL_HREF.test(value)
  ) {
    return value;
  }

  const { path: rawPath, suffix } = splitHrefSuffix(value);
  let path = rawPath.startsWith("/") ? rawPath : `/${rawPath}`;

  if (looksLikeFilePath(path)) {
    return `${path}${suffix}`;
  }

  if (SITE_USES_TRAILING_SLASH) {
    if (path !== "/" && !path.endsWith("/")) path = `${path}/`;
  } else if (path !== "/") {
    path = path.replace(/\/+$/, "") || "/";
  }

  return `${path}${suffix}`;
}

/** Rewrite `<a href>` values inside admin HTML. Image `src` is left alone. */
export function rewriteInternalHrefsInHtml(html: string): string {
  const source = String(html ?? "");
  if (!source || !/href\s*=/i.test(source)) return source;
  return source.replace(
    /(\bhref\s*=\s*)(["'])([^"']*)\2/gi,
    (match, prefix: string, quote: string, url: string) => {
      const next = normalizeInternalHref(url);
      if (next === url) return match;
      return `${prefix}${quote}${next}${quote}`;
    }
  );
}
