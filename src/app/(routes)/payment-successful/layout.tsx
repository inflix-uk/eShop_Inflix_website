import type { Metadata } from "next";
import { getCanonical } from "@/lib/getCanonical";

export async function generateMetadata(): Promise<Metadata> {
  const canonicalUrl = await getCanonical("/payment-successful");
  return {
    title: "Payment successful | Zextons Tech Store",
    description: "Your payment was completed successfully.",
    robots: "noindex, follow",
    openGraph: { url: canonicalUrl, type: "website" },
    alternates: { canonical: canonicalUrl },
  };
}

export default function PaymentSuccessfulLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return <>{children}</>;
}
