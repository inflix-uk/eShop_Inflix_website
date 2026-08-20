import type { Metadata } from "next";
import { metadataForFooterPolicyPage } from "@/app/lib/policyFooterPageMetadata";
import { getPolicyPageJsonLdStrings } from "@/app/lib/policyPageJsonLd";

/** CMS footer-page slug (admin uses `terms-conditions`). */
const FOOTER_PAGE_SLUG = "terms-conditions";

export async function generateMetadata(): Promise<Metadata> {
  return metadataForFooterPolicyPage("/terms-conditions", FOOTER_PAGE_SLUG);
}

export default async function TermsConditionsLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const jsonLdStrings = await getPolicyPageJsonLdStrings(FOOTER_PAGE_SLUG);

  return (
    <>
      {jsonLdStrings.map((json, index) => (
        <script
          key={`terms-conditions-jsonld-${index}`}
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: json }}
        />
      ))}
      {children}
    </>
  );
}
