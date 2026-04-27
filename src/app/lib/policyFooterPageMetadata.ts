import type { Metadata } from "next";
import { getCanonical } from "@/lib/getCanonical";
import {
  fetchFooterPageBySlug,
  type FooterPage,
} from "@/app/services/footerPageService";

function bannerOgImage(page: FooterPage): string | null {
  const raw = page.bannerImage?.trim();
  if (!raw) return null;
  const base = (process.env.NEXT_PUBLIC_API_URL || "").replace(/\/$/, "");
  if (!base) return null;
  if (raw.startsWith("http://") || raw.startsWith("https://")) return raw;
  const path = raw.startsWith("/") ? raw.slice(1) : raw;
  if (path.startsWith("uploads/")) return `${base}/${path}`;
  return `${base}/uploads/${path}`;
}

/**
 * SEO for legacy policy routes that load body from footer-pages CMS (`/footer-pages/pagesBySlug/...`).
 * Title/description come only from `metaTitle` / `metaDescription` (optional `title` fallback for tab label when meta title empty).
 */
export async function metadataForFooterPolicyPage(
  pathSegment: string,
  slug: string
): Promise<Metadata> {
  let page: FooterPage | null = null;
  try {
    page = await fetchFooterPageBySlug(slug);
  } catch {
    /* network / parse */
  }

  const canonicalUrl = await getCanonical(pathSegment);

  if (!page) {
    return {
      title: "",
      description: "",
      robots: "index, follow",
      alternates: {
        canonical: canonicalUrl,
        languages: { "en-gb": canonicalUrl },
      },
      openGraph: { url: canonicalUrl },
    };
  }

  const title = page.metaTitle?.trim() || page.title?.trim() || "";
  const description = page.metaDescription?.trim() || "";
  const ogImage = bannerOgImage(page);

  const meta: Metadata = {
    ...(title ? { title } : {}),
    ...(description ? { description } : {}),
    robots: "index, follow",
    alternates: {
      canonical: canonicalUrl,
      languages: { "en-gb": canonicalUrl },
    },
  };

  if (page.metaTags?.length) {
    meta.keywords = page.metaTags.join(", ");
  }

  if (title || description || ogImage) {
    meta.openGraph = {
      ...(title ? { title } : {}),
      ...(description ? { description } : {}),
      url: canonicalUrl,
      type: "website",
      ...(ogImage ? { images: [{ url: ogImage }] } : {}),
    };
    meta.twitter = {
      card: "summary_large_image",
      ...(title ? { title } : {}),
      ...(description ? { description } : {}),
      ...(ogImage ? { images: [ogImage] } : {}),
    };
  }

  return meta;
}
