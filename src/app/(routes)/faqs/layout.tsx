import type { Metadata } from "next";
import {
  buildStorePageMetadata,
  fetchStaticMetaByPath,
} from "@/lib/pageMetadata";

export async function generateMetadata(): Promise<Metadata> {
  const metaData = await fetchStaticMetaByPath("/faqs");
  return buildStorePageMetadata({
    path: "/faqs",
    fallbackTitle: "FAQs",
    fallbackDescription: "Frequently asked questions.",
    cmsMeta: metaData,
  });
}

export default async function FAQSLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const metaData = await fetchStaticMetaByPath("/faqs");

  return (
    <>
      {metaData?.metaSchemas?.map((schema: string, index: number) => (
        <script
          key={index}
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: schema }}
        />
      ))}
      {children}
    </>
  );
}
