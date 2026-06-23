import type { Metadata } from "next";
import { buildStorePageMetadata } from "@/lib/pageMetadata";

export async function generateMetadata(): Promise<Metadata> {
  return buildStorePageMetadata({
    path: "/checkout/thank-you",
    fallbackTitle: "Thank you",
    fallbackDescription: "Your order has been received.",
  });
}

export default function ThankYouLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return <>{children}</>;
}
