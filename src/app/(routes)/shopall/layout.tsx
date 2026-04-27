import type { Metadata } from "next";
import { SpeedInsights } from "@vercel/speed-insights/next";
import { getCanonical } from "@/lib/getCanonical";

export async function generateMetadata(): Promise<Metadata> {
  const canonicalUrl = await getCanonical("/shopall");

  return {
    title: "Shop All Products | Explore Latest Tech Deals & Gadgets",
    description:
      "Discover a wide range of tech products, including mobiles, laptops, gaming consoles, and accessories. Shop all categories with great deals and fast delivery.",
    keywords:
      "shop tech products, tech deals, mobiles, laptops, gaming consoles, tech accessories, fast delivery, Zextons products",
    robots: "index, follow",
    openGraph: {
      siteName: "Zextons",
      title: "Shop All Products | Explore Latest Tech Deals & Gadgets",
      url: canonicalUrl,
      description:
        "Discover a wide range of tech products, including mobiles, laptops, gaming consoles, and accessories. Shop all categories with great deals and fast delivery.",
      type: "website",
      images: [{ url: `${process.env.NEXT_PUBLIC_API_URL}/uploads/web/Zextons.webp` }],
    },
    twitter: {
      card: "summary_large_image",
      site: "@ZextonsTechStore",
      title: "Shop All Products | Explore Latest Tech Deals & Gadgets",
      description:
        "Discover a wide range of tech products, including mobiles, laptops, gaming consoles, and accessories. Shop all categories with great deals and fast delivery.",
      images: [{ url: `${process.env.NEXT_PUBLIC_API_URL}/uploads/web/Zextons.webp` }],
    },
    alternates: {
      canonical: canonicalUrl,
      languages: { "en-gb": canonicalUrl },
    },
  };
}

export default function ShopAllLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <>
      <SpeedInsights />
      {children}
    </>
  );
}
