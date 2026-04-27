import type { Metadata } from "next";
import { getCanonical } from "@/lib/getCanonical";

export async function generateMetadata(): Promise<Metadata> {
  const canonicalUrl = await getCanonical("/buy-now-pay-later");
  return {
    title: "Buy Now, Pay Later | Zextons Tech Store",
    description:
      "Spread the cost with Klarna, Clearpay, and PayPal. Learn how buy now, pay later works at Zextons Tech Store.",
    robots: "index, follow",
    openGraph: {
      siteName: "Zextons Tech Store",
      title: "Buy Now, Pay Later | Zextons Tech Store",
      description:
        "Flexible payment options including Klarna, Clearpay, and PayPal at Zextons.",
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

export default function BuyNowPayLaterLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return <>{children}</>;
}
