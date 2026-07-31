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

export type BookingCardThemeVars = {
  bookingCardFg: string;
  bookingCardFgMuted: string;
  bookingCardSurface: string;
  bookingCardSurfaceBorder: string;
  bookingCardDivider: string;
};

function parseHex6(hex: string): { r: number; g: number; b: number } | null {
  const m = /^#?([0-9a-fA-F]{6})$/.exec(hex.trim());
  if (!m) return null;
  const n = parseInt(m[1], 16);
  return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
}

function toHex(r: number, g: number, b: number): string {
  return `#${[r, g, b]
    .map((c) =>
      Math.min(255, Math.max(0, Math.round(c)))
        .toString(16)
        .padStart(2, "0")
    )
    .join("")}`;
}

/** Blend card bg toward black/white so nested surfaces stay readable on any admin color. */
function mixHex(bg: string, mix: string, bgPercent: number): string {
  const a = parseHex6(bg);
  const b = parseHex6(mix);
  if (!a || !b) return bg;
  const w = bgPercent / 100;
  const rw = 1 - w;
  return toHex(
    a.r * w + b.r * rw,
    a.g * w + b.g * rw,
    a.b * w + b.b * rw
  );
}

function relativeLuminanceHex(hex: string): number {
  const rgb = parseHex6(hex);
  if (!rgb) return 1;
  const lin = [rgb.r, rgb.g, rgb.b].map((c) => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * lin[0] + 0.7152 * lin[1] + 0.0722 * lin[2];
}

/** Contrast tokens for text, dividers, and inset rows inside booking cards. */
export function resolveBookingCardThemeVars(
  cardBgHex: string
): BookingCardThemeVars {
  const cardBg = resolveBookingServiceCardBgColor(cardBgHex);
  const isLight = relativeLuminanceHex(cardBg) > 0.45;
  const mixTarget = isLight ? "#000000" : "#ffffff";
  return {
    bookingCardFg: isLight ? "#111827" : "#f9fafb",
    bookingCardFgMuted: isLight ? "#6b7280" : "#d1d5db",
    bookingCardSurface: mixHex(cardBg, mixTarget, isLight ? 90 : 85),
    bookingCardSurfaceBorder: mixHex(cardBg, mixTarget, isLight ? 78 : 72),
    bookingCardDivider: mixHex(cardBg, mixTarget, isLight ? 82 : 76),
  };
}

export function bookingCardThemeVarsCss(cardBgHex: string): string {
  const v = resolveBookingCardThemeVars(cardBgHex);
  return [
    `--booking-card-fg:${v.bookingCardFg}`,
    `--booking-card-fg-muted:${v.bookingCardFgMuted}`,
    `--booking-card-surface:${v.bookingCardSurface}`,
    `--booking-card-surface-border:${v.bookingCardSurfaceBorder}`,
    `--booking-card-divider:${v.bookingCardDivider}`,
  ].join(";");
}

export function applyBookingCardThemeToRoot(
  root: HTMLElement,
  cardBgHex: string
): void {
  const v = resolveBookingCardThemeVars(cardBgHex);
  root.style.setProperty("--booking-card-fg", v.bookingCardFg);
  root.style.setProperty("--booking-card-fg-muted", v.bookingCardFgMuted);
  root.style.setProperty("--booking-card-surface", v.bookingCardSurface);
  root.style.setProperty(
    "--booking-card-surface-border",
    v.bookingCardSurfaceBorder
  );
  root.style.setProperty("--booking-card-divider", v.bookingCardDivider);
}

export type CheckoutThemeVars = {
  checkoutFg: string;
  checkoutFgMuted: string;
  checkoutPanelBg: string;
  checkoutPanelShell: string;
  checkoutInputBg: string;
  checkoutBorder: string;
};

/** Contrast tokens for checkout panels/inputs derived from CMS body background. */
export function resolveCheckoutThemeVars(bodyBgHex: string): CheckoutThemeVars {
  const bodyBg = resolveBodyBgColor(bodyBgHex);
  const isLight = relativeLuminanceHex(bodyBg) > 0.45;
  if (isLight) {
    return {
      checkoutFg: "#111827",
      checkoutFgMuted: "#6b7280",
      checkoutPanelBg: "#ffffff",
      checkoutPanelShell: "#f3f4f6",
      checkoutInputBg: "#ffffff",
      checkoutBorder: "#e5e7eb",
    };
  }
  return {
    checkoutFg: "#f9fafb",
    checkoutFgMuted: "#d1d5db",
    checkoutPanelBg: mixHex(bodyBg, "#ffffff", 88),
    checkoutPanelShell: mixHex(bodyBg, "#ffffff", 92),
    checkoutInputBg: mixHex(bodyBg, "#ffffff", 82),
    checkoutBorder: mixHex(bodyBg, "#ffffff", 72),
  };
}

export function checkoutThemeVarsCss(bodyBgHex: string): string {
  const v = resolveCheckoutThemeVars(bodyBgHex);
  return [
    `--checkout-fg:${v.checkoutFg}`,
    `--checkout-fg-muted:${v.checkoutFgMuted}`,
    `--checkout-panel-bg:${v.checkoutPanelBg}`,
    `--checkout-panel-shell:${v.checkoutPanelShell}`,
    `--checkout-input-bg:${v.checkoutInputBg}`,
    `--checkout-border:${v.checkoutBorder}`,
  ].join(";");
}

export function applyCheckoutThemeToRoot(
  root: HTMLElement,
  bodyBgHex: string
): void {
  const v = resolveCheckoutThemeVars(bodyBgHex);
  root.style.setProperty("--checkout-fg", v.checkoutFg);
  root.style.setProperty("--checkout-fg-muted", v.checkoutFgMuted);
  root.style.setProperty("--checkout-panel-bg", v.checkoutPanelBg);
  root.style.setProperty("--checkout-panel-shell", v.checkoutPanelShell);
  root.style.setProperty("--checkout-input-bg", v.checkoutInputBg);
  root.style.setProperty("--checkout-border", v.checkoutBorder);
}

/** Single `:root` block for `<style>` in document head (overrides `globals.css`). */
export function siteThemeRootStyleCss(theme: SiteThemeResolved): string {
  const bookingVars = bookingCardThemeVarsCss(theme.bookingServiceCardBgColor);
  const checkoutVars = checkoutThemeVarsCss(theme.bodyBgColor);
  return `:root{--primary:${theme.primaryColor};--secondary:${theme.secondaryColor};--primary-rgb:${theme.primaryRgb};--secondary-rgb:${theme.secondaryRgb};--body-bg-color:${theme.bodyBgColor};--booking-service-card-bg:${theme.bookingServiceCardBgColor};${bookingVars};${checkoutVars};}body{background-color:var(--body-bg-color);}`;
}
