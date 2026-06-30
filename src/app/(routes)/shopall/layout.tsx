import type { Metadata } from "next";
import { SpeedInsights } from "@vercel/speed-insights/next";
import {
  buildStorePageMetadata,
  fetchStaticMetaByPath,
} from "@/lib/pageMetadata";

export async function generateMetadata(): Promise<Metadata> {
  const metaData = await fetchStaticMetaByPath("/shopall");
  return buildStorePageMetadata({
    path: "/shopall",
    fallbackTitle: "Shop All Products",
    fallbackDescription: "Browse all products in our store.",
    cmsMeta: metaData,
  });
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
