import type { Metadata } from "next";
import {
  fetchFooterPageBySlug,
  type FooterPage,
} from "@/app/services/footerPageService";
import {
  fetchStaticMetaByPath,
  type StaticMetaPagePayload,
} from "@/lib/pageMetadata";
import {
  formatPageTitle,
  getStoreIdentity,
  ogImagesFromUrl,
} from "@/lib/storeIdentity";
import { getCanonical } from "@/lib/getCanonical";

const SLUG = "deals-and-discounts";

async function getPublishedCmsPage(): Promise<FooterPage | null> {
  try {
    const page = await fetchFooterPageBySlug(SLUG);
    if (page && page.publishStatus === "published") return page;
  } catch {
    /* use fallback meta */
  }
  return null;
}

function resolveCmsImage(
  bannerImage: string | undefined,
  apiUrl: string,
  fallback: string | null
): string | null {
  if (bannerImage?.startsWith("http")) return bannerImage;
  if (bannerImage && apiUrl) {
    return `${apiUrl}/uploads/${bannerImage.replace(/^\//, "")}`;
  }
  return fallback;
}

export async function generateMetadata(): Promise<Metadata> {
  const [cms, identity, staticMeta, canonicalUrl] = await Promise.all([
    getPublishedCmsPage(),
    getStoreIdentity(),
    fetchStaticMetaByPath("/deals-and-discounts"),
    getCanonical("/deals-and-discounts"),
  ]);

  const apiUrl = (process.env.NEXT_PUBLIC_API_URL || "").replace(/\/$/, "");

  if (cms) {
    const title = cms.metaTitle || cms.title;
    const description =
      cms.metaDescription || "Deals, coupons, and promo codes.";
    const ogImage = resolveCmsImage(
      cms.bannerImage,
      apiUrl,
      identity.ogImageUrl
    );
    const images = ogImagesFromUrl(ogImage);

    const metadata: Metadata = {
      title: formatPageTitle(title, identity.siteName),
      description,
      robots: "index, follow",
      openGraph: {
        ...(identity.siteName ? { siteName: identity.siteName } : {}),
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

    if (cms.metaTags && cms.metaTags.length > 0) {
      metadata.keywords = cms.metaTags.join(", ");
    }

    return metadata;
  }

  const metaData: StaticMetaPagePayload = staticMeta;
  if (!metaData) {
    return {
      title: formatPageTitle("Deals and Discounts", identity.siteName),
      description: "Latest deals and discounts.",
      robots: "index, follow",
    };
  }

  const title =
    metaData.titleTag || formatPageTitle("Deals and Discounts", identity.siteName);
  const description =
    metaData.metaDescription || "Latest deals and discounts.";
  const images = ogImagesFromUrl(identity.ogImageUrl);

  return {
    title,
    description,
    keywords: metaData.metaKeywords,
    robots: "index, follow",
    openGraph: {
      ...(identity.siteName ? { siteName: identity.siteName } : {}),
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
}

export default async function DealsAndDiscountsLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const cms = await getPublishedCmsPage();

  if (cms?.metaSchema?.length) {
    return (
      <>
        {cms.metaSchema.map((schema: string, index: number) => (
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

  const metaData = await fetchStaticMetaByPath("/deals-and-discounts");
  return (
    <>
      {metaData?.metaSchemas?.map((schema: string, index: number) => (
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
