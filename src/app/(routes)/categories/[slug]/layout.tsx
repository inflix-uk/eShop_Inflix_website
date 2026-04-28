import type { Metadata } from "next";
import { getCanonical } from "@/lib/getCanonical";
import { resolveCategoryImageSrc } from "@/lib/categoryBannerSrc";
function toOriginalCase(slug: string) {
  return slug
    .split("-")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join("-");
}

async function getCategoryData(categoryName: string) {
  try {
    // Try original slug first
    let res = await fetch(
      `${process.env.NEXT_PUBLIC_API_URL}/get/categorydetails/${encodeURIComponent(categoryName)}`,
      { next: { revalidate: 60 } }
    );

    // If lowercase slug failed, try title-case version
    if (!res.ok && categoryName !== toOriginalCase(categoryName)) {
      res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/get/categorydetails/${encodeURIComponent(toOriginalCase(categoryName))}`,
        { next: { revalidate: 60 } }
      );
    }

    if (!res.ok) return null;

    const data = await res.json();
    return data.category;
  } catch (error) {
    console.error("Error fetching category data:", error);
    return null;
  }
}


export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  if (!(await params)?.slug) {
    throw new Error("Invalid slug provided for category.");
  }

  // const categoryName = transformCategoryName((await params).slug);
  const categoryName = (await params).slug;
  const category = await getCategoryData(categoryName);

  if (!category) {
    return {
      title: "",
      description: "",
    };
  }

  const { slug } = await params;
  const canonicalUrl = await getCanonical(`/categories/${slug}`);

  const metaKeywords = category?.metaKeywords || "";
  const bannerUrl =
    resolveCategoryImageSrc(category?.bannerImage) ?? undefined;

  return {
    title: category?.metaTitle || "",
    description: category?.metaDescription || "",
    ...(metaKeywords ? { keywords: metaKeywords } : {}),
    robots: "index, follow",
    openGraph: {
      title: category?.metaTitle || "",
      url: canonicalUrl,
      description: category?.metaDescription || "",
      type: "website",
      ...(bannerUrl ? { images: [{ url: bannerUrl }] } : {}),
    },
    twitter: {
      card: "summary_large_image",
      title: category?.metaTitle || "",
      description: category?.metaDescription || "",
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

export default async function CategoryLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ slug: string }>;
}) {
  return (
    <>
      {children}
    </>
  );
}
