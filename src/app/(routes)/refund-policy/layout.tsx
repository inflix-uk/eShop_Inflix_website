import { SpeedInsights } from "@vercel/speed-insights/next";
import type { Metadata } from "next";
import { normalizeMetaSchemaJsonLdStrings } from "@/app/lib/homepageJsonLd";
import { metadataForFooterPolicyPage } from "@/app/lib/policyFooterPageMetadata";
import { fetchFooterPageBySlug } from "@/app/services/footerPageService";

const FOOTER_PAGE_SLUG = "refund-policy";

export async function generateMetadata(): Promise<Metadata> {
  return metadataForFooterPolicyPage("/refund-policy", FOOTER_PAGE_SLUG);
}

export default async function RefundPolicyLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  let page = null;
  try {
    page = await fetchFooterPageBySlug(FOOTER_PAGE_SLUG);
  } catch {
    /* ignore */
  }

  const jsonLdStrings = normalizeMetaSchemaJsonLdStrings(page?.metaSchema);

  return (
    <>
      <SpeedInsights />
      {jsonLdStrings.map((json, index) => (
        <script
          key={index}
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: json }}
        />
      ))}
      {children}
    </>
  );
}
