import type { Metadata } from "next";
import {
  buildStorePageMetadata,
  fetchStaticMetaByPath,
} from "@/lib/pageMetadata";

export async function generateMetadata(): Promise<Metadata> {
  const metaData = await fetchStaticMetaByPath("/search");
  return buildStorePageMetadata({
    path: "/searchproduct",
    fallbackTitle: "Search",
    fallbackDescription: "Search for products in our store.",
    cmsMeta: metaData,
  });
}

export default function SearchProductLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return <>{children}</>;
}
