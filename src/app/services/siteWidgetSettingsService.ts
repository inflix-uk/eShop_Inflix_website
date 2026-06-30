import {
  cmsLivePublicFetchInit,
  cmsPublicFetchInit,
} from "@/app/lib/cmsPublicFetchInit";
import { cmsTimedFetch } from "@/app/lib/cmsTimedFetch";
import { resolveCmsApiBase } from "@/app/lib/cmsApiBase";
import {
  DEFAULT_SITE_WIDGET_VISIBILITY,
  type SiteWidgetVisibility,
} from "@/app/lib/siteWidgetVisibilityDefaults";

export type { SiteWidgetVisibility } from "@/app/lib/siteWidgetVisibilityDefaults";
export { DEFAULT_SITE_WIDGET_VISIBILITY } from "@/app/lib/siteWidgetVisibilityDefaults";

const API_URL = resolveCmsApiBase();

/**
 * Global widget visibility (slider, newsletter, FAQ) for the public site.
 */
export async function getSiteWidgetSettingsPublic(options?: {
  live?: boolean;
}): Promise<SiteWidgetVisibility> {
  const cacheInit = options?.live ? cmsLivePublicFetchInit() : cmsPublicFetchInit();
  try {
    const response = await cmsTimedFetch(`${API_URL}/site-widget-settings/public`, {
      method: "GET",
      headers: { "Content-Type": "application/json" },
      ...cacheInit,
    });
    if (!response.ok) {
      return DEFAULT_SITE_WIDGET_VISIBILITY;
    }
    const json = await response.json();
    if (!json.success || !json.data) {
      return DEFAULT_SITE_WIDGET_VISIBILITY;
    }
    const d = json.data;
    return {
      sliderEnabled: d.sliderEnabled !== false,
      newsletterEnabled: d.newsletterEnabled !== false,
      faqEnabled: d.faqEnabled !== false,
      videoEnabled: d.videoEnabled !== false,
      mapEnabled: d.mapEnabled !== false,
      galleryEnabled: d.galleryEnabled !== false,
      iconBoxEnabled: d.iconBoxEnabled !== false,
      testimonialsEnabled: d.testimonialsEnabled !== false,
      trustpilotWidgetEnabled: d.trustpilotWidgetEnabled !== false,
      siteBannersEnabled: d.siteBannersEnabled !== false,
      categoryCardsEnabled: d.categoryCardsEnabled !== false,
      promotionalSectionsEnabled: d.promotionalSectionsEnabled !== false,
      latestBlogsEnabled: d.latestBlogsEnabled !== false,
      htmlCssEnabled: d.htmlCssEnabled !== false,
      contactUsEnabled: d.contactUsEnabled !== false,
    };
  } catch {
    return DEFAULT_SITE_WIDGET_VISIBILITY;
  }
}
