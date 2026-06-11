import type { Metadata } from "next";
import { getCanonical } from "@/lib/getCanonical";
import {
  fetchFooterPageBySlug,
  getImageUrl,
  type FooterPage,
} from "@/app/services/footerPageService";

/**
 * CMS often stores a full <script type="application/ld+json">…</script> snippet.
 * Nesting that inside another ld+json script breaks HTML parsing (first </script>
 * closes the tag) and causes hydration mismatches. Returns JSON text safe for
 * embedding in <script type="application/ld+json">.
 */
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

/** Published static meta row (admin "Static Meta Pages") — fallback source. */
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

interface DynamicPageLayoutProps {
  children: React.ReactNode;
  params: Promise<{
    slug: string;
  }>;
}

/**
 * Generates metadata for the footer page.
 * Priority: Footer Page SEO (from admin Footer Pages) > Static Meta > fallback
 */
export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const decodedSlug = decodeURIComponent(slug);
  const path = `/${decodedSlug}`;
  const canonicalUrl = await getCanonical(`/${decodedSlug}`);

  const [staticMeta, page] = await Promise.all([
    fetchStaticMetaByPath(path),
    fetchFooterPageBySlug(decodedSlug).catch((error) => {
      console.error("Error fetching page for metadata:", error);
      return null;
    }),
  ]);

  // Primary source: Footer Page from admin (if published and has metaTitle)
  if (page?.publishStatus === "published" && page.metaTitle) {
    const title = page.metaTitle;
    const description = page.metaDescription || "";

    const metadata: Metadata = {
      title: title,
      description: description,
      robots: "index, follow",
      openGraph: {
        title: title,
        url: canonicalUrl,
        description: description,
        type: "website",
        images: page.bannerImage
          ? [{ url: getImageUrl(page.bannerImage) }]
          : [],
      },
      twitter: {
        card: "summary_large_image",
        title: title,
        description: description,
        images: page.bannerImage
          ? [{ url: getImageUrl(page.bannerImage) }]
          : [],
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

  // Secondary source: Static Meta from admin (fallback when footer page has no metaTitle)
  if (staticMeta?.titleTag) {
    const ogImages =
      page?.publishStatus === "published" && page.bannerImage
        ? [{ url: getImageUrl(page.bannerImage) }]
        : [];

    const metadata: Metadata = {
      title: staticMeta.titleTag,
      description: staticMeta.metaDescription || "",
      robots: "index, follow",
      openGraph: {
        title: staticMeta.titleTag,
        url: canonicalUrl,
        description: staticMeta.metaDescription || "",
        type: "website",
        images: ogImages,
      },
      twitter: {
        card: "summary_large_image",
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

  // Tertiary: Footer page exists but no metaTitle — use page.title as fallback
  if (page?.publishStatus === "published") {
    const title = page.metaTitle || "";
    const description = page.metaDescription || "";

    const metadata: Metadata = {
      title: title,
      description: description,
      robots: "index, follow",
      openGraph: {
        title: title,
        url: canonicalUrl,
        description: description,
        type: "website",
        images: page.bannerImage
          ? [{ url: getImageUrl(page.bannerImage) }]
          : [],
      },
      twitter: {
        card: "summary_large_image",
        title: title,
        description: description,
        images: page.bannerImage
          ? [{ url: getImageUrl(page.bannerImage) }]
          : [],
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

  // Fallback - still allow indexing
  return {
    title: "",
    description: "",
    robots: "index, follow",
  };
}

/**
 * Layout component that includes meta schemas.
 * Priority: Footer Page schemas > Static Meta schemas
 */
export default async function DynamicPageLayout({
  children,
  params,
}: DynamicPageLayoutProps) {
  const { slug } = await params;
  const decodedSlug = decodeURIComponent(slug);
  const path = `/${decodedSlug}`;

  const [staticMeta, page] = await Promise.all([
    fetchStaticMetaByPath(path),
    fetchFooterPageBySlug(decodedSlug).catch((error) => {
      console.error("Error fetching page for layout:", error);
      return null;
    }),
  ]);

  // Prefer footer page schemas, fall back to static meta schemas
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
