import type { Metadata } from "next";
import { getCanonical } from "@/lib/getCanonical";

export async function generateMetadata(): Promise<Metadata> {
  const canonicalUrl = await getCanonical("/categories");

  return {
    title: "",
    description: "",
    robots: "index, follow",
    openGraph: {
      title: "",
      description: "",
      url: canonicalUrl,
      type: "website",
      images: [],
    },
    twitter: {
      card: "summary_large_image",
      title: "",
      description: "",
      images: [],
    },
    alternates: {
      canonical: canonicalUrl,
      languages: { "en-gb": canonicalUrl },
    },
  };
}

export default async function CategoriesLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
