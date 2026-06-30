import type { Metadata } from "next";
import { getCanonical } from "@/lib/getCanonical";
import {
  formatPageTitle,
  getStoreIdentity,
  ogImagesFromUrl,
} from "@/lib/storeIdentity";

export type StaticMetaPagePayload = {
  titleTag?: string;
  metaDescription?: string;
  metaKeywords?: string;
  metaSchemas?: string[];
} | null;

export async function fetchStaticMetaByPath(
  path: string
): Promise<StaticMetaPagePayload> {
  try {
    const apiUrl = process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, "");
    if (!apiUrl) return null;
    const res = await fetch(
      `${apiUrl}/get/static-meta-page/path/${encodeURIComponent(path)}`,
      { next: { revalidate: 300 } }
    );
    if (!res.ok) return null;
    const data = await res.json();
    return data?.success && data.data ? data.data : null;
  } catch {
    return null;
  }
}

type BuildStorePageMetadataOptions = {
  path: string;
  fallbackTitle: string;
  fallbackDescription?: string;
  cmsMeta?: StaticMetaPagePayload;
};

/** Tenant-agnostic metadata: site name and OG image from admin CMS per deployment. */
export async function buildStorePageMetadata(
  opts: BuildStorePageMetadataOptions
): Promise<Metadata> {
  const {
    path,
    fallbackTitle,
    fallbackDescription = "",
    cmsMeta = null,
  } = opts;

  const [canonicalUrl, identity] = await Promise.all([
    getCanonical(path),
    getStoreIdentity(),
  ]);

  const title =
    cmsMeta?.titleTag?.trim() ||
    formatPageTitle(fallbackTitle, identity.siteName);
  const description =
    cmsMeta?.metaDescription?.trim() || fallbackDescription;
  const keywords = cmsMeta?.metaKeywords?.trim();
  const images = ogImagesFromUrl(identity.ogImageUrl);

  return {
    title,
    description,
    ...(keywords ? { keywords } : {}),
    robots: "index, follow",
    openGraph: {
      ...(identity.siteName ? { siteName: identity.siteName } : {}),
      title,
      url: canonicalUrl,
      description,
      type: "website",
      ...(images.length ? { images } : {}),
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      ...(images.length ? { images } : {}),
    },
    alternates: {
      canonical: canonicalUrl,
      languages: { "en-gb": canonicalUrl },
    },
  };
}
