import type { Metadata } from "next";
import { getCanonical } from "@/lib/getCanonical";
import { resolveCategoryImageSrc } from "@/lib/categoryBannerSrc";

function toOriginalCase(slug: string) {
  return slug
    .split("-")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join("-");
}

async function getSubCategoryData(subcategoryName: string) {
  try {
    let res = await fetch(
      `${process.env.NEXT_PUBLIC_API_URL}/get/subcategory/somedetails/${encodeURIComponent(subcategoryName)}`,
      { cache: "no-store" }
    );

    if (!res.ok && subcategoryName !== toOriginalCase(subcategoryName)) {
      res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/get/subcategory/somedetails/${encodeURIComponent(toOriginalCase(subcategoryName))}`,
        { cache: "no-store" }
      );
    }

    if (!res.ok) return null;

    const data = await res.json();
    return data?.subcategoryDetails || null;
  } catch (error) {
    console.error("Error fetching subcategory data:", error);
    return null;
  }
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string; subcategory: string }>;
}): Promise<Metadata> {
  const { slug, subcategory } = await params;

  if (!subcategory) {
    throw new Error("Invalid slug provided for subcategory.");
  }

  const subcategoryData = await getSubCategoryData(subcategory);

  if (!subcategoryData) {
    return {
      title: "",
      description: "",
    };
  }
  const metaTitle = String(subcategoryData?.metaTitle || "").trim();
  const metaDescription = String(subcategoryData?.metaDescription || "").trim();
  const metaKeywords = String(subcategoryData?.metaKeywords || "").trim();
  const canonicalUrl = await getCanonical(`/categories/${slug}/${subcategory}`);
  const bannerUrl = resolveCategoryImageSrc(subcategoryData?.banner);

  return {
    title: metaTitle,
    description: metaDescription,
    ...(metaKeywords ? { keywords: metaKeywords } : {}),
    robots: "index, follow",
    openGraph: {
      title: metaTitle,
      url: canonicalUrl,
      description: metaDescription,
      type: "website",
      ...(bannerUrl
        ? {
            images: [
              {
                url: bannerUrl,
                alt: metaTitle,
              },
            ],
          }
        : {}),
    },
    twitter: {
      card: "summary_large_image",
      title: metaTitle,
      description: metaDescription,
      ...(bannerUrl ? { images: [bannerUrl] } : {}),
    },
    alternates: {
      canonical: canonicalUrl,
      languages: {
        "en-gb": canonicalUrl,
      },
    },
  };
}

export default async function SubCategoryLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ slug: string; subcategory: string }>;
}) {
  return <>{children}</>;
}
