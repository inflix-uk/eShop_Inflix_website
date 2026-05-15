import { cache } from "react";
import {
  cmsLivePublicFetchInit,
  cmsPublicFetchInit,
} from "@/app/lib/cmsPublicFetchInit";
import {
  cmsTimedFetch,
  isCmsFetchAbortError,
  isCmsUnreachableFetchError,
} from "@/app/lib/cmsTimedFetch";

/** Normalized API origin for homepage CMS calls (SSR + client). Never use a bare undefined in URL templates. */
function getHomepageCmsApiBase(): string {
  const raw = String(
    process.env.NEXT_PUBLIC_CMS_API_URL || process.env.NEXT_PUBLIC_API_URL || ""
  )
    .trim()
    .replace(/\/+$/, "");
  if (raw) {
    // Node undici often resolves localhost to ::1; backend may only listen on IPv4.
    return raw.replace(/^http:\/\/localhost(?=[:/]|$)/i, "http://127.0.0.1");
  }
  if (process.env.NODE_ENV !== "production") {
    return "http://127.0.0.1:3001";
  }
  return "";
}

/** Admin Homepage SEO (`PATCH /homepage-data/seo`) exposed publicly for metadata */
export interface HomepagePublicSeo {
  metaTitle: string;
  metaDescription: string;
  metaTags: string[];
  metaSchema: string[];
  updatedAt: string | null;
}

export interface HomepageData {
  blocks: HomepageBlock[];
  updatedAt: string | null;
}

export interface HomepageBlock {
  id?: string;
  type?: string;
  columns: HomepageColumn[];
}

export interface HomepageColumn {
  width: number;
  blocks: ContentBlock[];
}

export interface SliderSlide {
  id?: string;
  heading?: string;
  description?: string;
  imageUrl?: string;
}

export interface WidgetSliderContent {
  widgetType: "slider";
  /** Optional title above the slider on the public site */
  sectionHeading?: string;
  /** Optional intro text below the title */
  sectionDescription?: string;
  slides: SliderSlide[];
}

export interface WidgetNewsletterContent {
  widgetType: "newsletter";
  heading?: string;
  description?: string;
  placeholder?: string;
  buttonLabel?: string;
  imageUrl?: string;
}

export interface FaqItemContent {
  id?: string;
  question?: string;
  answer?: string;
}

export interface WidgetFaqContent {
  widgetType: "faq";
  sectionHeading?: string;
  items?: FaqItemContent[];
}

export interface WidgetVideoContent {
  widgetType: "video";
  videoUrl?: string;
  heading?: string;
  caption?: string;
}

export interface WidgetMapContent {
  widgetType: "map";
  embedUrl?: string;
  heading?: string;
  /** Iframe height in px (clamped 200–800 on the public site). */
  heightPx?: number;
}

export interface GalleryImageItem {
  id?: string;
  imageUrl?: string;
  caption?: string;
  alt?: string;
}

export interface WidgetGalleryContent {
  widgetType: "gallery";
  heading?: string;
  items?: GalleryImageItem[];
}

export interface IconBoxItemContent {
  id?: string;
  iconCode?: string;
  title?: string;
  description?: string;
}

export interface WidgetIconBoxContent {
  widgetType: "iconBox";
  heading?: string;
  items?: IconBoxItemContent[];
}

export interface TestimonialItemContent {
  id?: string;
  quote?: string;
  authorName?: string;
  authorRole?: string;
  rating?: number;
  avatarUrl?: string;
}

export interface WidgetTestimonialsContent {
  widgetType: "testimonials";
  heading?: string;
  /** Optional intro under the section heading */
  description?: string;
  items?: TestimonialItemContent[];
}

/** Paste Trustpilot’s embed snippet (HTML with a `.trustpilot-widget` root). */
export interface WidgetTrustpilotContent {
  widgetType: "trustpilot";
  embedScript?: string;
}

/** Banner slides authored inside the block editor (same fields as Banners admin). */
export interface SiteBannerBlockItem {
  id?: string;
  type?: "simple" | "full";
  imageLarge?: string;
  imageSmall?: string;
  extraImage?: string;
  altText?: string;
  buttonText?: string;
  buttonLink?: string;
  content?: Record<string, unknown>;
  order?: number;
  isActive?: boolean;
}

export interface WidgetSiteBannersContent {
  widgetType: "siteBanners";
  items?: SiteBannerBlockItem[];
}

/** Category tiles authored in blocks (same shape as Category cards admin). */
export interface CategoryCardBlockItemContent {
  id?: string;
  categoryName?: string;
  categoryNameColor?: string;
  itemCountColor?: string;
  overlayColor?: string;
  shopNowLink?: string;
  itemCount?: number;
  backgroundImage?: string;
  categoryImage?: string;
  order?: number;
  isActive?: boolean;
}

export interface WidgetCategoryCardsContent {
  widgetType: "categoryCards";
  headingText?: string;
  headingColor?: string;
  dividerColor?: string;
  sectionBackgroundColor?: string;
  items?: CategoryCardBlockItemContent[];
}

/** Inline Buy Now Pay Later, Sell/Buy cards, Tiny Phone (block editor). */
export interface PromotionalBnplBlockContent {
  heading?: string;
  paragraph?: string;
  backgroundImage?: string;
  paymentImages?: string[];
}

export interface PromotionalSellBuyCardBlockContent {
  heading?: string;
  paragraph?: string;
  buttonName?: string;
  buttonLink?: string;
  backgroundImage?: string;
  productImage?: string;
}

export interface PromotionalSellBuyBlockContent {
  sellCard?: PromotionalSellBuyCardBlockContent;
  buyCard?: PromotionalSellBuyCardBlockContent;
}

export interface PromotionalTinyPhoneBlockContent {
  heading?: string;
  paragraph?: string;
  buttonName?: string;
  buttonLink?: string;
  backgroundImage?: string;
  centerImage?: string;
  rightImage?: string;
}

export interface WidgetPromotionalSectionsContent {
  widgetType: "promotionalSections";
  buyNowPayLater?: PromotionalBnplBlockContent;
  sellBuyCards?: PromotionalSellBuyBlockContent;
  tinyPhoneBanner?: PromotionalTinyPhoneBlockContent;
}

/** Latest posts grid (block editor); data from public /api/blogs/latest. */
export interface WidgetLatestBlogsContent {
  widgetType: "latestBlogs";
  sectionHeading?: string;
  maxPosts?: number;
  viewAllLabel?: string;
}

/** Curated deal/coupon cards authored in the block editor (footer pages, blogs, homepage). */
export interface DealsDiscountCardItem {
  id?: string;
  emoji?: string;
  title?: string;
  desc?: string;
  type?: "Coupon" | "Deal";
  /** When false, the public card shows “Expires: No Expiry” and hides the start line. */
  hasExpiry?: boolean;
  startDate?: string;
  expiryDate?: string;
  /** Force grey “Expired” state (also inferred when `expiryDate` parses to a past instant). */
  isExpired?: boolean;
  couponCode?: string;
  buttonText?: string;
  buttonUrl?: string;
}

export interface WidgetDealsDiscountCardsContent {
  widgetType: "dealsDiscountCards";
  sectionHeading?: string;
  items?: DealsDiscountCardItem[];
}

/** Live deals / coupons from public `/get/active/deals` (footer pages & blogs). */
export interface WidgetActiveDealsContent {
  widgetType: "activeDeals";
}

/** Fragment HTML + scoped CSS (rendered in a shadow root on the public site). */
export interface WidgetHtmlCssContent {
  widgetType: "htmlCss";
  /** Markup only — no DOCTYPE, html, head, or body wrappers. */
  html?: string;
  css?: string;
}

/** Contact form schema stored in page blocks (same validation as global contact widget on submit). */
export interface WidgetContactUsContent {
  widgetType: "contactUs";
  isActive?: boolean;
  title?: string;
  description?: string;
  submitButtonLabel?: string;
  successMessage?: string;
  fields?: Array<Record<string, unknown>>;
}

export interface NavbarLinkItemContent {
  id?: string;
  label?: string;
  url?: string;
  icon?: string;
  linkType?: "label" | "icon" | "icon_label";
  children?: Array<{ id?: string; label?: string; url?: string }>;
}

export interface WidgetNavbarContent {
  widgetType: "navbar";
  layout?: "classic" | "centered" | "split" | "minimal";
  variant?:
    | "modern"
    | "minimalist"
    | "dark-sidebar"
    | "developer"
    | "bold-left"
    | "business"
    | "retail-two-row"
    | "wing-split"
    | "pill-black";
  logoUrl?: string;
  logoText?: string;
  links?: NavbarLinkItemContent[];
  showSearch?: boolean;
  showButtons?: boolean;
  /** Retail two-row: pin top row to viewport when true (same meaning as Product Central “Sticky navbar”). */
  stickyNavbar?: boolean;
  actionIcon1?: string;
  actionIcon2?: string;
  primaryButtonLabel?: string;
  primaryButtonUrl?: string;
  primaryButtonIcon?: string;
  secondaryButtonLabel?: string;
  secondaryButtonUrl?: string;
  secondaryButtonIcon?: string;
}

/** How the product slider is filled: manual/category picks, auto latest 6, or featured subset. */
export type ProductSliderSource = "manual" | "latest" | "featured";

/** Curated product carousel (admin picks products by category, latest auto, or featured). */
export interface ProductSliderBlockContent {
  sectionTitle?: string;
  productIds?: string[];
  selectedProductsMeta?: { _id?: string; name?: string }[];
  productSource?: ProductSliderSource;
}

export interface ContentBlock {
  id?: string;
  type: "text" | "image" | "widget" | "products";
  content:
    | string
    | ImageContent
    | WidgetSliderContent
    | WidgetNewsletterContent
    | WidgetFaqContent
    | WidgetVideoContent
    | WidgetMapContent
    | WidgetGalleryContent
    | WidgetIconBoxContent
    | WidgetTestimonialsContent
    | WidgetTrustpilotContent
    | WidgetSiteBannersContent
    | WidgetCategoryCardsContent
    | WidgetPromotionalSectionsContent
    | WidgetLatestBlogsContent
    | WidgetActiveDealsContent
    | WidgetDealsDiscountCardsContent
    | WidgetHtmlCssContent
    | WidgetNavbarContent
    | WidgetContactUsContent
    | ProductSliderBlockContent;
}

export interface ImageContent {
  url?: string;
  alt?: string;
  heading?: string;
  externalLink?: string;
}

/**
 * Get homepage data content from API
 */
export type HomepageNewsletterSingleton = {
  heading: string;
  description: string;
  placeholder: string;
  buttonLabel: string;
  imageUrl: string;
};

/**
 * Global newsletter widget from Homepage Widgets admin (singleton).
 */
export async function getHomepageNewsletterWidgetPublic(options?: {
  live?: boolean;
}): Promise<HomepageNewsletterSingleton | null> {
  const base = getHomepageCmsApiBase();
  if (!base) return null;
  const cacheInit = options?.live ? cmsLivePublicFetchInit() : cmsPublicFetchInit();
  try {
    const response = await cmsTimedFetch(
      `${base}/homepage-newsletter-widget/public`,
      {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
        ...cacheInit,
      }
    );

    if (!response.ok) {
      return null;
    }

    const json = await response.json();
    if (!json.success || !json.data) {
      return null;
    }

    const d = json.data;
    return {
      heading: d.heading || "",
      description: d.description || "",
      placeholder: d.placeholder || "Enter your email",
      buttonLabel: d.buttonLabel || "Subscribe",
      imageUrl: d.imageUrl || "",
    };
  } catch (error) {
    if (isCmsFetchAbortError(error) || isCmsUnreachableFetchError(error)) {
      return null;
    }
    console.error("[HomepageDataService] newsletter widget:", error);
    return null;
  }
}

export const getHomepagePublicSeo = cache(
  async (): Promise<HomepagePublicSeo | null> => {
    const base = getHomepageCmsApiBase();
    if (!base) return null;
    try {
      const response = await cmsTimedFetch(`${base}/homepage-data/public/seo`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
        ...cmsPublicFetchInit(),
      });

      if (!response.ok) {
        return null;
      }

      const json = await response.json();
      if (!json.success || !json.data) {
        return null;
      }

      const d = json.data;
      return {
        metaTitle: typeof d.metaTitle === "string" ? d.metaTitle : "",
        metaDescription:
          typeof d.metaDescription === "string" ? d.metaDescription : "",
        metaTags: Array.isArray(d.metaTags) ? d.metaTags.map(String) : [],
        metaSchema: Array.isArray(d.metaSchema) ? d.metaSchema.map(String) : [],
        updatedAt: d.updatedAt ?? null,
      };
    } catch (error) {
      if (isCmsFetchAbortError(error) || isCmsUnreachableFetchError(error)) {
        return null;
      }
      console.error("[HomepageDataService] public SEO:", error);
      return null;
    }
  }
);

export async function getHomepageData(options?: {
  live?: boolean;
}): Promise<HomepageData | null> {
  const base = getHomepageCmsApiBase();
  if (!base) return null;
  const cacheInit = options?.live ? cmsLivePublicFetchInit() : cmsPublicFetchInit();
  try {
    const response = await cmsTimedFetch(`${base}/homepage-data/public`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
      ...cacheInit,
    });

    if (!response.ok) {
      console.error("[HomepageDataService] Failed to fetch homepage data");
      return null;
    }

    const data = await response.json();

    if (data.success) {
      return data.data;
    }

    return null;
  } catch (error) {
    if (isCmsFetchAbortError(error) || isCmsUnreachableFetchError(error)) {
      return null;
    }
    console.error("[HomepageDataService] Error fetching homepage data:", error);
    return null;
  }
}

/**
 * Get the full image URL from a relative path
 */
export function getHomepageImageUrl(imagePath: string | null | undefined): string {
  if (!imagePath) return "";

  // If it's already a full URL, return as is
  if (imagePath.startsWith("http://") || imagePath.startsWith("https://")) {
    return imagePath;
  }

  const base = getHomepageCmsApiBase();
  if (!base) return "";

  // Construct the full URL
  return `${base}/uploads${imagePath.startsWith("/") ? "" : "/"}${imagePath}`;
}
