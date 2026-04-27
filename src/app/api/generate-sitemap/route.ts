import { NextResponse } from 'next/server';
import axios from 'axios';
import { SitemapStream, streamToPromise } from 'sitemap';
import { Readable } from 'stream';
import fs from 'fs';

export const runtime = 'nodejs';

// CORS setup - allow any origin for sitemap generation
function applyCORS(res: NextResponse, origin?: string) {
  res.headers.set('Access-Control-Allow-Origin', origin || '*');
  res.headers.set('Vary', 'Origin');
  res.headers.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.headers.set('Access-Control-Max-Age', '86400');
  return res;
}

function extractPath(url: string): string {
  if (!url) return '/';
  
  // If it's already a relative path, return as-is
  if (url.startsWith('/')) return url;
  
  // Strip any domain (http://..., https://...) and return the path
  try {
    const parsed = new URL(url);
    return parsed.pathname + parsed.search + parsed.hash;
  } catch {
    // If URL parsing fails, try regex fallback
    const match = url.match(/^https?:\/\/[^/]+(\/.*)?$/);
    return match?.[1] || '/';
  }
}

async function generate() {
  const baseUrl = (process.env.NEXT_PUBLIC_BASE_URL || 'https://aromadesire.com').replace(/\/$/, '');
  
  try {
    const response = await axios.post(`${process.env.NEXT_PUBLIC_API_URL}/create/sitemap`);
    const rawLinks: any[] = Array.isArray(response.data) ? response.data : [];

    if (!rawLinks.length) {
      return NextResponse.json(
        { ok: false, message: 'No URLs returned from backend' },
        { status: 400 }
      );
    }

    // Convert all URLs to use the correct base URL
    // Backend returns full URLs with hardcoded domain, we need to replace them
    const links = rawLinks.map((item) => {
      const path = extractPath(item.url);
      return {
        ...item,
        url: `${baseUrl}${path}`,
      };
    });

    const stream = new SitemapStream({ hostname: baseUrl });
    const sitemap = await streamToPromise(Readable.from(links).pipe(stream));

    // Do not write public/sitemap.xml — it conflicts with src/app/sitemap.ts (same URL).
    const outPath = `${process.cwd()}/sitemap.generated.xml`;
    fs.writeFileSync(outPath, sitemap.toString());

    return NextResponse.json({
      ok: true,
      count: links.length,
      path: '/sitemap.xml',
      baseUrl,
      artifact: 'sitemap.generated.xml',
    });
  } catch (error: any) {
    console.error('API generate-sitemap error:', error);
    return NextResponse.json(
      { ok: false, message: 'Failed to generate sitemap' },
      { status: 500 }
    );
  }
}

export async function OPTIONS(request: Request) {
  const origin = request.headers.get('origin') || '';
  const res = new NextResponse(null, { status: 204 });
  return applyCORS(res, origin);
}

export async function POST(request: Request) {
  const origin = request.headers.get('origin') || '';
  const res = await generate();
  return applyCORS(res, origin);
}

export async function GET(request: Request) {
  const origin = request.headers.get('origin') || '';
  const res = await generate();
  return applyCORS(res, origin);
}
