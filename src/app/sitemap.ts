import { MetadataRoute } from 'next';

function isLocalHost(host: string): boolean {
  return /^localhost(?::\d+)?$/i.test(host) || /^127\.0\.0\.1(?::\d+)?$/.test(host);
}

function parseHost(input: string): string {
  const value = String(input || '').trim();
  if (!value) return '';
  try {
    return new URL(value).host;
  } catch {
    try {
      return new URL(`https://${value}`).host;
    } catch {
      return '';
    }
  }
}

/** Canonical origin for public URLs (scheme + host), e.g. https://inflix.co.uk */
function parsePublicOrigin(input: string): string {
  const value = String(input || '').trim().replace(/\/$/, '');
  if (!value) return '';
  try {
    return new URL(value).origin;
  } catch {
    try {
      return new URL(/^https?:\/\//i.test(value) ? value : `https://${value}`).origin;
    } catch {
      return '';
    }
  }
}

/**
 * Build-time / prerender host without `headers()` so `/sitemap.xml` stays statically
 * renderable. Matches previous behavior: local `next dev` uses store-domain defaults.
 */
function resolveHostProtoForSitemap(): { host: string; proto: string } {
  const envUrl = (
    process.env.FRONTEND_URL ||
    process.env.NEXT_PUBLIC_SITE_URL ||
    process.env.NEXT_PUBLIC_BASE_URL ||
    ''
  ).trim();

  let host = '';
  let proto = 'https';
  if (envUrl) {
    try {
      const withScheme = /^https?:\/\//i.test(envUrl) ? envUrl : `https://${envUrl}`;
      const u = new URL(withScheme);
      host = u.host;
      proto = u.protocol === 'http:' ? 'http' : 'https';
    } catch {
      /* ignore */
    }
  }
  if (!host && process.env.VERCEL_URL) {
    host = parseHost(process.env.VERCEL_URL);
    proto = 'https';
  }
  return { host, proto };
}

/** Force every <loc> to use the storefront origin from env (API may still emit another domain). */
function rewriteLocOrigin(loc: string, storefrontOrigin: string): string {
  const origin = storefrontOrigin.replace(/\/$/, '');
  if (!origin || !loc) return loc;
  try {
    const parsedLoc = new URL(loc);
    const parsedOrigin = new URL(origin);
    return `${parsedOrigin.origin}${parsedLoc.pathname}${parsedLoc.search}${parsedLoc.hash}`;
  } catch {
    return loc;
  }
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  try {
    const apiUrl = process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, '');
    if (!apiUrl) {
      console.error('Missing NEXT_PUBLIC_API_URL for sitemap');
      return [];
    }

    const envFrontendUrl = (
      process.env.FRONTEND_URL ||
      process.env.NEXT_PUBLIC_SITE_URL ||
      process.env.NEXT_PUBLIC_BASE_URL ||
      ''
    ).replace(/\/$/, '');
    const envFrontendHost = parseHost(envFrontendUrl);
    const storefrontOrigin = parsePublicOrigin(envFrontendUrl);

    const { host, proto } = resolveHostProtoForSitemap();

    /**
     * Which hostname identifies the store in Mongo (must match Store.primaryDomain / domains).
     * FRONTEND_URL may point at a different public domain than the store record; use
     * NEXT_PUBLIC_SITEMAP_STORE_DOMAIN when they differ. On localhost, default lookup to
     * aromadesire unless explicitly overridden so `FRONTEND_URL=https://inflix.co.uk` still resolves data.
     */
    const explicitStoreHost = parseHost(
      process.env.NEXT_PUBLIC_SITEMAP_STORE_DOMAIN ||
        process.env.NEXT_PUBLIC_SITEMAP_HOST ||
        ''
    );

    const treatAsLocalDev =
      (process.env.NODE_ENV === 'development' && !process.env.VERCEL) ||
      (host.length > 0 && isLocalHost(host));

    let storeLookupDomain = '';
    if (explicitStoreHost) {
      storeLookupDomain = explicitStoreHost;
    } else if (treatAsLocalDev) {
      storeLookupDomain = parseHost(
        process.env.NEXT_PUBLIC_SITEMAP_STORE_DOMAIN ||
          process.env.NEXT_PUBLIC_SITEMAP_HOST ||
          'www.aromadesire.com'
      );
    } else {
      storeLookupDomain = envFrontendHost || host || '';
    }

    if (!storeLookupDomain) return [];
    /** Host headers for API <loc> fallback; prefer real storefront host when known */
    const publicHost = envFrontendHost || host || storeLookupDomain;

    const res = await fetch(`${apiUrl}/sitemap.xml`, {
      method: 'GET',
      headers: {
        // Used only to resolve which store's data to query.
        'x-store-domain': storeLookupDomain,
        // Used by backend to build absolute <loc> URLs.
        'x-forwarded-host': publicHost,
        'x-forwarded-proto': proto,
        // Prefer explicit host from FRONTEND_URL/NEXT_PUBLIC_SITE_URL for <loc> URLs.
        'x-sitemap-public-host': publicHost,
      },
      next: { revalidate: process.env.NODE_ENV === 'development' ? 60 : 3600 },
    });

    if (!res.ok) {
      const detail = await res.text().catch(() => '');
      console.error(
        'Failed to fetch sitemap data:',
        res.status,
        res.statusText,
        detail.slice(0, 200)
      );
      return [];
    }

    const xml = await res.text();
    const urlBlocks = xml.match(/<url>[\s\S]*?<\/url>/g) || [];
    const entries: MetadataRoute.Sitemap = [];
    for (const block of urlBlocks) {
      const rawLoc = block.match(/<loc>([\s\S]*?)<\/loc>/)?.[1]?.trim() || '';
      const loc = storefrontOrigin ? rewriteLocOrigin(rawLoc, storefrontOrigin) : rawLoc;
      if (!loc) continue;
      const lastmod = block.match(/<lastmod>([\s\S]*?)<\/lastmod>/)?.[1]?.trim();
      const priorityRaw = block.match(/<priority>([\s\S]*?)<\/priority>/)?.[1]?.trim();
      const priority = priorityRaw ? Number(priorityRaw) : undefined;
      entries.push({
        url: loc,
        lastModified: lastmod ? new Date(lastmod) : new Date(),
        changeFrequency: 'daily',
        priority: Number.isFinite(priority) ? priority : 0.8,
      });
    }
    return entries;
  } catch (error) {
    console.error('Error generating sitemap:', error);
    return [];
  }
}
