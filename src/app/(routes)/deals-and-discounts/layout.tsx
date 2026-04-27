import type { Metadata } from "next";
import {
  fetchFooterPageBySlug,
  type FooterPage,
} from "@/app/services/footerPageService";
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

type StaticMetaRow = {
  titleTag?: string;
  metaDescription?: string;
  metaKeywords?: string;
  metaSchemas?: string[];
};

async function getStaticMetaFallback(): Promise<StaticMetaRow | null> {
  try {
    const apiUrl = process.env.NEXT_PUBLIC_API_URL;
    if (!apiUrl) return null;
    const res = await fetch(
      `${apiUrl}/get/static-meta-page/path/${encodeURIComponent("/deals-and-discounts")}`,
      { cache: "no-store" }
    );
    if (!res.ok) return null;
    const data = await res.json();
    return data.success ? data.data : null;
  } catch {
    return null;
  }
}

export async function generateMetadata(): Promise<Metadata> {
  const cms = await getPublishedCmsPage();
  const canonicalUrl = await getCanonical("/deals-and-discounts");
  const apiUrl = (process.env.NEXT_PUBLIC_API_URL || "").replace(/\/$/, "");

  if (cms) {
    const title = cms.metaTitle || cms.title;
    const description =
      cms.metaDescription ||
      "Deals, coupons, and promo codes at Zextons Tech Store";

    const ogImage =
      cms.bannerImage && cms.bannerImage.startsWith("http")
        ? cms.bannerImage
        : cms.bannerImage && apiUrl
          ? `${apiUrl}/uploads/${cms.bannerImage.replace(/^\//, "")}`
          : apiUrl
            ? `${apiUrl}/uploads/web/Zextons.webp`
            : "";

    const metadata: Metadata = {
      title: `${title} | Zextons Tech Store`,
      description,
      robots: "index, follow",
      openGraph: {
        siteName: "Zextons",
        title,
        url: canonicalUrl,
        description,
        type: "website",
        images: [{ url: ogImage }],
      },
      twitter: {
        card: "summary_large_image",
        site: "@ZextonsTechStore",
        title,
        description,
        images: [{ url: ogImage }],
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

  const metaData = await getStaticMetaFallback();

  if (!metaData) {
    return {
      title: "Deals and Discounts | Zextons Tech Store",
      description: "Latest deals and discounts at Zextons Tech Store",
      robots: "index, follow",
    };
  }

  const ogDefault = apiUrl ? `${apiUrl}/uploads/web/Zextons.webp` : "";

  return {
    title: metaData.titleTag || "Deals and Discounts | Zextons Tech Store",
    description:
      metaData.metaDescription ||
      "Latest deals and discounts at Zextons Tech Store",
    keywords: metaData.metaKeywords,
    robots: "index, follow",
    openGraph: {
      siteName: "Zextons",
      title: metaData.titleTag || "Deals and Discounts",
      url: canonicalUrl,
      description:
        metaData.metaDescription ||
        "Latest deals and discounts at Zextons Tech Store",
      type: "website",
      images: [{ url: ogDefault }],
    },
    twitter: {
      card: "summary_large_image",
      site: "@ZextonsTechStore",
      title: metaData.titleTag || "Deals and Discounts",
      description:
        metaData.metaDescription ||
        "Latest deals and discounts at Zextons Tech Store",
      images: [{ url: ogDefault }],
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

  const metaData = await getStaticMetaFallback();
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
