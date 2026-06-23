import type { Metadata } from "next";
import { buildStorePageMetadata } from "@/lib/pageMetadata";

export async function generateMetadata(): Promise<Metadata> {
  return buildStorePageMetadata({
    path: "/why-buying-a-refurbished-iphone-is-a-good-idea",
    fallbackTitle: "Why Buy Refurbished?",
    fallbackDescription: "Learn about the benefits of buying refurbished products.",
  });
}

export default function WhyRefurbishedLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return <>{children}</>;
}
