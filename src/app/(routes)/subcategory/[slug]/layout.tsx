import type { Metadata } from "next";
import { getCanonical } from "@/lib/getCanonical";
import { getStoreIdentity, ogImagesFromUrl } from "@/lib/storeIdentity";

// Function to fetch subcategory data dynamically
async function getSubCategoryData(subcategoryName: string) {
  try {
    const res = await fetch(
      `${process.env.NEXT_PUBLIC_API_URL}/get/subcategorydetails/${encodeURIComponent(
        subcategoryName
      )}`,
      { next: { revalidate: 60 } } // Revalidate every 60 seconds for caching
    );

    if (!res.ok) {
      throw new Error("Failed to fetch SubCategory Data");
    }

    const data = await res.json();
    return data;
  } catch (error) {
    console.error("Error fetching subcategory data:", error);
    return null; // Return null if an error occurs
  }
}

// Generate dynamic metadata for the subcategory page
export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  if (!(await params)?.slug) {
    throw new Error("Invalid slug provided for subcategory.");
  }

  const subCategoryName = (await params).slug;
  const response = await getSubCategoryData(subCategoryName);

  if (!response) {
    throw new Error("Failed to fetch subcategory data.");
  }
  const { metaTitle, metaDescription, metaKeywords, banner } = response;
  const canonicalUrl = await getCanonical(`/subcategory/${subCategoryName}`);
  const identity = await getStoreIdentity();
  const apiBase = (process.env.NEXT_PUBLIC_API_URL || "").replace(/\/$/, "");
  const bannerUrl = banner?.path
    ? `${apiBase}/${String(banner.path).replace(/^\//, "")}`
    : identity.ogImageUrl;
  const images = ogImagesFromUrl(bannerUrl);

  return {
    title: metaTitle || "",
    description: metaDescription || "",
    keywords: metaKeywords || "",
    robots: "index, follow",
    openGraph: {
      ...(identity.siteName ? { siteName: identity.siteName } : {}),
      title: metaTitle || "",
      url: canonicalUrl,
      description: metaDescription || "",
      type: "website",
      ...(images.length ? { images } : {}),
    },
    twitter: {
      card: "summary_large_image",
      title: metaTitle || "",
      description: metaDescription || "",
      ...(images.length ? { images } : {}),
    },
    alternates: {
      canonical: canonicalUrl,
      languages: {
        "en-gb": canonicalUrl,
      },
    },
  };
}

// Layout Component for SubCategory
export default async function SubCategoryLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ slug: string }>;
}) {
  // const subCategoryName = transformSubCategoryName((await params).slug);

  return <>{children}</>;
}
