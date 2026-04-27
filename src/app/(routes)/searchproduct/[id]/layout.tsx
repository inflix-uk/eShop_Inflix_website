import type { Metadata } from "next";
import { getCanonical } from "@/lib/getCanonical";

type Props = {
  children: React.ReactNode;
  params: Promise<{ id: string }>;
};

export async function generateMetadata({
  params,
}: Props): Promise<Metadata> {
  const { id } = await params;

  const canonicalUrl = await getCanonical(`/searchproduct/${id}`);

  const title = "Search | Zextons Tech Store";
  const description = "Search for products on Zextons Tech Store";

  return {
    title,
    description,
    robots: "index, follow",

    openGraph: {
      siteName: "Zextons Tech Store",
      title,
      description,
      url: canonicalUrl,
      type: "website",
    },

    twitter: {
      card: "summary_large_image",
      title,
      description,
    },

    alternates: {
      canonical: canonicalUrl,
    },
  };
}

export default function SearchProductLayout({
  children,
  params: _params,
}: Props) {
  return <>{children}</>;
}