import type { Metadata } from "next";
import { getCanonical } from "@/lib/getCanonical";

export async function generateMetadata(): Promise<Metadata> {
  const canonicalUrl = await getCanonical("/subcategory");

  return {
    title:
      "Explore All Sub-Categories For Refurbished and Brand New Products | Zextons Tech Store",
    description:
      "Browse our All sub-Categories for You Shop Easy. Explore sub-Categories like Samsung Series, Apple Products and more at Zextons Tech Store. Find quality refurbished and brand new items at great prices. Shop Now!",
    keywords:
      "Samsung series, Apple products, subcategories, Zextons subcategories, tech store subcategories, electronics subcategories, product subcategories",
    robots: "index, follow",
    openGraph: {
      siteName: "Zextons Tech Store",
      title:
        "Explore All Sub-Categories For Refurbished and Brand New Products | Zextons Tech Store",
      url: canonicalUrl,
      description:
        "Browse our All sub-Categories for You Shop Easy. Explore sub-Categories like Samsung Series, Apple Products and more at Zextons Tech Store. Find quality refurbished and brand new items at great prices. Shop Now!",
      type: "website",
      images: [{ url: `${process.env.NEXT_PUBLIC_API_URL}/uploads/web/Zextons.webp` }],
    },
    twitter: {
      card: "summary_large_image",
      site: "@ZextonsTechStore",
      title:
        "Explore All Sub-Categories For Refurbished and Brand New Products | Zextons Tech Store",
      description:
        "Browse our All sub-Categories for You Shop Easy. Explore sub-Categories like Samsung Series, Apple Products and more at Zextons Tech Store. Find quality refurbished and brand new items at great prices. Shop Now!",
      images: [{ url: `${process.env.NEXT_PUBLIC_API_URL}/uploads/web/Zextons.webp` }],
    },
    alternates: {
      canonical: canonicalUrl,
      languages: { "en-gb": canonicalUrl },
    },
  };
}

export default async function SubCatgoriesLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
