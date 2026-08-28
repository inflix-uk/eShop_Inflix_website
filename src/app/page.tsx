import { cache } from "react";
import HeroSlider2 from "./components/HeroSlider2";
import NavbarVariantTestBar from "./components/navbar/NavbarVariantTestBar";
import HomePageBelowHero from "./components/home/HomePageBelowHero";
import { Metadata } from "next";
import { getHomepagePublicSeo } from "./services/homepageDataService";
import {
  getHomepageHeroBannersCached,
  type HomepageHeroPayload,
} from "./services/activeBannersPublicService";
import { emptyHeroSocial } from "./lib/homepageBannerShared";
import { cmsServerFetchJson } from "./lib/cmsServerFetch";
import {
  getDefaultHomepageJsonLdString,
  metaSchemaEntryToJsonLdString,
} from "./lib/homepageJsonLd";
import { getCanonical } from "@/lib/getCanonical";
import { isBackendAvailable } from "@/app/lib/backendAvailability";
import { getHomeNavbarCriticalServer } from "@/app/services/navbarCriticalServer";
import { getNavbarVariantTestPublicServer } from "@/app/services/navbarVariantTestPublicService";
import { getHomeServerCmsBundle } from "@/app/lib/homeServerCms";
import {
  buildFaqPageJsonLd,
  extractFaqItemsFromHomepageBlocks,
} from "@/app/lib/faqJsonLd";
import { generateAutoBusinessSchema } from "@/app/lib/businessJsonLd";
import {
  firstUsableHeroShareImage,
  withPodcastStudioPhotos,
} from "@/app/lib/podcastShareImage";
import {
  applyAutoJsonLd,
  parseJsonLdStringsToObjects,
  stringifyJsonLdObjects,
} from "@/app/lib/jsonLdMerge";
import { getStoreIdentity, DEFAULT_LOGO_ALT } from "@/lib/storeIdentity";

export const revalidate = 120;

type StaticMetaPagePayload = {
  titleTag?: string;
  metaDescription?: string;
  metaKeywords?: string;
};

const getMetaData = cache(async (): Promise<StaticMetaPagePayload | null> => {
  try {
    const apiUrl = process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, "");
    if (!apiUrl) return null;
    const data = await cmsServerFetchJson<{
      success?: boolean;
      data?: StaticMetaPagePayload;
    }>(
      `${apiUrl}/get/static-meta-page/path/${encodeURIComponent("/Homepage")}`
    );
    return data?.success && data.data ? data.data : null;
  } catch {
    return null;
  }
});

const HOME_FALLBACK_TITLE = "";
const HOME_FALLBACK_DESCRIPTION = "";

export async function generateMetadata(): Promise<Metadata> {
  const [metaData, homepageSeo, heroPayload, identity] = await Promise.all([
    getMetaData(),
    getHomepagePublicSeo(),
    getHomepageHeroBannersCached(),
    getStoreIdentity().catch(() => null),
  ]);

  const titleFromCms = homepageSeo?.metaTitle?.trim();
  const descFromCms = homepageSeo?.metaDescription?.trim();
  const keywordsFromCms =
    homepageSeo?.metaTags?.length ? homepageSeo.metaTags.join(", ") : undefined;

  const title =
    titleFromCms ||
    metaData?.titleTag ||
    HOME_FALLBACK_TITLE;
  const description =
    descFromCms ||
    metaData?.metaDescription ||
    HOME_FALLBACK_DESCRIPTION;
  const keywords =
    keywordsFromCms ?? metaData?.metaKeywords;

  const firstHeroStill = firstUsableHeroShareImage(heroPayload?.banners);
  const ogImage = firstHeroStill || identity?.ogImageUrl || undefined;
  const ogImageAlt = identity?.ogImageAlt;
  const canonicalUrl = await getCanonical("/");

  return {
    title,
    description,
    ...(keywords ? { keywords } : {}),
    robots: "index, follow",
    openGraph: {
      siteName: title,
      title,
      url: canonicalUrl,
      description,
      type: "website",
      ...(ogImage ? { images: [{ url: ogImage, ...(ogImageAlt ? { alt: ogImageAlt } : {}) }] } : {}),
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

export default async function Home() {
  const emptyHeroPayload: HomepageHeroPayload = {
    banners: [],
    heroSocial: emptyHeroSocial(),
  };

  const [backendAvailable, homepageSeo, heroPayload, navServerBootstrap, navbarVariantTestConfig, cmsBundle, storeIdentity] =
    await Promise.all([
      isBackendAvailable(),
      getHomepagePublicSeo().catch((err) => {
        console.error("[Home] homepage SEO fetch failed:", err);
        return null;
      }),
      getHomepageHeroBannersCached().catch((err) => {
        console.error("[Home] hero banners fetch failed:", err);
        return emptyHeroPayload;
      }),
      getHomeNavbarCriticalServer().catch((err) => {
        console.error("[Home] navbar critical fetch failed:", err);
        return {
          items: [],
          logoUrl: null,
          logoAlt: DEFAULT_LOGO_ALT,
          supportPhone: "",
          supportEmail: "",
        };
      }),
      getNavbarVariantTestPublicServer().catch((err) => {
        console.error("[Home] navbar variant test fetch failed:", err);
        return null;
      }),
      getHomeServerCmsBundle().catch((err) => {
        console.error("[Home] CMS bundle fetch failed:", err);
        return null;
      }),
      getStoreIdentity().catch(() => ({
        siteName: "",
        logoAlt: "Store logo",
        logoUrl: null,
        ogImageUrl: null,
        ogImageAlt: "Store logo",
      })),
    ]);
  const { banners: heroBanners, heroSocial } = heroPayload;
  const showOverallNavbar = navbarVariantTestConfig?.showOnStorefront !== false;

  const adminJsonLdStrings = (homepageSeo?.metaSchema ?? [])
    .map((entry) => metaSchemaEntryToJsonLdString(entry))
    .filter((s): s is string => s != null && s.length > 0);

  const canonicalUrl = await getCanonical("/");
  const fallbackWebSite = getDefaultHomepageJsonLdString(
    canonicalUrl,
    storeIdentity.siteName
  );
  const adminObjects = parseJsonLdStringsToObjects(
    adminJsonLdStrings.length > 0 ? adminJsonLdStrings : [fallbackWebSite]
  );
  const autoFaq =
    cmsBundle?.homepageBlocks?.length
      ? buildFaqPageJsonLd(extractFaqItemsFromHomepageBlocks(cmsBundle.homepageBlocks))
      : null;
  const autoBusiness = await generateAutoBusinessSchema();
  const homepageJsonLdToRender = stringifyJsonLdObjects(
    await withPodcastStudioPhotos(
      applyAutoJsonLd(
        adminObjects,
        { business: autoBusiness, faq: autoFaq },
        { appendAutoBusiness: false, appendAutoFaq: true }
      )
    )
  );

  return (
    <>
      {homepageJsonLdToRender.map((json, index) => (
        <script
          key={`homepage-jsonld-${index}`}
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: json }}
        />
      ))}
      {showOverallNavbar ? (
        <>
          {/* Sticky when enabled is handled inside NavbarVariantTestBar (admin "Sticky navbar"). */}
          <NavbarVariantTestBar
            config={navbarVariantTestConfig}
            serverBootstrapLogo={{
              logoUrl: navServerBootstrap.logoUrl,
              logoAlt: navServerBootstrap.logoAlt,
            }}
          />
        </>
      ) : null}
      {/* Top hero: Admin → Banners only (`/get/banners/active`). Homepage Banners widgets are separate. */}
      <HeroSlider2 serverBanners={heroBanners} heroSocial={heroSocial} />
      <HomePageBelowHero backendAvailable={backendAvailable} />
    </>
  );
}
