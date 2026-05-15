import { cache } from "react";
import {
  getHomepageData,
  getHomepageNewsletterWidgetPublic,
  type HomepageBlock,
  type HomepageNewsletterSingleton,
} from "@/app/services/homepageDataService";
import { getSiteWidgetSettingsPublic } from "@/app/services/siteWidgetSettingsService";
import {
  DEFAULT_SITE_WIDGET_VISIBILITY,
  type SiteWidgetVisibility,
} from "@/app/lib/siteWidgetVisibilityDefaults";
import {
  getTrustpilotSettings,
  type TrustpilotSettings,
} from "@/app/services/trustpilotService";
import {
  getCategoryCardsSectionSettings,
  type CategoryCardsSectionSettings,
} from "@/app/services/categoryCardsService";
import {
  getHomeNavLinksPublicServer,
  type HomeNavLink,
} from "@/app/services/homeNavLinksService";
import {
  getBuyNowPayLater,
  getSellBuyCards,
  getTinyPhoneBanner,
  type BuyNowPayLater,
  type SellBuyCards,
  type TinyPhoneBanner,
} from "@/app/services/promotionalSectionsService";
import { getLogo } from "@/app/services/logoService";
import { mergePublicStoreLogoIntoHomepageBlocks } from "@/app/lib/mergePublicStoreLogoIntoHomepageBlocks";
import type { PublicStoreLogoPayload } from "@/app/lib/mergePublicStoreLogoIntoHomepageBlocks";

export type HomeServerCmsBundle = {
  homepageBlocks: HomepageBlock[];
  /** Same public logo as global header; used to patch navbar widgets + client refetch merge. */
  publicStoreLogo: PublicStoreLogoPayload | null;
  newsletterWidget: HomepageNewsletterSingleton | null;
  widgetVisibility: SiteWidgetVisibility;
  trustpilotSettings: TrustpilotSettings | null;
  categoryCardsSection: CategoryCardsSectionSettings;
  homeNavLinks: HomeNavLink[];
  buyNowPayLater: BuyNowPayLater | null;
  sellBuyCards: SellBuyCards | null;
  tinyPhoneBanner: TinyPhoneBanner | null;
};

const FALLBACK_CATEGORY_CARDS: CategoryCardsSectionSettings = {
  headingText: "Popular Categories",
  headingColor: "var(--secondary)",
  dividerColor: "#000000",
  sectionBackgroundColor: "",
};

/** Safe defaults when the homepage CMS bundle cannot be loaded (API down / timeout). */
export function createFallbackHomeServerCmsBundle(): HomeServerCmsBundle {
  return {
    homepageBlocks: [],
    publicStoreLogo: null,
    newsletterWidget: null,
    widgetVisibility: DEFAULT_SITE_WIDGET_VISIBILITY,
    trustpilotSettings: null,
    categoryCardsSection: { ...FALLBACK_CATEGORY_CARDS },
    homeNavLinks: [],
    buyNowPayLater: null,
    sellBuyCards: null,
    tinyPhoneBanner: null,
  };
}

/** One parallel CMS fetch for the homepage (ISR via per-service revalidate). */
export const getHomeServerCmsBundle = cache(
  async (): Promise<HomeServerCmsBundle> => {
    const fallback = createFallbackHomeServerCmsBundle();
    const live = { live: true as const };
    const results = await Promise.allSettled([
      getHomepageData(live),
      getHomepageNewsletterWidgetPublic(live),
      getSiteWidgetSettingsPublic(live),
      getTrustpilotSettings(live),
      getCategoryCardsSectionSettings(live),
      getHomeNavLinksPublicServer(live),
      getBuyNowPayLater(live),
      getSellBuyCards(live),
      getTinyPhoneBanner(live),
      getLogo().catch(() => null),
    ]);

    const valueOrFallback = <T,>(index: number, defaultValue: T): T => {
      const result = results[index];
      if (result.status === "fulfilled") return result.value as T;
      console.error("[HomeServerCms] Partial CMS fetch failed:", result.reason);
      return defaultValue;
    };

    const homepageData = valueOrFallback<{ blocks?: HomepageBlock[] }>(0, {
      blocks: fallback.homepageBlocks,
    });
    const newsletterWidget = valueOrFallback<HomepageNewsletterSingleton | null>(
      1,
      fallback.newsletterWidget
    );
    const widgetVisibility = valueOrFallback<SiteWidgetVisibility>(
      2,
      fallback.widgetVisibility
    );
    const trustpilotSettings = valueOrFallback<TrustpilotSettings | null>(
      3,
      fallback.trustpilotSettings
    );
    const categoryCardsSection = valueOrFallback<CategoryCardsSectionSettings>(
      4,
      fallback.categoryCardsSection
    );
    const homeNavLinks = valueOrFallback<HomeNavLink[]>(5, fallback.homeNavLinks);
    const buyNowPayLater = valueOrFallback<BuyNowPayLater | null>(
      6,
      fallback.buyNowPayLater
    );
    const sellBuyCards = valueOrFallback<SellBuyCards | null>(
      7,
      fallback.sellBuyCards
    );
    const tinyPhoneBanner = valueOrFallback<TinyPhoneBanner | null>(
      8,
      fallback.tinyPhoneBanner
    );
    const logoRow = valueOrFallback<{ logoUrl: string; altText: string } | null>(
      9,
      null
    );
    const publicStoreLogo: PublicStoreLogoPayload | null =
      logoRow?.logoUrl?.trim() && logoRow.logoUrl.trim().length > 0
        ? {
            logoUrl: logoRow.logoUrl.trim(),
            altText: logoRow.altText?.trim() || "Zextons",
          }
        : null;
    const rawHomepageBlocks = homepageData?.blocks?.length ? homepageData.blocks : [];
    const homepageBlocks = mergePublicStoreLogoIntoHomepageBlocks(
      rawHomepageBlocks,
      publicStoreLogo
    );

    return {
      homepageBlocks,
      publicStoreLogo,
      newsletterWidget,
      widgetVisibility,
      trustpilotSettings,
      categoryCardsSection,
      homeNavLinks,
      buyNowPayLater,
      sellBuyCards,
      tinyPhoneBanner,
    };
  }
);
