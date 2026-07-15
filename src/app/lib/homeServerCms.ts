import { cache } from "react";
import {
  getHomepageData,
  getHomepageNewsletterWidgetPublic,
  type HomepageBlock,
  type HomepageNewsletterSingleton,
  type ProductSliderBlockContent,
} from "@/app/services/homepageDataService";
import { getSiteWidgetSettingsPublic } from "@/app/services/siteWidgetSettingsService";
import {
  DEFAULT_SITE_WIDGET_VISIBILITY,
  type SiteWidgetVisibility,
} from "@/app/lib/siteWidgetVisibilityDefaults";
import { DEFAULT_LOGO_ALT } from "@/lib/storeIdentity";
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
import { prefetchProductsForSlider } from "@/app/lib/productNormalization";
import { prefetchLatestBlogs } from "@/app/lib/blogPrefetch";
import type { Product } from "../../../types";
import type { Blog } from "../../../types";

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
  /** SSR-prefetched products keyed by block index path (e.g., "0-0-0" for row 0, col 0, block 0). */
  prefetchedProductsMap: Record<string, Product[]>;
  /** SSR-prefetched blogs keyed by block index path. */
  prefetchedBlogsMap: Record<string, Blog[]>;
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
    prefetchedProductsMap: {},
    prefetchedBlogsMap: {},
  };
}

/** Extract products blocks from homepage blocks and prefetch their data. */
async function prefetchAllProductsForBlocks(
  blocks: HomepageBlock[]
): Promise<Record<string, Product[]>> {
  const productsFetches: Array<{ key: string; promise: Promise<Product[]> }> = [];

  blocks.forEach((row, rowIndex) => {
    (row.columns || []).forEach((column, colIndex) => {
      (column.blocks || []).forEach((block, blockIndex) => {
        if (block.type === "products") {
          const content = block.content as ProductSliderBlockContent;
          const key = `${rowIndex}-${colIndex}-${blockIndex}`;
          productsFetches.push({
            key,
            promise: prefetchProductsForSlider(
              content.productSource,
              content.productIds
            ),
          });
        }
      });
    });
  });

  if (productsFetches.length === 0) {
    return {};
  }

  const results = await Promise.allSettled(
    productsFetches.map((f) => f.promise)
  );

  const map: Record<string, Product[]> = {};
  results.forEach((result, index) => {
    const key = productsFetches[index].key;
    if (result.status === "fulfilled") {
      map[key] = result.value;
    } else {
      console.error(`[HomeServerCms] Products prefetch failed for ${key}:`, result.reason);
      map[key] = [];
    }
  });

  return map;
}

/** Extract latestBlogs widgets from homepage blocks and prefetch their data. */
async function prefetchAllBlogsForBlocks(
  blocks: HomepageBlock[]
): Promise<Record<string, Blog[]>> {
  const blogsFetches: Array<{ key: string; promise: Promise<Blog[]> }> = [];

  blocks.forEach((row, rowIndex) => {
    (row.columns || []).forEach((column, colIndex) => {
      (column.blocks || []).forEach((block, blockIndex) => {
        if (block.type === "widget") {
          const content = block.content as { widgetType?: string; maxPosts?: number };
          if (content?.widgetType === "latestBlogs") {
            const key = `${rowIndex}-${colIndex}-${blockIndex}`;
            const maxPosts = typeof content.maxPosts === "number" ? content.maxPosts : 6;
            blogsFetches.push({
              key,
              promise: prefetchLatestBlogs(maxPosts),
            });
          }
        }
      });
    });
  });

  if (blogsFetches.length === 0) {
    return {};
  }

  const results = await Promise.allSettled(
    blogsFetches.map((f) => f.promise)
  );

  const map: Record<string, Blog[]> = {};
  results.forEach((result, index) => {
    const key = blogsFetches[index].key;
    if (result.status === "fulfilled") {
      map[key] = result.value;
    } else {
      console.error(`[HomeServerCms] Blogs prefetch failed for ${key}:`, result.reason);
      map[key] = [];
    }
  });

  return map;
}

/** One parallel CMS fetch for the homepage (ISR via per-service revalidate). */
export const getHomeServerCmsBundle = cache(
  async (): Promise<HomeServerCmsBundle> => {
    const fallback = createFallbackHomeServerCmsBundle();
    // Use cached fetches for SSR performance - client-side HomeClient does live refetch
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
            altText: logoRow.altText?.trim() || DEFAULT_LOGO_ALT,
          }
        : null;
    const rawHomepageBlocks = homepageData?.blocks?.length ? homepageData.blocks : [];
    const homepageBlocks = mergePublicStoreLogoIntoHomepageBlocks(
      rawHomepageBlocks,
      publicStoreLogo
    );

    // Prefetch products and blogs for SSR (parallel)
    const [prefetchedProductsMap, prefetchedBlogsMap] = await Promise.all([
      prefetchAllProductsForBlocks(homepageBlocks),
      prefetchAllBlogsForBlocks(homepageBlocks),
    ]);

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
      prefetchedProductsMap,
      prefetchedBlogsMap,
    };
  }
);
