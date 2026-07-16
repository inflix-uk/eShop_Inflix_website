import type { Metadata } from "next";
import { metadataForFooterPolicyPage } from "@/app/lib/policyFooterPageMetadata";

const FOOTER_PAGE_SLUG = "terms-and-conditions";

export async function generateMetadata(): Promise<Metadata> {
  return metadataForFooterPolicyPage("/terms-and-conditions", FOOTER_PAGE_SLUG);
}

export default function TermsAndConditionsLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return children;
}
