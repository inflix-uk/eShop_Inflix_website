import { SpeedInsights } from "@vercel/speed-insights/next";
import type { Metadata } from "next";

async function getMetaData() {
  try {
    const apiUrl = process.env.NEXT_PUBLIC_API_URL;
    const res = await fetch(
      `${apiUrl}/get/static-meta-page/path/${encodeURIComponent("/shipping-policy")}`,
      { cache: "no-store" }
    );
    if (!res.ok) return null;
    const data = await res.json();
    return data.success ? data.data : null;
  } catch {
    return null;
  }
}

export async function generateMetadata(): Promise<Metadata> {
  const metaData = await getMetaData();

  if (!metaData) {
    return {
      title: "Shipping Policy | Store",
      description: "Shipping policy for Store",
      robots: "index, follow",
    };
  }

  return {
    title: metaData.titleTag,
    description: metaData.metaDescription,
    keywords: metaData.metaKeywords,
    robots: "index, follow",
    openGraph: {
      siteName: "our store",
      title: metaData.titleTag,
      url: "https:///shipping-policy",
      description: metaData.metaDescription,
      type: "website",
      images: [{ url: `${process.env.NEXT_PUBLIC_API_URL}/` }],
    },
    twitter: {
      card: "summary_large_image",
      site: "",
      title: metaData.titleTag,
      description: metaData.metaDescription,
      images: [{ url: `${process.env.NEXT_PUBLIC_API_URL}/` }],
    },
    alternates: {
      canonical: "https:///shipping-policy",
      languages: { "en-gb": "https:///shipping-policy" },
    },
  };
}

export default async function ShippingPolicyLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const metaData = await getMetaData();

  return (
    <>
      <SpeedInsights />
      {metaData?.metaSchemas?.map((schema: string, index: number) => (
        <script
          key={index}
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: schema }}
        />
      ))}
      {children}
    </>
  );
}
