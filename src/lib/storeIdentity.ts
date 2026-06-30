import { cache } from "react";
import { getHomepagePublicSeo } from "@/app/services/homepageDataService";
import { getLogoSettingsPublic } from "@/app/services/logoService";

/** Generic fallback when admin has not set logo alt text. */
export const DEFAULT_LOGO_ALT = "Store logo";

export type StoreIdentity = {
  siteName: string;
  logoAlt: string;
  ogImageUrl: string | null;
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

  const ogImageUrl = branding?.logoUrl?.trim() || null;

  return { siteName, logoAlt, ogImageUrl };
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
  url: string | null | undefined
): { url: string }[] {
  const u = (url || "").trim();
  return u ? [{ url: u }] : [];
}
