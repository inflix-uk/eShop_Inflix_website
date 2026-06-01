import HomeClient from "@/app/HomeClient";
import HomepageFeatureIcon from "@/app/components/HomepageFeatureIcon";
import {
  createFallbackHomeServerCmsBundle,
  getHomeServerCmsBundle,
} from "@/app/lib/homeServerCms";
import {
  getFeatureImageUrl,
  getHomepageFeatures,
  type HomepageFeature,
} from "@/app/services/homepageFeaturesService";

function FeaturesStrip({ features }: { features: HomepageFeature[] }) {
  if (!features.length) return null;
  return (
    <div className="bg-white text-black py-3 border-b border-gray-100 shadow-lg">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 grid grid-cols-2 gap-3 sm:flex sm:flex-wrap sm:justify-between sm:items-center">
        {features.map((feature) => {
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
  );
}

/**
 * Below-hero homepage: CMS blocks + features. Streamed via Suspense so hero HTML
 * can flush before slower CMS/features API calls (lower TTFB / document latency).
 */
export default async function HomePageBelowHero({
  backendAvailable,
}: {
  backendAvailable: boolean;
}) {
  const [cmsBundle, features] = await Promise.all([
    getHomeServerCmsBundle().catch((err) => {
      console.error("[Home] CMS bundle fetch failed:", err);
      return createFallbackHomeServerCmsBundle();
    }),
    getHomepageFeatures().catch((error) => {
      console.error("[Home] Error fetching homepage features:", error);
      return [] as HomepageFeature[];
    }),
  ]);

  return (
    <>
      <FeaturesStrip features={features} />
      <HomeClient cmsPrefetch={cmsBundle} backendAvailable={backendAvailable} />
    </>
  );
}
