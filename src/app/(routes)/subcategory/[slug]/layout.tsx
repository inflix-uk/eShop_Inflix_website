import type { Metadata } from "next";
import { getCanonical } from "@/lib/getCanonical";

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

  return {
    title: metaTitle || "",
    description: metaDescription || "",
    keywords: metaKeywords || "",
    robots: "index, follow",
    openGraph: {
      siteName: "Zextons Tech Store",
      title: metaTitle || "",
      url: canonicalUrl,
      description: metaDescription || "",
      type: "website",
      images: [
        {
          url: banner?.path
            ? `${process.env.NEXT_PUBLIC_API_URL}/${banner.path}`
            : `${process.env.NEXT_PUBLIC_API_URL}/uploads/web/Zextons.webp`,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      site: "@ZextonsTechStore",
      title: metaTitle || "",
      description: metaDescription || "",
      images: [
        {
          url: banner?.path
            ? `${process.env.NEXT_PUBLIC_API_URL}/${banner.path}`
            : `${process.env.NEXT_PUBLIC_API_URL}/uploads/web/Zextons.webp`,
        },
      ],
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
