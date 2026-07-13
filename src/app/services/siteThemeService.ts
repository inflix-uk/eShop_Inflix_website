import {
  DEFAULT_SITE_THEME,
  resolveSiteTheme,
  type SiteThemeResolved,
} from "@/app/lib/siteThemeUtils";
import {
  cloneTypographyDefaults,
  resolveTypographyFromApi,
  type TypographyConfig,
} from "@/app/lib/typographyThemeUtils";
import {
  cloneTagColorDefaults,
  resolveTagColorsFromApi,
  resolveTagColorsEnabled,
  type TagColorsConfig,
} from "@/app/lib/tagColorsThemeUtils";
import {
  resolveBookingModuleUi,
  type BookingModuleUi,
} from "@/app/lib/bookingModuleThemeUtils";
import { cmsPublicFetchInit } from "@/app/lib/cmsPublicFetchInit";
import { cmsTimedFetch, isCmsFetchAbortError } from "@/app/lib/cmsTimedFetch";

export type SiteThemeLayoutBundle = {
  colors: SiteThemeResolved;
  typography: TypographyConfig;
  tagColors: TagColorsConfig;
  tagColorsEnabled: boolean;
  bookingModuleUi: BookingModuleUi;
};

/**
 * Server-side fetch for public site theme (colors + typography).
 * Same upstream as `/site-theme/public` — single request for layout (no flicker).
 */
export async function getSiteThemePublic(): Promise<SiteThemeLayoutBundle> {
  const base = (process.env.NEXT_PUBLIC_API_URL || "").replace(/\/$/, "");
  if (!base) {
    return {
      colors: resolveSiteTheme(
        DEFAULT_SITE_THEME.primaryColor,
        DEFAULT_SITE_THEME.secondaryColor
      ),
      typography: cloneTypographyDefaults(),
      tagColors: cloneTagColorDefaults(),
      tagColorsEnabled: true,
      bookingModuleUi: resolveBookingModuleUi(null),
    };
  }

  try {
    const res = await cmsTimedFetch(`${base}/site-theme/public`, {
      headers: { Accept: "application/json" },
      ...cmsPublicFetchInit({ next: { revalidate: 120 } }),
    });

    if (!res.ok) {
      return {
        colors: resolveSiteTheme(
          DEFAULT_SITE_THEME.primaryColor,
          DEFAULT_SITE_THEME.secondaryColor
        ),
        typography: cloneTypographyDefaults(),
        tagColors: cloneTagColorDefaults(),
        tagColorsEnabled: true,
        bookingModuleUi: resolveBookingModuleUi(null),
      };
    }

    const json = await res.json();
    if (!json?.success || !json?.data) {
      return {
        colors: resolveSiteTheme(
          DEFAULT_SITE_THEME.primaryColor,
          DEFAULT_SITE_THEME.secondaryColor
        ),
        typography: cloneTypographyDefaults(),
        tagColors: cloneTagColorDefaults(),
        tagColorsEnabled: true,
        bookingModuleUi: resolveBookingModuleUi(null),
      };
    }

    const primary = String(json.data.primaryColor ?? "").trim();
    const secondary = String(json.data.secondaryColor ?? "").trim();
    const bodyBg = String(json.data.bodyBgColor ?? "").trim();
    const bookingCardBg = String(
      json.data.uiCustom?.booking?.serviceCardBgColor ?? ""
    ).trim();
    const colors =
      !primary || !secondary
        ? resolveSiteTheme(
            DEFAULT_SITE_THEME.primaryColor,
            DEFAULT_SITE_THEME.secondaryColor,
            bodyBg,
            bookingCardBg
          )
        : resolveSiteTheme(primary, secondary, bodyBg, bookingCardBg);

    const typography = resolveTypographyFromApi(json.data);
    const tagColors = resolveTagColorsFromApi(json.data);
    const tagColorsEnabled = resolveTagColorsEnabled(json.data);
    const bookingModuleUi = resolveBookingModuleUi(json.data.uiCustom?.booking);

    return { colors, typography, tagColors, tagColorsEnabled, bookingModuleUi };
  } catch (e) {
    if (!isCmsFetchAbortError(e)) {
      console.error("[siteThemeService] public fetch:", e);
    }
    return {
      colors: resolveSiteTheme(
        DEFAULT_SITE_THEME.primaryColor,
        DEFAULT_SITE_THEME.secondaryColor
      ),
      typography: cloneTypographyDefaults(),
      tagColors: cloneTagColorDefaults(),
      tagColorsEnabled: true,
      bookingModuleUi: resolveBookingModuleUi(null),
    };
  }
}
