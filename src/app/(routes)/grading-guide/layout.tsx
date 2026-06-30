import type { Metadata } from "next";
import { buildStorePageMetadata } from "@/lib/pageMetadata";

export async function generateMetadata(): Promise<Metadata> {
  return buildStorePageMetadata({
    path: "/grading-guide",
    fallbackTitle: "Product Grading Guide",
    fallbackDescription: "Understand product condition grades and what to expect.",
  });
}

export default function GradingGuideLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return <>{children}</>;
}
