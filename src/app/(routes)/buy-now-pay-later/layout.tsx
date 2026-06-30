import type { Metadata } from "next";
import { buildStorePageMetadata } from "@/lib/pageMetadata";

export async function generateMetadata(): Promise<Metadata> {
  return buildStorePageMetadata({
    path: "/buy-now-pay-later",
    fallbackTitle: "Buy Now, Pay Later",
    fallbackDescription: "Flexible payment options for your order.",
  });
}

export default function BuyNowPayLaterLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return <>{children}</>;
}
