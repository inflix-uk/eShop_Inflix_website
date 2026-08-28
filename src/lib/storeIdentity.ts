import { cache } from "react";
import { getHomepagePublicSeo } from "@/app/services/homepageDataService";
import { getLogoSettingsPublic } from "@/app/services/logoService";
import { getPodcastStudioPhotoUrls } from "@/app/lib/podcastShareImage";

/** Generic fallback when admin has not set logo alt text. */
export const DEFAULT_LOGO_ALT = "Store logo";

export type StoreIdentity = {
  siteName: string;
  logoAlt: string;
  /** Navbar / schema logo. Not used as the Google share thumbnail on podcast. */
  logoUrl: string | null;
  /** Open Graph / Twitter image. Podcast store uses a studio photo, not the logo. */
  ogImageUrl: string | null;
  ogImageAlt: string;
};

/** Last segment after `|` in CMS title tags, or the full title when no pipe. */
export function deriveSiteNameFromTitle(rawTitle: string): string {
  const title = String(rawTitle || "").trim();
  if (!title) return "";
  if (title.includes("|")) {
    const parts = title
      .split("|")
      .map((p) => p.trim())
      .filter(Boolean);
    return parts[parts.length - 1] || "";
  }
  return title;
}

export const getStoreIdentity = cache(async (): Promise<StoreIdentity> => {
  const [seo, branding] = await Promise.all([
    getHomepagePublicSeo().catch(() => null),
    getLogoSettingsPublic().catch(() => null),
  ]);

  const metaTitle = seo?.metaTitle?.trim() || "";
  const logoAlt = branding?.altText?.trim() || DEFAULT_LOGO_ALT;
  const siteName =
    deriveSiteNameFromTitle(metaTitle) ||
    (logoAlt !== DEFAULT_LOGO_ALT ? logoAlt : "");

  const logoUrl = branding?.logoUrl?.trim() || null;
  const studioPhotos = await getPodcastStudioPhotoUrls();
  const ogImageUrl = studioPhotos[0] || logoUrl;
  const ogImageAlt = studioPhotos[0]
    ? siteName
      ? `${siteName} recording studio`
      : "Podcast recording studio"
    : logoAlt;

  return { siteName, logoAlt, logoUrl, ogImageUrl, ogImageAlt };
});

export function formatPageTitle(pageTitle: string, siteName?: string): string {
  const page = pageTitle.trim();
  const site = (siteName || "").trim();
  if (!page) return site;
  if (!site) return page;
  if (page.toLowerCase().includes(site.toLowerCase())) return page;
  return `${page} | ${site}`;
}

export function ogImagesFromUrl(
  url: string | null | undefined,
  alt?: string | null
): { url: string; alt?: string }[] {
  const u = (url || "").trim();
  if (!u) return [];
  const a = (alt || "").trim();
  return a ? [{ url: u, alt: a }] : [{ url: u }];
}

export function shareImagesForPage(
  pageImage: string | null | undefined,
  identity?: Pick<StoreIdentity, "ogImageUrl" | "ogImageAlt"> | null
): { url: string; alt?: string }[] {
  const page = (pageImage || "").trim();
  if (page) return ogImagesFromUrl(page);
  return ogImagesFromUrl(identity?.ogImageUrl, identity?.ogImageAlt);
}
