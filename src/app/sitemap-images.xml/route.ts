import { NextResponse } from "next/server";
import {
  resolveSitemapFetchContext,
  rewriteSitemapXmlLocs,
  sitemapApiHeaders,
  sitemapCacheControl,
} from "@/lib/sitemapProxy";

/** Pass through backend XML so tag order and urlset namespaces stay intact. */
export async function GET() {
  try {
    const ctx = resolveSitemapFetchContext();
    if (!ctx) {
      return new NextResponse("Missing NEXT_PUBLIC_API_URL or store domain", {
        status: 500,
      });
    }

    const res = await fetch(`${ctx.apiUrl}/sitemap-images.xml`, {
      method: "GET",
      headers: sitemapApiHeaders(ctx),
      next: { revalidate: process.env.NODE_ENV === "development" ? 60 : 3600 },
    });

    if (!res.ok) {
      const detail = await res.text().catch(() => "");
      console.error(
        "Failed to fetch product image sitemap:",
        res.status,
        res.statusText,
        detail.slice(0, 200)
      );
      return new NextResponse("Failed to generate sitemap-images.xml", {
        status: res.status,
      });
    }

    const xml = rewriteSitemapXmlLocs(await res.text(), ctx.storefrontOrigin);

    return new NextResponse(xml, {
      status: 200,
      headers: {
        "Content-Type": "application/xml; charset=utf-8",
        "Cache-Control": sitemapCacheControl(),
      },
    });
  } catch (error) {
    console.error("Error generating sitemap-images.xml:", error);
    return new NextResponse("Failed to generate sitemap-images.xml", {
      status: 500,
    });
  }
}
