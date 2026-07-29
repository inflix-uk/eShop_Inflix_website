/**
 * Pure helpers + types for homepage / widget hero banners (shared by client slider + server prefetch).
 */

export const DEFAULT_BANNER_DESKTOP_W = 1200;
export const DEFAULT_BANNER_DESKTOP_H = 417;
export const DEFAULT_BANNER_MOBILE_W = 1080;
export const DEFAULT_BANNER_MOBILE_H = 1920;

export type BannerImageVariant = "desktop" | "mobile";

export type BannerImageDimensions = {
  width: number;
  height: number;
};

export function resolveBannerImageDimensions(
  banner: Pick<
    Banner,
    | "imageLargeWidthPx"
    | "imageLargeHeightPx"
    | "imageSmallWidthPx"
    | "imageSmallHeightPx"
  >,
  variant: BannerImageVariant
): BannerImageDimensions {
  if (variant === "mobile") {
    const width =
      banner.imageSmallWidthPx && banner.imageSmallWidthPx > 0
        ? banner.imageSmallWidthPx
        : DEFAULT_BANNER_MOBILE_W;
    const height =
      banner.imageSmallHeightPx && banner.imageSmallHeightPx > 0
        ? banner.imageSmallHeightPx
        : DEFAULT_BANNER_MOBILE_H;
    return { width, height };
  }

  const width =
    banner.imageLargeWidthPx && banner.imageLargeWidthPx > 0
      ? banner.imageLargeWidthPx
      : DEFAULT_BANNER_DESKTOP_W;
  const height =
    banner.imageLargeHeightPx && banner.imageLargeHeightPx > 0
      ? banner.imageLargeHeightPx
      : DEFAULT_BANNER_DESKTOP_H;
  return { width, height };
}

/** Next/Image `sizes` hint from admin-set intrinsic width (hero is full viewport width). */
export function bannerImageSizesAttr(widthPx: number): string {
  const w = Math.max(1, Math.round(widthPx));
  return `(max-width: 768px) 100vw, ${w}px`;
}

/** CSS aspect-ratio box matching admin image dimensions (avoids object-cover crop vs fixed 80vh). */
export function buildBannerImageContainerStyle(
  dims: BannerImageDimensions
): { width: string; aspectRatio: string } {
  const w = Math.max(1, Math.round(dims.width));
  const h = Math.max(1, Math.round(dims.height));
  return {
    width: "100%",
    aspectRatio: `${w} / ${h}`,
  };
}

export interface BannerFeatureCard {
  icon?: string;
  title?: string;
  text?: string;
}

export interface BannerContent {
  /** Layout style: "default" = current layout, "podcast" = podcast studio style */
  layoutStyle?: "default" | "podcast";
  // === Default layout fields ===
  title?: string;
  subtitle?: string;
  paragraph?: string;
  price?: string;
  buynow?: string;
  sellnow?: string;
  warranty?: string[];
  titleColor?: string;
  subtitleColor?: string;
  paragraphColor?: string;
  priceColor?: string;
  titleSize?: string;
  subtitleSize?: string;
  paragraphSize?: string;
  priceSize?: string;
  textAlign?: "left" | "center" | "right";
  textPosition?: "left" | "center" | "right";
  // === Podcast layout fields ===
  heading?: string;
  headingAccent?: string;
  headingAccentColor?: string;
  tagline?: string;
  description?: string;
  ctaText?: string;
  ctaLink?: string;
  ctaIcon?: string;
  ctaButtonColor?: string;
  ctaButtonTextColor?: string;
  featureCards?: BannerFeatureCard[];
}

export interface Banner {
  id: string;
  srcLarge: string;
  srcSmall: string;
  alt: string;
  backgroundMedia?: "image" | "video";
  videoLarge?: string;
  videoSmall?: string;
  overlayColor?: string;
  overlayOpacity?: number;
  videoDesktopLayout?: string;
  videoDesktopWidthPx?: number;
  videoDesktopHeightPx?: number;
  videoMobileLayout?: string;
  videoMobileWidthPx?: number;
  videoMobileHeightPx?: number;
  imageLargeWidthPx?: number;
  imageLargeHeightPx?: number;
  imageSmallWidthPx?: number;
  imageSmallHeightPx?: number;
  content?: BannerContent;
  extraImage?: string;
  buttonText?: string;
  buttonLink?: string;
  type: "simple" | "full";
}

export interface ApiBannerContent {
  layoutStyle?: "default" | "podcast";
  // Default layout fields
  title?: string;
  subtitle?: string;
  paragraph?: string;
  price?: string;
  buynow?: string;
  sellnow?: string;
  warranty?: string[];
  titleColor?: string;
  subtitleColor?: string;
  paragraphColor?: string;
  priceColor?: string;
  titleSize?: string;
  subtitleSize?: string;
  paragraphSize?: string;
  priceSize?: string;
  textAlign?: "left" | "center" | "right";
  textPosition?: "left" | "center" | "right";
  // Podcast layout fields
  heading?: string;
  headingAccent?: string;
  headingAccentColor?: string;
  tagline?: string;
  description?: string;
  ctaText?: string;
  ctaLink?: string;
  ctaIcon?: string;
  ctaButtonColor?: string;
  ctaButtonTextColor?: string;
  featureCards?: BannerFeatureCard[];
}

export interface ApiBanner {
  _id: string;
  type: "simple" | "full";
  backgroundMedia?: "image" | "video";
  imageLarge: string;
  imageSmall: string;
  videoLarge?: string;
  videoSmall?: string;
  overlayColor?: string;
  overlayOpacity?: number;
  videoDesktopLayout?: string;
  videoDesktopWidthPx?: number;
  videoDesktopHeightPx?: number;
  videoMobileLayout?: string;
  videoMobileWidthPx?: number;
  videoMobileHeightPx?: number;
  imageLargeWidthPx?: number;
  imageLargeHeightPx?: number;
  imageSmallWidthPx?: number;
  imageSmallHeightPx?: number;
  altText: string;
  buttonText?: string;
  buttonLink?: string;
  content?: ApiBannerContent;
  extraImage?: string;
  order?: number;
}

export type InlineBannerBlockPayload = {
  id?: string;
  type?: "simple" | "full";
  backgroundMedia?: "image" | "video";
  imageLarge?: string;
  imageSmall?: string;
  videoLarge?: string;
  videoSmall?: string;
  overlayColor?: string;
  overlayOpacity?: number;
  videoDesktopLayout?: string;
  videoDesktopWidthPx?: number;
  videoDesktopHeightPx?: number;
  videoMobileLayout?: string;
  videoMobileWidthPx?: number;
  videoMobileHeightPx?: number;
  imageLargeWidthPx?: number;
  imageLargeHeightPx?: number;
  imageSmallWidthPx?: number;
  imageSmallHeightPx?: number;
  extraImage?: string;
  altText?: string;
  buttonText?: string;
  buttonLink?: string;
  content?: ApiBannerContent;
  order?: number;
  isActive?: boolean;
};

function bannerHasStorefrontMedia(banner: Banner): boolean {
  if (banner.backgroundMedia === "video") {
    return Boolean(
      (banner.videoLarge && banner.videoLarge !== "") ||
        (banner.videoSmall && banner.videoSmall !== "")
    );
  }
  return Boolean(
    banner.srcLarge &&
      banner.srcLarge !== "" &&
      banner.srcSmall &&
      banner.srcSmall !== ""
  );
}

type HAlign = "left" | "center" | "right";

function resolveBannerTextAlign(content?: { textAlign?: string }): HAlign {
  const a = (content?.textAlign ?? "").toString().trim().toLowerCase();
  if (a === "center" || a === "right") return a;
  return "left";
}

function resolveTextPosition(content?: { textPosition?: string }): HAlign {
  const p = (content?.textPosition ?? "").toString().trim().toLowerCase();
  if (p === "left" || p === "center" || p === "right") return p;
  return "right";
}

export function getBannerImageUrl(url: string | undefined, apiBase: string): string {
  if (!url || url.trim() === "") {
    return "";
  }

  const trimmedUrl = url.trim();

  if (trimmedUrl.startsWith("http://") || trimmedUrl.startsWith("https://")) {
    try {
      const urlObj = new URL(trimmedUrl);
      const pathSegments = urlObj.pathname.split("/").filter(Boolean);
      const encodedSegments = pathSegments.map((segment) =>
        encodeURIComponent(segment)
      );
      const encodedPathname = "/" + encodedSegments.join("/");
      return `${urlObj.protocol}//${urlObj.host}${encodedPathname}${urlObj.search}${urlObj.hash}`;
    } catch {
      return trimmedUrl;
    }
  }

  if (trimmedUrl.startsWith("data:")) {
    return trimmedUrl;
  }

  let finalPath = "";

  if (trimmedUrl.startsWith("/uploads/")) {
    finalPath = trimmedUrl;
  } else if (trimmedUrl.startsWith("/")) {
    const pathWithoutSlash = trimmedUrl.substring(1);
    finalPath = `/uploads/${pathWithoutSlash}`;
  } else {
    finalPath = `/uploads/${trimmedUrl}`;
  }

  const pathSegments = finalPath.split("/").filter(Boolean);
  const encodedSegments = pathSegments.map((segment) =>
    encodeURIComponent(segment)
  );
  const encodedPath = "/" + encodedSegments.join("/");

  const cleanBase = apiBase.replace(/\/$/, "");
  return `${cleanBase}${encodedPath}`;
}

export function transformApiBannerToBanner(
  apiBanner: ApiBanner,
  apiBase: string
): Banner {
  const isPodcastLayout = apiBanner.content?.layoutStyle === "podcast";
  const hasDefaultContent =
    apiBanner.content &&
    (apiBanner.content.title ||
      apiBanner.content.subtitle ||
      apiBanner.content.paragraph ||
      apiBanner.content.price ||
      (apiBanner.content.warranty && apiBanner.content.warranty.length > 0));
  const hasPodcastContent =
    apiBanner.content &&
    (apiBanner.content.heading ||
      apiBanner.content.headingAccent ||
      apiBanner.content.tagline ||
      apiBanner.content.description ||
      apiBanner.content.ctaText);
  const hasContent = isPodcastLayout ? hasPodcastContent : hasDefaultContent;

  const rawLarge = getBannerImageUrl(apiBanner.imageLarge, apiBase);
  const rawSmall = getBannerImageUrl(apiBanner.imageSmall, apiBase);
  const srcLarge = rawLarge || rawSmall;
  const srcSmall = rawSmall || rawLarge;

  const videoLarge = apiBanner.videoLarge
    ? getBannerImageUrl(apiBanner.videoLarge, apiBase)
    : "";
  const videoSmall = apiBanner.videoSmall
    ? getBannerImageUrl(apiBanner.videoSmall, apiBase)
    : videoLarge;

  return {
    id: apiBanner._id,
    srcLarge,
    srcSmall,
    backgroundMedia:
      apiBanner.backgroundMedia === "video" ? "video" : "image",
    videoLarge: videoLarge || undefined,
    videoSmall: videoSmall || undefined,
    overlayColor: apiBanner.overlayColor || "#000000",
    overlayOpacity:
      apiBanner.overlayOpacity !== undefined && apiBanner.overlayOpacity !== null
        ? Number(apiBanner.overlayOpacity)
        : 35,
    videoDesktopLayout: apiBanner.videoDesktopLayout || "hero",
    videoDesktopWidthPx: apiBanner.videoDesktopWidthPx ?? undefined,
    videoDesktopHeightPx: apiBanner.videoDesktopHeightPx ?? undefined,
    videoMobileLayout: apiBanner.videoMobileLayout || "hero",
    videoMobileWidthPx: apiBanner.videoMobileWidthPx ?? undefined,
    videoMobileHeightPx: apiBanner.videoMobileHeightPx ?? undefined,
    imageLargeWidthPx: apiBanner.imageLargeWidthPx ?? DEFAULT_BANNER_DESKTOP_W,
    imageLargeHeightPx: apiBanner.imageLargeHeightPx ?? DEFAULT_BANNER_DESKTOP_H,
    imageSmallWidthPx: apiBanner.imageSmallWidthPx ?? DEFAULT_BANNER_MOBILE_W,
    imageSmallHeightPx: apiBanner.imageSmallHeightPx ?? DEFAULT_BANNER_MOBILE_H,
    alt: apiBanner.altText || "Banner",
    content: hasContent
      ? {
          layoutStyle: apiBanner.content?.layoutStyle || "default",
          // Default layout fields
          title: apiBanner.content?.title,
          subtitle: apiBanner.content?.subtitle,
          paragraph: apiBanner.content?.paragraph,
          price: apiBanner.content?.price,
          buynow: apiBanner.content?.buynow,
          sellnow: apiBanner.content?.sellnow,
          warranty:
            apiBanner.content?.warranty &&
            apiBanner.content.warranty.length > 0
              ? apiBanner.content.warranty
              : undefined,
          titleColor: apiBanner.content?.titleColor,
          subtitleColor: apiBanner.content?.subtitleColor,
          paragraphColor: apiBanner.content?.paragraphColor,
          priceColor: apiBanner.content?.priceColor,
          titleSize: apiBanner.content?.titleSize,
          subtitleSize: apiBanner.content?.subtitleSize,
          paragraphSize: apiBanner.content?.paragraphSize,
          priceSize: apiBanner.content?.priceSize,
          textAlign: resolveBannerTextAlign(apiBanner.content),
          textPosition: resolveTextPosition(apiBanner.content),
          // Podcast layout fields
          heading: apiBanner.content?.heading,
          headingAccent: apiBanner.content?.headingAccent,
          headingAccentColor: apiBanner.content?.headingAccentColor || "#C2FC12",
          tagline: apiBanner.content?.tagline,
          description: apiBanner.content?.description,
          ctaText: apiBanner.content?.ctaText,
          ctaLink: apiBanner.content?.ctaLink,
          ctaIcon: apiBanner.content?.ctaIcon,
          ctaButtonColor: apiBanner.content?.ctaButtonColor || "#C2FC12",
          ctaButtonTextColor: apiBanner.content?.ctaButtonTextColor || "#000000",
          featureCards: apiBanner.content?.featureCards,
        }
      : undefined,
    extraImage: apiBanner.extraImage
      ? getBannerImageUrl(apiBanner.extraImage, apiBase)
      : undefined,
    buttonText: apiBanner.buttonText,
    buttonLink: apiBanner.buttonLink,
    type: apiBanner.type,
  };
}

export function extractApiBannersArray(data: unknown): ApiBanner[] {
  if (Array.isArray(data)) {
    return data as ApiBanner[];
  }
  if (
    data &&
    typeof data === "object" &&
    "success" in data &&
    (data as { success?: boolean }).success &&
    Array.isArray((data as { data?: unknown }).data)
  ) {
    return (data as unknown as { data: ApiBanner[] }).data;
  }
  if (
    data &&
    typeof data === "object" &&
    Array.isArray((data as { banners?: unknown }).banners)
  ) {
    return (data as unknown as { banners: ApiBanner[] }).banners;
  }
  return [];
}

export function buildHeroBannersFromApiPayload(
  data: unknown,
  apiBase: string
): Banner[] {
  const bannersArray = extractApiBannersArray(data);
  if (bannersArray.length === 0) return [];

  const sortedBanners = [...bannersArray].sort((a, b) => {
    const orderA = a.order ?? 0;
    const orderB = b.order ?? 0;
    return orderA - orderB;
  });

  const transformedBanners = sortedBanners.map((banner) =>
    transformApiBannerToBanner(banner, apiBase)
  );

  return transformedBanners.filter(bannerHasStorefrontMedia);
}

export function bannersFromInlinePayload(
  items: InlineBannerBlockPayload[],
  apiBase: string
): Banner[] {
  const sorted = [...items].sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
  const active = sorted.filter((b) => b.isActive !== false);
  const transformed = active.map((b, i) =>
    transformApiBannerToBanner(
      {
        _id: b.id || `inline-${i}`,
        type: (b.type === "full" ? "full" : "simple") as "simple" | "full",
        backgroundMedia: b.backgroundMedia,
        imageLarge: b.imageLarge || "",
        imageSmall: b.imageSmall || "",
        videoLarge: b.videoLarge,
        videoSmall: b.videoSmall,
        overlayColor: b.overlayColor,
        overlayOpacity: b.overlayOpacity,
        videoDesktopLayout: b.videoDesktopLayout,
        videoDesktopWidthPx: b.videoDesktopWidthPx,
        videoDesktopHeightPx: b.videoDesktopHeightPx,
        videoMobileLayout: b.videoMobileLayout,
        videoMobileWidthPx: b.videoMobileWidthPx,
        videoMobileHeightPx: b.videoMobileHeightPx,
        imageLargeWidthPx: b.imageLargeWidthPx,
        imageLargeHeightPx: b.imageLargeHeightPx,
        imageSmallWidthPx: b.imageSmallWidthPx,
        imageSmallHeightPx: b.imageSmallHeightPx,
        altText: b.altText || "Banner",
        buttonText: b.buttonText,
        buttonLink: b.buttonLink,
        content: b.content,
        extraImage: b.extraImage,
        order: b.order ?? i,
      },
      apiBase
    )
  );
  return transformed.filter(bannerHasStorefrontMedia);
}

/** Hero “Follow us” row (Admin → Banners → Hero social links). */
export interface HeroSocialSettings {
  followHeading: string;
  facebookUrl: string;
  twitterUrl: string;
  youtubeUrl: string;
  instagramUrl: string;
}

export function emptyHeroSocial(): HeroSocialSettings {
  return {
    followHeading: "",
    facebookUrl: "",
    twitterUrl: "",
    youtubeUrl: "",
    instagramUrl: "",
  };
}

export function extractHeroSocialFromActiveBannersPayload(
  data: unknown
): HeroSocialSettings {
  const empty = emptyHeroSocial();
  if (!data || typeof data !== "object") return empty;
  const heroSocial = (data as { heroSocial?: unknown }).heroSocial;
  if (!heroSocial || typeof heroSocial !== "object") return empty;
  const o = heroSocial as Record<string, unknown>;
  const pick = (k: keyof HeroSocialSettings) =>
    typeof o[k] === "string" ? (o[k] as string).trim() : "";
  return {
    followHeading: pick("followHeading"),
    facebookUrl: pick("facebookUrl"),
    twitterUrl: pick("twitterUrl"),
    youtubeUrl: pick("youtubeUrl"),
    instagramUrl: pick("instagramUrl"),
  };
}
