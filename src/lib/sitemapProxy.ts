import { canonicalSitemapOrigin } from "@/lib/sitemapCanonicalOrigin";

function isLocalHost(host: string): boolean {
  return /^localhost(?::\d+)?$/i.test(host) || /^127\.0\.0\.1(?::\d+)?$/.test(host);
}

function parseHost(input: string): string {
  const value = String(input || "").trim();
  if (!value) return "";
  try {
    return new URL(value).host;
  } catch {
    try {
      return new URL(`https://${value}`).host;
    } catch {
      return "";
    }
  }
}

function parsePublicOrigin(input: string): string {
  const value = String(input || "").trim().replace(/\/$/, "");
  if (!value) return "";
  try {
    return new URL(/^https?:\/\//i.test(value) ? value : `https://${value}`).origin;
  } catch {
    return "";
  }
}

function resolveHostProtoForSitemap(): { host: string; proto: string } {
  const envUrl = (
    process.env.FRONTEND_URL ||
    process.env.NEXT_PUBLIC_SITE_URL ||
    process.env.NEXT_PUBLIC_BASE_URL ||
    ""
  ).trim();

  let host = "";
  let proto = "https";
  if (envUrl) {
    try {
      const withScheme = /^https?:\/\//i.test(envUrl) ? envUrl : `https://${envUrl}`;
      const u = new URL(withScheme);
      host = u.host;
      proto = u.protocol === "http:" ? "http" : "https";
    } catch {
      /* ignore */
    }
  }
  if (!host && process.env.VERCEL_URL) {
    host = parseHost(process.env.VERCEL_URL);
    proto = "https";
  }
  return { host, proto };
}

function rewriteLocOrigin(loc: string, storefrontOrigin: string): string {
  const origin = storefrontOrigin.replace(/\/$/, "");
  if (!origin || !loc) return loc;
  try {
    const parsedLoc = new URL(loc);
    const parsedOrigin = new URL(origin);
    return `${parsedOrigin.origin}${parsedLoc.pathname}${parsedLoc.search}${parsedLoc.hash}`;
  } catch {
    return loc;
  }
}

function ensureTrailingSlashUrl(url: string): string {
  const raw = String(url || "").trim();
  if (!raw) return "";
  try {
    const u = new URL(raw);
    let pathname = u.pathname || "/";
    if (pathname !== "/" && !pathname.endsWith("/")) {
      pathname = `${pathname}/`;
    }
    return `${u.origin}${pathname}${u.search}${u.hash}`;
  } catch {
    return raw.endsWith("/") ? raw : `${raw}/`;
  }
}

export type SitemapFetchContext = {
  apiUrl: string;
  storeLookupDomain: string;
  publicHost: string;
  proto: string;
  storefrontOrigin: string;
};

export function resolveSitemapFetchContext(): SitemapFetchContext | null {
  const apiUrl = process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, "");
  if (!apiUrl) return null;

  const envFrontendUrl = (
    process.env.FRONTEND_URL ||
    process.env.NEXT_PUBLIC_SITE_URL ||
    process.env.NEXT_PUBLIC_BASE_URL ||
    ""
  ).replace(/\/$/, "");
  const envFrontendHost = parseHost(envFrontendUrl);
  const storefrontOrigin = canonicalSitemapOrigin(
    parsePublicOrigin(envFrontendUrl) || envFrontendUrl
  );

  const { host, proto } = resolveHostProtoForSitemap();

  const explicitStoreHost = parseHost(
    process.env.NEXT_PUBLIC_SITEMAP_STORE_DOMAIN ||
      process.env.NEXT_PUBLIC_SITEMAP_HOST ||
      ""
  );

  const treatAsLocalDev =
    (process.env.NODE_ENV === "development" && !process.env.VERCEL) ||
    (host.length > 0 && isLocalHost(host));

  let storeLookupDomain = "";
  if (explicitStoreHost) {
    storeLookupDomain = explicitStoreHost;
  } else if (treatAsLocalDev) {
    storeLookupDomain = parseHost(
      process.env.NEXT_PUBLIC_SITEMAP_STORE_DOMAIN ||
        process.env.NEXT_PUBLIC_SITEMAP_HOST ||
        "www.aromadesire.com"
    );
  } else {
    storeLookupDomain = envFrontendHost || host || "";
  }

  if (!storeLookupDomain) return null;

  const publicHost = envFrontendHost || host || storeLookupDomain;

  return {
    apiUrl,
    storeLookupDomain,
    publicHost,
    proto,
    storefrontOrigin,
  };
}

export function sitemapApiHeaders(ctx: SitemapFetchContext): Record<string, string> {
  return {
    "x-store-domain": ctx.storeLookupDomain,
    "x-forwarded-host": ctx.publicHost,
    "x-forwarded-proto": ctx.proto,
    "x-sitemap-public-host": ctx.publicHost,
  };
}

/** Rewrite <loc> origins and trailing slashes; preserve backend urlset namespaces. */
export function rewriteSitemapXmlLocs(xml: string, storefrontOrigin: string): string {
  if (!storefrontOrigin) return xml;
  return xml.replace(/<loc>([^<]*)<\/loc>/g, (_, rawLoc: string) => {
    const trimmed = rawLoc.trim();
    const rewritten = rewriteLocOrigin(trimmed, storefrontOrigin);
    const loc = ensureTrailingSlashUrl(rewritten);
    return `<loc>${loc}</loc>`;
  });
}

export function sitemapCacheControl(): string {
  return process.env.NODE_ENV === "development"
    ? "public, max-age=60"
    : "public, max-age=3600, stale-while-revalidate";
}
