import type { Metadata } from "next";
import {
  buildStorePageMetadata,
  fetchStaticMetaByPath,
} from "@/lib/pageMetadata";

export async function generateMetadata(): Promise<Metadata> {
  const metaData = await fetchStaticMetaByPath("/subcategory");
  return buildStorePageMetadata({
    path: "/subcategory",
    fallbackTitle: "Subcategories",
    fallbackDescription: "Browse product subcategories.",
    cmsMeta: metaData,
  });
}

export default async function SubCatgoriesLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
