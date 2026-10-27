import localFont from "next/font/local";

/**
 * Allowed font families (must match backend `typographyConstants.js`).
 * Georgia = system stack (not `next/font` — see `GEORGIA_FONT_STACK_CSS` in typographyThemeUtils).
 *
 * Families are self-hosted Latin files so Turbopack does not resolve
 * `next/font/google` URLs. Google now returns signed `/l/font?kit=…&skey=…`
 * links, and an unescaped `&` makes that resolver reject the query.
 */
export const ALLOWED_FONT_KEYS = [
  "Inter",
  "Poppins",
  "Roboto",
  "Montserrat",
  "Cormorant Garamond",
  "Georgia",
] as const;
export type AllowedFontKey = (typeof ALLOWED_FONT_KEYS)[number];

export const inter = localFont({
  src: "../fonts/inter-latin.woff2",
  weight: "400 700",
  variable: "--font-inter",
  display: "swap",
  adjustFontFallback: "Arial",
  preload: true,
});

export const poppins = localFont({
  src: [
    { path: "../fonts/poppins-400-latin.woff2", weight: "400", style: "normal" },
    { path: "../fonts/poppins-500-latin.woff2", weight: "500", style: "normal" },
    { path: "../fonts/poppins-600-latin.woff2", weight: "600", style: "normal" },
    { path: "../fonts/poppins-700-latin.woff2", weight: "700", style: "normal" },
  ],
  variable: "--font-poppins",
  display: "swap",
  adjustFontFallback: "Arial",
  preload: true,
});

export const roboto = localFont({
  src: "../fonts/roboto-latin.woff2",
  weight: "400 700",
  variable: "--font-roboto",
  display: "swap",
  adjustFontFallback: "Arial",
  preload: true,
});

export const montserrat = localFont({
  src: "../fonts/montserrat-latin.woff2",
  weight: "400 700",
  variable: "--font-montserrat",
  display: "swap",
  adjustFontFallback: "Arial",
  preload: true,
});

export const cormorantGaramond = localFont({
  src: "../fonts/cormorant-garamond-latin.woff2",
  weight: "400 700",
  variable: "--font-cormorant-garamond",
  display: "swap",
  adjustFontFallback: "Times New Roman",
  preload: true,
});

/** next/font CSS variables (Georgia uses a literal stack, not an entry here). */
export const FONT_CSS_VAR: Record<Exclude<AllowedFontKey, "Georgia">, string> = {
  Inter: "var(--font-inter)",
  Poppins: "var(--font-poppins)",
  Roboto: "var(--font-roboto)",
  Montserrat: "var(--font-montserrat)",
  "Cormorant Garamond": "var(--font-cormorant-garamond)",
};

/** Concatenate for `<html className={...}>`. */
export const HTML_FONT_VARIABLE_CLASSES = [
  inter.variable,
  poppins.variable,
  roboto.variable,
  montserrat.variable,
  cormorantGaramond.variable,
].join(" ");
