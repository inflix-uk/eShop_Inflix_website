import type { Metadata } from "next";
import { getCanonical } from "@/lib/getCanonical";
import { normalizeMetaSchemaJsonLdStrings } from "@/app/lib/homepageJsonLd";
import {
  fetchFooterPageBySlug,
  type FooterPage,
} from "@/app/services/footerPageService";
import {
  formatPageTitle,
  getStoreIdentity,
  ogImagesFromUrl,
} from "@/lib/storeIdentity";

interface FooterPageLayoutProps {
  children: React.ReactNode;
  params: Promise<{
    slug: string;
  }>;
}

/**
 * Generates metadata for the footer page
 */
export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  let page: FooterPage | null = null;

  try {
    page = await fetchFooterPageBySlug(slug);
  } catch (error) {
    console.error("Error fetching page for metadata:", error);
  }

  if (!page) {
    const identity = await getStoreIdentity();
    return {
      title: formatPageTitle("Page Not Found", identity.siteName),
      description: "The page you're looking for doesn't exist.",
      robots: "noindex, nofollow",
    };
  }

  const title = page.metaTitle || page.title;
  const identity = await getStoreIdentity();
  const description =
    page.metaDescription ||
    (identity.siteName
      ? `Read about ${page.title} at ${identity.siteName}.`
      : `Read about ${page.title}.`);
  const canonicalUrl = await getCanonical(`/footer-pages/${slug}`);

  const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";
  const pageImage = page.bannerImage
    ? page.bannerImage.startsWith("http")
      ? page.bannerImage
      : `${apiUrl}/uploads/${page.bannerImage}`
    : identity.ogImageUrl;
  const images = ogImagesFromUrl(pageImage);

  const metadata: Metadata = {
    title: formatPageTitle(title, identity.siteName),
    description: description,
    robots: "index, follow",
    openGraph: {
      ...(identity.siteName ? { siteName: identity.siteName } : {}),
      title: title,
      url: canonicalUrl,
      description: description,
      type: "website",
      ...(images.length ? { images } : {}),
    },
    twitter: {
      card: "summary_large_image",
      title: title,
      description: description,
      ...(images.length ? { images } : {}),
    },
    alternates: {
      canonical: canonicalUrl,
      languages: { "en-gb": canonicalUrl },
    },
  };

  // Add meta tags if provided
  if (page.metaTags && page.metaTags.length > 0) {
    metadata.keywords = page.metaTags.join(", ");
  }

  return metadata;
}

/**
 * Layout component that includes meta schemas
 */
export default async function FooterPageLayout({
  children,
  params,
}: FooterPageLayoutProps) {
  const { slug } = await params;
  let page: FooterPage | null = null;

  try {
    page = await fetchFooterPageBySlug(slug);
  } catch (error) {
    console.error("Error fetching page for layout:", error);
  }

  const jsonLdStrings = normalizeMetaSchemaJsonLdStrings(page?.metaSchema);

  return (
    <>
      {jsonLdStrings.map((json, index) => (
        <script
          key={index}
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: json }}
        />
      ))}
      {children}
    </>
  );
}
