import {
  Cormorant_Garamond,
  Inter,
  Montserrat,
  Poppins,
  Roboto,
} from "next/font/google";

/**
 * Allowed font families (must match backend `typographyConstants.js`).
 * Georgia = system stack (not `next/font` — see `GEORGIA_FONT_STACK_CSS` in typographyThemeUtils).
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

export const inter = Inter({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-inter",
  display: "swap",
  adjustFontFallback: true,
});

export const poppins = Poppins({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-poppins",
  display: "swap",
  adjustFontFallback: true,
});

export const roboto = Roboto({
  subsets: ["latin"],
  weight: ["400", "500", "700"],
  variable: "--font-roboto",
  display: "swap",
  adjustFontFallback: true,
});

export const montserrat = Montserrat({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-montserrat",
  display: "swap",
  adjustFontFallback: true,
});

export const cormorantGaramond = Cormorant_Garamond({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-cormorant-garamond",
  display: "swap",
  adjustFontFallback: true,
});

/** next/font CSS variables (Georgia uses a literal stack, not an entry here). */
export const FONT_CSS_VAR: Record<Exclude<AllowedFontKey, "Georgia">, string> = {
  Inter: "var(--font-inter)",
  Poppins: "var(--font-poppins)",
  Roboto: "var(--font-roboto)",
  Montserrat: "var(--font-montserrat)",
  "Cormorant Garamond": "var(--font-cormorant-garamond)",
};

/** Concatenate for `<html className={...}>` — Google fonts only (static imports). */
export const HTML_FONT_VARIABLE_CLASSES = [
  inter.variable,
  poppins.variable,
  roboto.variable,
  montserrat.variable,
  cormorantGaramond.variable,
].join(" ");
