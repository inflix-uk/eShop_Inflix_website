import { cache } from "react";
import { cmsServerFetchJson } from "@/app/lib/cmsServerFetch";
import {
  buildHeroBannersFromApiPayload,
  extractHeroSocialFromActiveBannersPayload,
  type Banner,
  type HeroSocialSettings,
} from "@/app/lib/homepageBannerShared";

function apiBase(): string {
  return (process.env.NEXT_PUBLIC_API_URL || "").replace(/\/$/, "");
}

export type HomepageHeroPayload = {
  banners: Banner[];
  heroSocial: HeroSocialSettings;
};

/** Active hero banners + hero social links (Admin → Banners). */
export const getHomepageHeroBannersCached = cache(async (): Promise<HomepageHeroPayload> => {
  const base = apiBase();
  if (!base) {
    return { banners: [], heroSocial: extractHeroSocialFromActiveBannersPayload(null) };
  }
  try {
    const data = await cmsServerFetchJson<unknown>(
      `${base}/get/banners/active`
    );
    return {
      banners: buildHeroBannersFromApiPayload(data, base),
      heroSocial: extractHeroSocialFromActiveBannersPayload(data),
    };
  } catch (e) {
    console.warn("[activeBannersPublicService] fetch failed:", e);
    return { banners: [], heroSocial: extractHeroSocialFromActiveBannersPayload(null) };
  }
});
