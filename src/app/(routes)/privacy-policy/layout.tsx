import type { Metadata } from "next";
import { metadataForFooterPolicyPage } from "@/app/lib/policyFooterPageMetadata";
import { getPolicyPageJsonLdStrings } from "@/app/lib/policyPageJsonLd";

const FOOTER_PAGE_SLUG = "privacy-policy";

export async function generateMetadata(): Promise<Metadata> {
  return metadataForFooterPolicyPage("/privacy-policy", FOOTER_PAGE_SLUG);
}

export default async function PrivacyPolicyLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const jsonLdStrings = await getPolicyPageJsonLdStrings(FOOTER_PAGE_SLUG);

  return (
    <>
      {jsonLdStrings.map((json, index) => (
        <script
          key={`privacy-policy-jsonld-${index}`}
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: json }}
        />
      ))}
      {children}
    </>
  );
}
