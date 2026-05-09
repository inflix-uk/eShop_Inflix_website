import type { Metadata } from "next";
import { getCanonical } from "@/lib/getCanonical";

function resolveBlogImage(raw: string | undefined): string | null {
  const value = String(raw || "").trim();
  if (!value) return null;
  if (value.startsWith("http://") || value.startsWith("https://") || value.startsWith("data:")) {
    return value;
  }
  const apiBase = String(process.env.NEXT_PUBLIC_API_URL || "").replace(/\/+$/, "");
  if (!apiBase) return value.startsWith("/") ? value : `/${value}`;
  return value.startsWith("/") ? `${apiBase}${value}` : `${apiBase}/${value}`;
}

async function getLatestBlogsOgImage(): Promise<string | null> {
  const apiBase = String(process.env.NEXT_PUBLIC_API_URL || "").replace(/\/+$/, "");
  if (!apiBase) return null;

  try {
    const res = await fetch(`${apiBase}/get/blog/latest`, {
      next: { revalidate: 300 },
      cache: "force-cache",
    });
    if (!res.ok) return null;

    const body = await res.json();
    const list = Array.isArray(body?.data) ? body.data : [];
    const first = list[0] || {};

    // Support both legacy and new blog shapes.
    const candidates = [
      first?.bannerImage,
      first?.featuredImage,
      first?.thumbnailImage,
      first?.blogImage,
      first?.metaImage,
    ];

    for (const candidate of candidates) {
      const resolved = resolveBlogImage(typeof candidate === "string" ? candidate : "");
      if (resolved) return resolved;
    }
    return null;
  } catch {
    return null;
  }
}

function deriveSiteNameFromTitle(rawTitle: string): string {
  const title = String(rawTitle || "").trim();
  if (!title) return "";
  if (title.includes("|")) {
    const parts = title
      .split("|")
      .map((p) => p.trim())
      .filter(Boolean);
    return parts[parts.length - 1] || "";
  }
  return "";
}

async function getBlogsMetaFromBackend(): Promise<{
  title: string;
  description: string;
  keywords: string;
  siteName: string;
}> {
  const apiBase = String(process.env.NEXT_PUBLIC_API_URL || "").replace(/\/+$/, "");
  if (!apiBase) {
    return { title: "", description: "", keywords: "", siteName: "" };
  }

  let blogsMeta: any = null;
  let homepageSeo: any = null;

  try {
    const res = await fetch(`${apiBase}/get/static-meta-page/path/${encodeURIComponent("/blogs")}`, {
      cache: "no-store",
    });
    if (res.ok) blogsMeta = await res.json();
  } catch {
    // ignore and try homepage seo below
  }

  try {
    const res = await fetch(`${apiBase}/homepage-data/public/seo`, {
      next: { revalidate: 300 },
    });
    if (res.ok) homepageSeo = await res.json();
  } catch {
    // ignore
  }

  const blogsTitle = String(blogsMeta?.data?.titleTag || "").trim();
  const blogsDesc = String(blogsMeta?.data?.metaDescription || "").trim();
  const blogsKeywords = String(blogsMeta?.data?.metaKeywords || "").trim();

  const homeTitle = String(homepageSeo?.data?.metaTitle || "").trim();
  const homeDesc = String(homepageSeo?.data?.metaDescription || "").trim();
  const homeKeywords = Array.isArray(homepageSeo?.data?.metaTags)
    ? homepageSeo.data.metaTags.filter((t: unknown) => typeof t === "string").join(", ")
    : "";

  const title = blogsTitle || homeTitle;
  const description = blogsDesc || homeDesc;
  const keywords = blogsKeywords || homeKeywords;
  const siteName = deriveSiteNameFromTitle(title || homeTitle);

  return { title, description, keywords, siteName };
}

export async function generateMetadata(): Promise<Metadata> {
  const canonicalUrl = await getCanonical("/blogs");
  const { title, description, keywords, siteName } = await getBlogsMetaFromBackend();
  const ogImage = await getLatestBlogsOgImage();

  return {
    title,
    description,
    ...(keywords ? { keywords } : {}),
    robots: "index, follow",
    openGraph: {
      ...(siteName ? { siteName } : {}),
      title,
      url: canonicalUrl,
      description,
      type: "website",
      ...(ogImage ? { images: [{ url: ogImage, alt: title || "Blog cover" }] } : {}),
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      ...(ogImage ? { images: [ogImage] } : {}),
    },
    alternates: {
      canonical: canonicalUrl,
      languages: { "en-gb": canonicalUrl },
    },
  };
}

export default function BlogsLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return <>{children}</>;
}
