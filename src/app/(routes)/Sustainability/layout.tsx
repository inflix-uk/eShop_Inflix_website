import type { Metadata } from "next";
import { buildStorePageMetadata } from "@/lib/pageMetadata";

export async function generateMetadata(): Promise<Metadata> {
  return buildStorePageMetadata({
    path: "/Sustainability",
    fallbackTitle: "Sustainability",
    fallbackDescription: "Learn about our sustainability practices.",
  });
}

export default function SustainabilityLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return <>{children}</>;
}
