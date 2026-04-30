import { cache } from "react";
import {
  getHomepageData,
  getHomepageNewsletterWidgetPublic,
  type HomepageBlock,
  type HomepageNewsletterSingleton,
} from "@/app/services/homepageDataService";
import {
  getSiteWidgetSettingsPublic,
  DEFAULT_SITE_WIDGET_VISIBILITY,
  type SiteWidgetVisibility,
} from "@/app/services/siteWidgetSettingsService";
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

export type HomeServerCmsBundle = {
  homepageBlocks: HomepageBlock[];
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
    const results = await Promise.allSettled([
      getHomepageData(),
      getHomepageNewsletterWidgetPublic(),
      getSiteWidgetSettingsPublic(),
      getTrustpilotSettings(),
      getCategoryCardsSectionSettings(),
      getHomeNavLinksPublicServer(),
      getBuyNowPayLater(),
      getSellBuyCards(),
      getTinyPhoneBanner(),
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

    return {
      homepageBlocks: homepageData?.blocks?.length ? homepageData.blocks : [],
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
