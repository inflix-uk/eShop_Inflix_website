import { Suspense, cache } from "react";
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
import { buildHomepageFaqJsonLdStrings } from "@/app/lib/faqJsonLd";
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
  const [metaData, homepageSeo, heroPayload] = await Promise.all([
    getMetaData(),
    getHomepagePublicSeo(),
    getHomepageHeroBannersCached(),
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

  const firstHeroBanner = heroPayload?.banners?.[0];
  const ogImage =
    firstHeroBanner?.srcLarge ||
    firstHeroBanner?.srcSmall ||
    undefined;
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
      images: ogImage ? [{ url: ogImage }] : [],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: ogImage ? [{ url: ogImage }] : [],
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
        ogImageUrl: null,
      })),
    ]);
  const { banners: heroBanners, heroSocial } = heroPayload;
  const showOverallNavbar = navbarVariantTestConfig?.showOnStorefront !== false;

  const adminJsonLdStrings = (homepageSeo?.metaSchema ?? [])
    .map((entry) => metaSchemaEntryToJsonLdString(entry))
    .filter((s): s is string => s != null && s.length > 0);

  const canonicalUrl = await getCanonical("/");
  const adminHasFaqSchema = adminJsonLdStrings.some((entry) =>
    /"@type"\s*:\s*"FAQPage"/.test(entry)
  );
  const faqJsonLdStrings =
    !adminHasFaqSchema && cmsBundle?.homepageBlocks?.length
      ? buildHomepageFaqJsonLdStrings(cmsBundle.homepageBlocks)
      : [];

  const homepageJsonLdToRender = [
    ...(adminJsonLdStrings.length > 0
      ? adminJsonLdStrings
      : [getDefaultHomepageJsonLdString(canonicalUrl, storeIdentity.siteName)]),
    ...faqJsonLdStrings,
  ];

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
      <Suspense
        fallback={
          <section
            className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 mt-8 min-h-[120px] animate-pulse"
            aria-busy="true"
            aria-label="Loading homepage content"
          >
            <div className="h-8 bg-gray-200 rounded w-1/3 max-w-md mb-4" />
            <div className="h-4 bg-gray-200 rounded w-full mb-2" />
            <div className="h-4 bg-gray-200 rounded w-5/6" />
          </section>
        }
      >
        <HomePageBelowHero backendAvailable={backendAvailable} />
      </Suspense>
    </>
  );
}
