import type { Metadata } from "next";
import { getCanonical } from "@/lib/getCanonical";

async function getMetaData() {
  try {
    const apiUrl = process.env.NEXT_PUBLIC_API_URL;
    const res = await fetch(
      `${apiUrl}/get/static-meta-page/path/${encodeURIComponent("/contact-us")}`,
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
  const canonicalUrl = await getCanonical("/contact-us");

  if (!metaData) {
    return {
      title: "Contact Us | Store",
      description: "Get in touch with Store",
      robots: "index, follow",
      alternates: { canonical: canonicalUrl, languages: { "en-gb": canonicalUrl } },
      openGraph: { url: canonicalUrl },
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
      url: canonicalUrl,
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
      canonical: canonicalUrl,
      languages: { "en-gb": canonicalUrl },
    },
  };
}

export default async function ContactUsLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const metaData = await getMetaData();

  return (
    <>
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
