import { headers } from "next/headers";
import { SITE_USES_TRAILING_SLASH } from "./siteTrailingSlash";

/**
 * When set, canonical URLs never call `headers()` — avoids forcing the whole app
 * dynamic (Next adds `Cache-Control: no-store` on HTML), which blocks bfcache.
 */
function tryPublicSiteOriginFromEnv(): string | null {
  const raw = String(
    process.env.NEXT_PUBLIC_SITE_URL ||
      process.env.NEXT_PUBLIC_BASE_URL ||
      process.env.FRONTEND_URL ||
      (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "") ||
      ""
  ).trim();
  if (!raw) return null;
  try {
    const u = new URL(/^https?:\/\//i.test(raw) ? raw : `https://${raw}`);
    return u.origin;
  } catch {
    return null;
  }
}

/**
 * Normalize path (lowercase; trailing slash matches `SITE_USES_TRAILING_SLASH` / `next.config` trailingSlash).
 */
export function normalizeCanonicalPath(path: string): string {
  const raw = String(path ?? "").trim();

  const noQueryHash = raw.split("?")[0]?.split("#")[0] ?? "";
  if (!noQueryHash || noQueryHash === "/") {
    return SITE_USES_TRAILING_SLASH ? "/" : "";
  }

  let out = noQueryHash.toLowerCase();

  out = out.startsWith("/") ? out : `/${out}`;

  while (out.length > 1 && out.endsWith("/")) {
    out = out.slice(0, -1);
  }

  if (SITE_USES_TRAILING_SLASH && out !== "/") {
    out = `${out}/`;
  }

  return out;
}

/**
 * Canonical URL for the storefront. Prefers `NEXT_PUBLIC_SITE_URL` / `NEXT_PUBLIC_BASE_URL`
 * so RSC does not depend on `headers()` (which opts all pages out of back/forward cache).
 */
export async function getCanonical(path: string = ""): Promise<string> {
  const fromEnv = tryPublicSiteOriginFromEnv();
  if (fromEnv) {
    const base = fromEnv.replace(/\/$/, "");
    const safePath = normalizeCanonicalPath(path);
    return `${base}${safePath}`;
  }

  const h = await headers();

  const firstHeaderValue = (value: string | null): string =>
    (value ?? "")
      .split(",")[0]
      ?.trim() ?? "";

  const forwardedHost = firstHeaderValue(h.get("x-forwarded-host"));
  const directHost = firstHeaderValue(h.get("host"));
  const originalHost = firstHeaderValue(h.get("x-original-host"));

  const isVercelPreviewHost = (value: string): boolean =>
    /\.vercel\.app$/i.test(value) || /\.now\.sh$/i.test(value);

  // Prefer the direct/custom host when forwarded host is a preview domain.
  // This prevents canonicals on custom domains from resolving to *.vercel.app.
  const host =
    originalHost ||
    (isVercelPreviewHost(forwardedHost) && directHost
      ? directHost
      : forwardedHost || directHost);

  if (!host) {
    console.error("[getCanonical] Missing host header");
    return ""; // fail-safe
  }

  // Keep host as requested (including www.) so rel=canonical matches the browser
  // URL and audit tools. Prefer HTTP→HTTPS / www→apex redirects in middleware or
  // the edge platform if you need a single host variant.

  const protoHeader = h.get("x-forwarded-proto")?.split(",")[0]?.trim();

  const isLocal =
    host.includes("localhost") || host.includes("127.0.0.1");

  const protocol =
    isLocal
      ? "http"
      : protoHeader === "http" || protoHeader === "https"
      ? protoHeader
      : "https";

  const safePath = normalizeCanonicalPath(path);

  return `${protocol}://${host}${safePath}`;
}