import type { Metadata } from "next";
import { getCanonical } from "@/lib/getCanonical";

export async function generateMetadata(): Promise<Metadata> {
  const canonicalUrl = await getCanonical("/grading-guide");
  return {
    title: "Refurbished Grading Guide | Zextons Tech Store",
    description:
      "Understand refurbished grades, testing, battery health, and what to expect when you shop at Zextons.",
    robots: "index, follow",
    openGraph: {
      siteName: "Zextons Tech Store",
      title: "Refurbished Grading Guide | Zextons Tech Store",
      description:
        "Compare refurbished conditions and see how Zextons tests every device.",
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

export default function GradingGuideLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return <>{children}</>;
}
