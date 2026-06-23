import type { Metadata } from "next";
import {
  buildStorePageMetadata,
  fetchStaticMetaByPath,
} from "@/lib/pageMetadata";

export async function generateMetadata(): Promise<Metadata> {
  const metaData = await fetchStaticMetaByPath("/subscribe-newsletter");
  return buildStorePageMetadata({
    path: "/subscribe-newsletter",
    fallbackTitle: "Subscribe Newsletter",
    fallbackDescription: "Subscribe to our newsletter for updates and offers.",
    cmsMeta: metaData,
  });
}

export default async function SubscribeNewsletterLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const metaData = await fetchStaticMetaByPath("/subscribe-newsletter");

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
