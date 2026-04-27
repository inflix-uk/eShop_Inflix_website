import type { Metadata } from "next";
import { getCanonical } from "@/lib/getCanonical";

export async function generateMetadata(): Promise<Metadata> {
  const canonicalUrl = await getCanonical("/Sustainability");
  return {
    title: "Sustainability at Zextons | Zextons Tech Store",
    description:
      "Giving technology a second life — responsibly. Learn how Zextons reduces e-waste and supports sustainable tech in the UK.",
    robots: "index, follow",
    openGraph: {
      siteName: "Zextons Tech Store",
      title: "Sustainability at Zextons | Zextons Tech Store",
      description:
        "Refurbished tech, lower emissions, and less e-waste — Zextons sustainability mission.",
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

export default function SustainabilityLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return <>{children}</>;
}
