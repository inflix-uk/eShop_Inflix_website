import { MetadataRoute } from 'next';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  try {
    const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/create/sitemap`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!res.ok) {
      console.error('Failed to fetch sitemap data');
      return [];
    }

    const apiUrls = await res.json();

    const baseUrl = (process.env.NEXT_PUBLIC_BASE_URL || 'https://aromadesire.com').replace(
      /\/$/,
      ''
    );

    return apiUrls.map((item: { url?: string; loc?: string; lastmod?: string; priority?: number }) => {
      const raw = item.url ?? item.loc ?? '';
      const absolute =
        typeof raw === 'string' && raw.startsWith('http')
          ? raw
          : `${baseUrl}${raw.startsWith('/') ? raw : `/${raw}`}`;
      return {
        url: absolute,
        lastModified: item.lastmod ? new Date(item.lastmod) : new Date(),
        changeFrequency: 'daily' as const,
        priority: item.priority ?? 0.8,
      };
    });
  } catch (error) {
    console.error('Error generating sitemap:', error);
    return [];
  }
}
