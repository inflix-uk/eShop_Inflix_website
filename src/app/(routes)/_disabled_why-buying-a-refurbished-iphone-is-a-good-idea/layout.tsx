import type { Metadata } from "next";
import { SpeedInsights } from "@vercel/speed-insights/next";

export const metadata: Metadata = {
  title: "Why Buying a Refurbished iPhone is a Good Idea? | our store",
  description:
    "Choosing a refurbished iPhone helps reduce e-waste and supports sustainability. Save money and the planet with quality, eco-friendly devices from our store.",
  keywords:
    "refurbished iPhone benefits, eco-friendly iPhones, save money with refurbished phones, sustainable technology, refurbished devices, reduce e-waste",
  robots: "index, follow",
  openGraph: {
    siteName: "Store",
    title: "Why Buying a Refurbished iPhone is a Good Idea? | our store",
    url: "https:///why-buying-a-refurbished-iphone-is-a-good-idea",
    description:
      "Discover the benefits of buying a refurbished iPhone from our store. Save money, reduce e-waste, and support sustainability with high-quality, eco-friendly devices.",
    type: "website",
    images: [{ url: `${process.env.NEXT_PUBLIC_API_URL}/` }],
  },
  twitter: {
    card: "summary_large_image",
    site: "",
    title: "Why Buying a Refurbished iPhone is a Good Idea? | our store",
    description:
      "Choosing a refurbished iPhone helps reduce e-waste and supports sustainability. Save money and the planet with quality, eco-friendly devices from our store.",
    images: [{ url: `${process.env.NEXT_PUBLIC_API_URL}/` }],
  },
  alternates: {
    canonical:
      "https:///why-buying-a-refurbished-iphone-is-a-good-idea",
    languages: {
      "en-gb":
        "https:///why-buying-a-refurbished-iphone-is-a-good-idea",
    },
  },
};

export default function RefurbishedPhonesLayout({
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
