import { MetadataRoute } from 'next';
import { headers } from 'next/headers';

function isLocalHost(host: string): boolean {
  return /^localhost(?::\d+)?$/i.test(host) || /^127\.0\.0\.1(?::\d+)?$/.test(host);
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  try {
    const apiUrl = process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, '');
    if (!apiUrl) {
      console.error('Missing NEXT_PUBLIC_API_URL for sitemap');
      return [];
    }

    const requestHeaders = await headers();
    const host = requestHeaders.get('host');
    if (!host) return [];
    const proto = requestHeaders.get('x-forwarded-proto') || 'https';
    const storeLookupDomain =
      isLocalHost(host)
        ? (process.env.NEXT_PUBLIC_SITEMAP_STORE_DOMAIN || process.env.NEXT_PUBLIC_SITEMAP_HOST || 'www.aromadesire.com')
        : host;

    const res = await fetch(`${apiUrl}/sitemap.xml`, {
      method: 'GET',
      headers: {
        // Used only to resolve which store's data to query.
        'x-store-domain': storeLookupDomain,
        // Used by backend to build absolute <loc> URLs.
        'x-forwarded-host': host,
        'x-forwarded-proto': proto,
      },
      next: { revalidate: 3600 },
    });

    if (!res.ok) {
      console.error('Failed to fetch sitemap data');
      return [];
    }

    const xml = await res.text();
    const urlBlocks = xml.match(/<url>[\s\S]*?<\/url>/g) || [];
    const entries: MetadataRoute.Sitemap = [];
    for (const block of urlBlocks) {
      const loc = block.match(/<loc>([\s\S]*?)<\/loc>/)?.[1]?.trim() || '';
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
