import type { Metadata } from "next";
import { getCanonical } from "@/lib/getCanonical";

function toOriginalCase(slug: string) {
  return slug
    .split("-")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join("-");
}

async function getSubCategoryData(subcategoryName: string) {
  try {
    let res = await fetch(
      `${process.env.NEXT_PUBLIC_API_URL}/get/subcategorydetails/${encodeURIComponent(subcategoryName)}`,
      { next: { revalidate: 60 } }
    );

    if (!res.ok && subcategoryName !== toOriginalCase(subcategoryName)) {
      res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/get/subcategorydetails/${encodeURIComponent(toOriginalCase(subcategoryName))}`,
        { next: { revalidate: 60 } }
      );
    }

    if (!res.ok) return null;

    const data = await res.json();
    return data;
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

  const response = await getSubCategoryData(subcategory);

  if (!response) {
    return {
      title: "",
      description: "",
    };
  }
  const { metaTitle, metaDescription, metaKeywords, banner } = response;
  const canonicalUrl = await getCanonical(`/categories/${slug}/${subcategory}`);
  const bannerUrl = banner?.path
    ? `${process.env.NEXT_PUBLIC_API_URL}/${banner.path}`
    : undefined;
  const kw = metaKeywords || "";

  return {
    title: metaTitle || "",
    description: metaDescription || "",
    ...(kw ? { keywords: kw } : {}),
    robots: "index, follow",
    openGraph: {
      title: metaTitle || "",
      url: canonicalUrl,
      description: metaDescription || "",
      type: "website",
      ...(bannerUrl ? { images: [{ url: bannerUrl }] } : {}),
    },
    twitter: {
      card: "summary_large_image",
      title: metaTitle || "",
      description: metaDescription || "",
      ...(bannerUrl ? { images: [{ url: bannerUrl }] } : {}),
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
