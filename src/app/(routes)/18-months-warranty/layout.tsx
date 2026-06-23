import type { Metadata } from "next";
import { buildStorePageMetadata } from "@/lib/pageMetadata";

export async function generateMetadata(): Promise<Metadata> {
  return buildStorePageMetadata({
    path: "/18-months-warranty",
    fallbackTitle: "Warranty",
    fallbackDescription: "Warranty coverage and support information.",
  });
}

export default function EighteenMonthWarrantyLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return <>{children}</>;
}
