import type { Metadata } from "next";
import { getCanonical } from "@/lib/getCanonical";

export async function generateMetadata(): Promise<Metadata> {
  const canonicalUrl = await getCanonical("/checkout/thank-you");
  return {
    title: "Thank you | Zextons Tech Store",
    description: "Thank you for your order.",
    robots: "noindex, follow",
    openGraph: { url: canonicalUrl, type: "website" },
    alternates: { canonical: canonicalUrl },
  };
}

export default function CheckoutThankYouLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return <>{children}</>;
}
