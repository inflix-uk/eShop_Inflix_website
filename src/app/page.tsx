import dynamic from "next/dynamic";
import HeroSlider2 from "./components/HeroSlider2";
import Nav from "./components/navbar/Nav";
import NavbarVariantTestBar from "./components/navbar/NavbarVariantTestBar";
import { Metadata } from "next";
import {
  getHomepageFeatures,
  getFeatureImageUrl,
  type HomepageFeature,
} from "./services/homepageFeaturesService";
import { getHomepagePublicSeo } from "./services/homepageDataService";
import {
  getHomepageHeroBannersCached,
  type HomepageHeroPayload,
} from "./services/activeBannersPublicService";
import { emptyHeroSocial } from "./lib/homepageBannerShared";
import {
  getHomeServerCmsBundle,
  createFallbackHomeServerCmsBundle,
} from "./lib/homeServerCms";
import { cmsPublicFetchInit } from "./lib/cmsPublicFetchInit";
import { cmsTimedFetch } from "./lib/cmsTimedFetch";
import {
  getDefaultHomepageJsonLdString,
  metaSchemaEntryToJsonLdString,
} from "./lib/homepageJsonLd";
import HomepageFeatureIcon from "./components/HomepageFeatureIcon";
import { getCanonical } from "@/lib/getCanonical";
import { isBackendAvailable } from "@/app/lib/backendAvailability";
import { getHomeNavbarCriticalServer } from "@/app/services/navbarCriticalServer";
import { getNavbarVariantTestPublicServer } from "@/app/services/navbarVariantTestPublicService";

const HomeClient = dynamic(() => import("./HomeClient"), {
  loading: () => (
    <section
      className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 mt-8 min-h-[120px]"
      aria-busy="true"
      aria-label="Loading homepage content"
    >
      <div className="animate-pulse space-y-4" aria-hidden>
        <div className="h-8 bg-gray-200 rounded w-1/3 max-w-md" />
        <div className="h-4 bg-gray-200 rounded w-full" />
        <div className="h-4 bg-gray-200 rounded w-5/6" />
      </div>
    </section>
  ),
});

/** Fresh homepage CMS on each request — avoids stale blocks after admin saves (ISR was 30s). */
export const revalidate = 0;

async function getMetaData() {
  try {
    const apiUrl = process.env.NEXT_PUBLIC_API_URL;
    const res = await cmsTimedFetch(
      `${apiUrl}/get/static-meta-page/path/${encodeURIComponent("/Homepage")}`,
      { ...cmsPublicFetchInit() }
    );
    if (!res.ok) return null;
    const data = await res.json();
    return data.success ? data.data : null;
  } catch  {
    return null;
  }
}

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
  const backendAvailable = await isBackendAvailable();

  const emptyHeroPayload: HomepageHeroPayload = {
    banners: [],
    heroSocial: emptyHeroSocial(),
  };

  const [homepageSeo, heroPayload, cmsBundle, features, navServerBootstrap, navbarVariantTestConfig] =
    await Promise.all([
      getHomepagePublicSeo().catch((err) => {
        console.error("[Home] homepage SEO fetch failed:", err);
        return null;
      }),
      getHomepageHeroBannersCached().catch((err) => {
        console.error("[Home] hero banners fetch failed:", err);
        return emptyHeroPayload;
      }),
      getHomeServerCmsBundle().catch((err) => {
        console.error("[Home] CMS bundle fetch failed:", err);
        return createFallbackHomeServerCmsBundle();
      }),
      getHomepageFeatures().catch((error) => {
        console.error("[Home] Error fetching homepage features:", error);
        return [] as HomepageFeature[];
      }),
      getHomeNavbarCriticalServer().catch((err) => {
        console.error("[Home] navbar critical fetch failed:", err);
        return {
          items: [],
          logoUrl: null,
          logoAlt: "Zextons",
          supportPhone: "",
          supportEmail: "",
        };
      }),
      getNavbarVariantTestPublicServer().catch((err) => {
        console.error("[Home] navbar variant test fetch failed:", err);
        return null;
      }),
    ]);
  const displayFeatures = features;
  const { banners: heroBanners, heroSocial } = heroPayload;
  const showOverallNavbar = navbarVariantTestConfig?.showOnStorefront !== false;

  const adminJsonLdStrings = (homepageSeo?.metaSchema ?? [])
    .map((entry) => metaSchemaEntryToJsonLdString(entry))
    .filter((s): s is string => s != null && s.length > 0);

  const canonicalUrl = await getCanonical("/");
  const homepageJsonLdToRender =
    adminJsonLdStrings.length > 0
      ? adminJsonLdStrings
      : [getDefaultHomepageJsonLdString(canonicalUrl)];

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
      {displayFeatures.length > 0 && (
        <div className="bg-white text-black py-3 border-b border-gray-100 shadow-lg">
<div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 grid grid-cols-2 gap-3 sm:flex sm:flex-wrap sm:justify-between sm:items-center">            {displayFeatures.map((feature) => {
              const iconUrl = feature.iconImage
                ? getFeatureImageUrl(feature.iconImage)
                : null;
              return (
                <div
                  key={feature._id}
                  className="flex items-center space-x-2 my-1"
                >
                  {iconUrl ? (
                    <HomepageFeatureIcon src={iconUrl} alt={feature.title} />
                  ) : (
                    <div
                      className="w-[25px] h-[25px] bg-primary rounded shrink-0"
                      aria-hidden
                    />
                  )}
                  <div className="flex flex-col">
                    <span className="text-primary font-bold text-sm">
                      {feature.title}
                    </span>
                    <span className="text-xs">{feature.subtitle}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <HomeClient cmsPrefetch={cmsBundle} backendAvailable={backendAvailable} />
    </>
  );
}
