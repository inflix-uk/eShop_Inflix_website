import type { Metadata } from "next";
import { getCanonical } from "@/lib/getCanonical";
import {
  fetchFooterPageBySlug,
  getImageUrl,
} from "@/app/services/footerPageService";

function ldJsonForScriptTag(raw: string): string {
  let s = String(raw).trim();
  if (!s) return "";
  const open = /^<script\b[^>]*>/i;
  const close = /<\/script>\s*$/i;
  if (open.test(s) && close.test(s)) {
    s = s.replace(open, "").replace(close, "").trim();
  }
  try {
    const parsed = JSON.parse(s) as unknown;
    return JSON.stringify(parsed).replace(/</g, "\\u003c");
  } catch {
    return s.replace(/</g, "\\u003c");
  }
}

type StaticMetaPage = {
  titleTag: string;
  metaDescription: string;
  metaKeywords?: string;
  canonicalUrl?: string;
  metaSchemas?: string[];
};

async function fetchStaticMetaByPath(
  path: string
): Promise<StaticMetaPage | null> {
  try {
    const apiUrl = process.env.NEXT_PUBLIC_API_URL;
    if (!apiUrl) return null;
    const res = await fetch(
      `${apiUrl}/get/static-meta-page/path/${encodeURIComponent(path)}`,
      { cache: "no-store" }
    );
    if (!res.ok) return null;
    const data = await res.json();
    return data.success && data.data ? data.data : null;
  } catch {
    return null;
  }
}

interface CategoryPageLayoutProps {
  children: React.ReactNode;
  params: Promise<{
    slug: string;
    pageSlug: string;
  }>;
}

function defaultOgImage() {
  return [{ url: getImageUrl("/uploads/web/Zextons.webp") }];
}

/**
 * Metadata for /{categorySlug}/{pageSlug} CMS footer pages.
 * Params: first `slug` = category segment; `pageSlug` = page segment (Next.js 15 naming).
 */
export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string; pageSlug: string }>;
}): Promise<Metadata> {
  const { slug, pageSlug } = await params;
  const decodedCategory = decodeURIComponent(slug).toLowerCase().trim();
  const decodedPageSlug = decodeURIComponent(pageSlug).toLowerCase().trim();
  const pathSeg = `/${decodedCategory}/${decodedPageSlug}`;
  const canonicalUrl = await getCanonical(pathSeg);

  const [staticMeta, page] = await Promise.all([
    fetchStaticMetaByPath(pathSeg),
    fetchFooterPageBySlug(decodedPageSlug, decodedCategory).catch((error) => {
      console.error("Error fetching page for metadata:", error);
      return null;
    }),
  ]);

  if (page?.publishStatus === "published" && page.metaTitle) {
    const title = page.metaTitle;
    const description = page.metaDescription || "";

    const metadata: Metadata = {
      title,
      description,
      robots: "index, follow",
      openGraph: {
        siteName: "Zextons",
        title,
        url: canonicalUrl,
        description,
        type: "website",
        images: page.bannerImage
          ? [{ url: getImageUrl(page.bannerImage) }]
          : defaultOgImage(),
      },
      twitter: {
        card: "summary_large_image",
        site: "@ZextonsTechStore",
        title,
        description,
        images: page.bannerImage
          ? [{ url: getImageUrl(page.bannerImage) }]
          : defaultOgImage(),
      },
      alternates: {
        canonical: canonicalUrl,
        languages: { "en-gb": canonicalUrl },
      },
    };

    if (page.metaTags && page.metaTags.length > 0) {
      metadata.keywords = page.metaTags.join(", ");
    }

    return metadata;
  }

  if (staticMeta?.titleTag) {
    const ogImages =
      page?.publishStatus === "published" && page.bannerImage
        ? [{ url: getImageUrl(page.bannerImage) }]
        : defaultOgImage();

    const metadata: Metadata = {
      title: staticMeta.titleTag,
      description: staticMeta.metaDescription || "",
      robots: "index, follow",
      openGraph: {
        siteName: "Zextons",
        title: staticMeta.titleTag,
        url: canonicalUrl,
        description: staticMeta.metaDescription || "",
        type: "website",
        images: ogImages,
      },
      twitter: {
        card: "summary_large_image",
        site: "@ZextonsTechStore",
        title: staticMeta.titleTag,
        description: staticMeta.metaDescription || "",
        images: ogImages,
      },
      alternates: {
        canonical: canonicalUrl,
        languages: { "en-gb": canonicalUrl },
      },
    };
    if (staticMeta.metaKeywords?.trim()) {
      metadata.keywords = staticMeta.metaKeywords;
    }
    return metadata;
  }

  if (page?.publishStatus === "published") {
    const title = page.metaTitle || "";
    const description = page.metaDescription || "";

    const metadata: Metadata = {
      title,
      description,
      robots: "index, follow",
      openGraph: {
        siteName: "Zextons",
        title,
        url: canonicalUrl,
        description,
        type: "website",
        images: page.bannerImage
          ? [{ url: getImageUrl(page.bannerImage) }]
          : defaultOgImage(),
      },
      twitter: {
        card: "summary_large_image",
        site: "@ZextonsTechStore",
        title,
        description,
        images: page.bannerImage
          ? [{ url: getImageUrl(page.bannerImage) }]
          : defaultOgImage(),
      },
      alternates: {
        canonical: canonicalUrl,
        languages: { "en-gb": canonicalUrl },
      },
    };

    if (page.metaTags && page.metaTags.length > 0) {
      metadata.keywords = page.metaTags.join(", ");
    }

    return metadata;
  }

  return {
    title: "",
    description: "",
    robots: "noindex, nofollow",
  };
}

export default async function CategoryDynamicPageLayout({
  children,
  params,
}: CategoryPageLayoutProps) {
  const { slug, pageSlug } = await params;
  const decodedCategory = decodeURIComponent(slug).toLowerCase().trim();
  const decodedPageSlug = decodeURIComponent(pageSlug).toLowerCase().trim();
  const pathSeg = `/${decodedCategory}/${decodedPageSlug}`;

  const [staticMeta, page] = await Promise.all([
    fetchStaticMetaByPath(pathSeg),
    fetchFooterPageBySlug(decodedPageSlug, decodedCategory).catch((error) => {
      console.error("Error fetching page for layout:", error);
      return null;
    }),
  ]);

  const schemaScripts =
    page?.metaSchema && page.metaSchema.length > 0
      ? page.metaSchema
      : staticMeta?.metaSchemas ?? [];

  const normalizedSchemas = schemaScripts
    .map((schema) => ldJsonForScriptTag(schema))
    .filter(Boolean);

  return (
    <>
      {normalizedSchemas.map((schema, index) => (
        <script
          key={index}
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: schema }}
        />
      ))}
      {children}
    </>
  );
}
