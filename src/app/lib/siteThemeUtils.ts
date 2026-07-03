/** Fallbacks aligned with `globals.css` and `/api/site-theme` route. */
export const DEFAULT_SITE_THEME = {
  primaryColor: "transparent",
  secondaryColor: "transparent",
  primaryRgb: "0 0 0",
  secondaryRgb: "0 0 0",
  bodyBgColor: "#ffffff",
  bookingServiceCardBgColor: "#ffffff",
} as const;

export function hexToRgbSpaceSeparated(hex: string): string | null {
  const m = /^#?([0-9a-fA-F]{6})$/.exec(hex.trim());
  if (!m) return null;
  const n = parseInt(m[1], 16);
  const r = (n >> 16) & 255;
  const g = (n >> 8) & 255;
  const b = n & 255;
  return `${r} ${g} ${b}`;
}

export type SiteThemeResolved = {
  primaryColor: string;
  secondaryColor: string;
  primaryRgb: string;
  secondaryRgb: string;
  bodyBgColor: string;
  bookingServiceCardBgColor: string;
};

export function resolveBodyBgColor(raw: string): string {
  const trimmed = (raw || "").trim();
  if (!trimmed) return DEFAULT_SITE_THEME.bodyBgColor;
  return hexToRgbSpaceSeparated(trimmed) != null
    ? trimmed
    : DEFAULT_SITE_THEME.bodyBgColor;
}

export function resolveBookingServiceCardBgColor(raw: string): string {
  const trimmed = (raw || "").trim();
  if (!trimmed) return DEFAULT_SITE_THEME.bookingServiceCardBgColor;
  return hexToRgbSpaceSeparated(trimmed) != null
    ? trimmed
    : DEFAULT_SITE_THEME.bookingServiceCardBgColor;
}

export function resolveSiteTheme(
  primaryColor: string,
  secondaryColor: string,
  bodyBgColor?: string,
  bookingServiceCardBgColor?: string
): SiteThemeResolved {
  const pr = hexToRgbSpaceSeparated(primaryColor);
  const sr = hexToRgbSpaceSeparated(secondaryColor);
  const p = pr != null ? primaryColor.trim() : DEFAULT_SITE_THEME.primaryColor;
  const s = sr != null ? secondaryColor.trim() : DEFAULT_SITE_THEME.secondaryColor;
  const primaryRgb =
    pr ?? hexToRgbSpaceSeparated(p) ?? DEFAULT_SITE_THEME.primaryRgb;
  const secondaryRgb =
    sr ?? hexToRgbSpaceSeparated(s) ?? DEFAULT_SITE_THEME.secondaryRgb;
  return {
    primaryColor: p,
    secondaryColor: s,
    primaryRgb,
    secondaryRgb,
    bodyBgColor: resolveBodyBgColor(bodyBgColor ?? ""),
    bookingServiceCardBgColor: resolveBookingServiceCardBgColor(
      bookingServiceCardBgColor ?? ""
    ),
  };
}

/** Single `:root` block for `<style>` in document head (overrides `globals.css`). */
export function siteThemeRootStyleCss(theme: SiteThemeResolved): string {
  return `:root{--primary:${theme.primaryColor};--secondary:${theme.secondaryColor};--primary-rgb:${theme.primaryRgb};--secondary-rgb:${theme.secondaryRgb};--body-bg-color:${theme.bodyBgColor};--booking-service-card-bg:${theme.bookingServiceCardBgColor};}body{background-color:var(--body-bg-color);}`;
}
