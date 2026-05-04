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
import { cmsPublicFetchInit } from "@/app/lib/cmsPublicFetchInit";
import { cmsTimedFetch, isCmsFetchAbortError } from "@/app/lib/cmsTimedFetch";

export type SiteThemeLayoutBundle = {
  colors: SiteThemeResolved;
  typography: TypographyConfig;
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
      };
    }

    const primary = String(json.data.primaryColor ?? "").trim();
    const secondary = String(json.data.secondaryColor ?? "").trim();
    const colors =
      !primary || !secondary
        ? resolveSiteTheme(
            DEFAULT_SITE_THEME.primaryColor,
            DEFAULT_SITE_THEME.secondaryColor
          )
        : resolveSiteTheme(primary, secondary);

    const typography = resolveTypographyFromApi(json.data);

    return { colors, typography };
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
    };
  }
}
