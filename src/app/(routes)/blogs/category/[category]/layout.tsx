import type { Metadata } from "next";
import { getCanonical } from "@/lib/getCanonical";

type Props = {
  children: React.ReactNode;
  params: Promise<{ category: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { category } = await params;
  const canonicalUrl = await getCanonical(`/blogs/category/${category}`);
  return {
    title: `Blog category: ${category} | Zextons Tech Store`,
    description: `Browse blog posts in the ${category} category at Zextons Tech Store.`,
    robots: "index, follow",
    openGraph: {
      siteName: "Zextons Tech Store",
      title: `Blog category: ${category}`,
      url: canonicalUrl,
      type: "website",
      images: [{ url: `${process.env.NEXT_PUBLIC_API_URL}/uploads/web/Zextons.webp` }],
    },
    alternates: {
      canonical: canonicalUrl,
      languages: { "en-gb": canonicalUrl },
    },
  };
}

export default function BlogCategoryLayout({ children }: Props) {
  return <>{children}</>;
}
