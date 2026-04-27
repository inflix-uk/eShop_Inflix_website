import type { Metadata } from "next";
import { getCanonical } from "@/lib/getCanonical";

export async function generateMetadata(): Promise<Metadata> {
  const canonicalUrl = await getCanonical("/blogs");

  return {
    title: "Tech Products Sale Blog | Latest Tips, Deals, and Reviews",
    description:
      "Explore our blog for expert tips, exclusive tech deals, and in-depth reviews of the latest gadgets. Stay updated and make informed purchase decisions with us.",
    keywords:
      "tech blog, gadget reviews, tech deals, tech tips, latest gadgets, tech product sale, Zextons blog",
    robots: "index, follow",
    openGraph: {
      siteName: "Zextons Tech Store",
      title: "Tech Products Sale Blog | Latest Tips, Deals, and Reviews",
      url: canonicalUrl,
      description:
        "Explore our blog for expert tech tips, exclusive deals, and detailed reviews of the latest gadgets. Stay informed with Zextons.",
      type: "website",
      images: [{ url: `${process.env.NEXT_PUBLIC_API_URL}/uploads/web/Zextons.webp` }],
    },
    twitter: {
      card: "summary_large_image",
      site: "@ZextonsTechStore",
      title: "Tech Products Sale Blog | Latest Tips, Deals, and Reviews",
      description:
        "Stay updated with the latest in tech! Explore expert tips, exclusive tech deals, and in-depth reviews of gadgets on our Zextons blog.",
      images: [{ url: `${process.env.NEXT_PUBLIC_API_URL}/uploads/web/Zextons.webp` }],
    },
    alternates: {
      canonical: canonicalUrl,
      languages: { "en-gb": canonicalUrl },
    },
  };
}

export default function BlogsLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return <>{children}</>;
}
