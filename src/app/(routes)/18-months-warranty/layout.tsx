import type { Metadata } from "next";
import { getCanonical } from "@/lib/getCanonical";

export async function generateMetadata(): Promise<Metadata> {
  const canonicalUrl = await getCanonical("/18-months-warranty");
  return {
    title: "18-Month Warranty | Zextons Tech Store",
    description:
      "Refurbished devices include an 18-month warranty; new devices include 12 months. Learn what is covered and how to claim support.",
    robots: "index, follow",
    openGraph: {
      siteName: "Zextons Tech Store",
      title: "18-Month Warranty | Zextons Tech Store",
      description:
        "Warranty coverage for refurbished and new tech purchased from Zextons.",
      url: canonicalUrl,
      type: "website",
      images: [{ url: `${process.env.NEXT_PUBLIC_API_URL}/uploads/web/Zextons.webp` }],
    },
    alternates: {
      canonical: canonicalUrl,
      languages: { "en-gb": canonicalUrl },
    },
  };
}

export default function EighteenMonthWarrantyLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return <>{children}</>;
}
