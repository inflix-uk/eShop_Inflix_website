import type { Metadata } from "next";
import { getCanonical } from "@/lib/getCanonical";
import {
  fetchFooterPageBySlug,
  getImageUrl,
} from "@/app/services/footerPageService";
import { mergeAdminJsonLdWithAutoBusiness } from "@/app/lib/businessJsonLd";
import { getStoreIdentity, shareImagesForPage } from "@/lib/storeIdentity";

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

/**
 * Metadata for /{parentSlug}/{pageSlug} CMS footer pages.
 * Params: first `slug` = parent segment; `pageSlug` = child segment (Next.js 15 naming).
 */
export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string; pageSlug: string }>;
}): Promise<Metadata> {
  const { slug, pageSlug } = await params;
  const decodedParentSlug = decodeURIComponent(slug).toLowerCase().trim();
  const decodedPageSlug = decodeURIComponent(pageSlug).toLowerCase().trim();
  const pathSeg = `/${decodedParentSlug}/${decodedPageSlug}`;
  const canonicalUrl = await getCanonical(pathSeg);

  const [staticMeta, page, identity] = await Promise.all([
    fetchStaticMetaByPath(pathSeg),
    fetchFooterPageBySlug(decodedPageSlug, decodedParentSlug).catch((error) => {
      console.error("Error fetching page for metadata:", error);
      return null;
    }),
    getStoreIdentity().catch(() => null),
  ]);

  const bannerUrl =
    page?.publishStatus === "published" && page.bannerImage
      ? getImageUrl(page.bannerImage)
      : null;
  const images = shareImagesForPage(bannerUrl, identity);

  if (page?.publishStatus === "published" && page.metaTitle) {
    const title = page.metaTitle;
    const description = page.metaDescription || "";

    const metadata: Metadata = {
      title,
      description,
      robots: "index, follow",
      openGraph: {
        title,
        url: canonicalUrl,
        description,
        type: "website",
        ...(images.length ? { images } : {}),
      },
      twitter: {
        card: "summary_large_image",
        title,
        description,
        ...(images.length ? { images } : {}),
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
    const metadata: Metadata = {
      title: staticMeta.titleTag,
      description: staticMeta.metaDescription || "",
      robots: "index, follow",
      openGraph: {
        title: staticMeta.titleTag,
        url: canonicalUrl,
        description: staticMeta.metaDescription || "",
        type: "website",
        ...(images.length ? { images } : {}),
      },
      twitter: {
        card: "summary_large_image",
        title: staticMeta.titleTag,
        description: staticMeta.metaDescription || "",
        ...(images.length ? { images } : {}),
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
        title,
        url: canonicalUrl,
        description,
        type: "website",
        ...(images.length ? { images } : {}),
      },
      twitter: {
        card: "summary_large_image",
        title,
        description,
        ...(images.length ? { images } : {}),
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
    robots: "index, follow",
  };
}

export default async function CategoryDynamicPageLayout({
  children,
  params,
}: CategoryPageLayoutProps) {
  const { slug, pageSlug } = await params;
  const decodedParentSlug = decodeURIComponent(slug).toLowerCase().trim();
  const decodedPageSlug = decodeURIComponent(pageSlug).toLowerCase().trim();
  const pathSeg = `/${decodedParentSlug}/${decodedPageSlug}`;

  const [staticMeta, page] = await Promise.all([
    fetchStaticMetaByPath(pathSeg),
    fetchFooterPageBySlug(decodedPageSlug, decodedParentSlug).catch((error) => {
      console.error("Error fetching page for layout:", error);
      return null;
    }),
  ]);

  const schemaScripts =
    page?.metaSchema && page.metaSchema.length > 0
      ? page.metaSchema
      : staticMeta?.metaSchemas ?? [];

  const jsonLdStrings = await mergeAdminJsonLdWithAutoBusiness(
    schemaScripts
      .map((schema) => ldJsonForScriptTag(schema))
      .filter(Boolean)
  );

  return (
    <>
      {jsonLdStrings.map((schema, index) => (
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
