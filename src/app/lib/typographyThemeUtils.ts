import { FONT_CSS_VAR, type AllowedFontKey } from "@/app/lib/fonts";

/** System Georgia stack. */
export const GEORGIA_FONT_STACK_CSS = 'Georgia, "Times New Roman", serif';

export type TypographyLevel = {
  font: AllowedFontKey;
  weight: 400 | 500 | 600 | 700;
  style: "normal" | "italic";
};

export type TypographyConfig = {
  h1: TypographyLevel;
  h2: TypographyLevel;
  h3: TypographyLevel;
  p: TypographyLevel;
};

const WEIGHTS = new Set([400, 500, 600, 700]);
const STYLES = new Set(["normal", "italic"] as const);

export const DEFAULT_TYPOGRAPHY: TypographyConfig = {
  h1: { font: "Poppins", weight: 600, style: "normal" },
  h2: { font: "Georgia", weight: 400, style: "italic" },
  h3: { font: "Roboto", weight: 500, style: "normal" },
  /** Body + most page chrome inherit `p` — default Roboto (not Inter) when nothing saved. */
  p: { font: "Roboto", weight: 400, style: "normal" },
};

const FONT_BY_LC = new Map<string, AllowedFontKey>([
  ["poppins", "Poppins"],
  ["roboto", "Roboto"],
  ["inter", "Inter"],
  ["montserrat", "Montserrat"],
  ["cormorant garamond", "Cormorant Garamond"],
  ["cormorantgaramond", "Cormorant Garamond"],
  ["cormorant_garamond", "Cormorant Garamond"],
  ["georgia", "Georgia"],
]);

function coerceFont(f: unknown, fallbackFont: AllowedFontKey): AllowedFontKey {
  const s = String(f ?? "").trim();
  if (!s) return fallbackFont;
  const canon = FONT_BY_LC.get(s.toLowerCase());
  return canon ?? fallbackFont;
}

function coerceWeight(w: unknown): TypographyLevel["weight"] {
  const n = Number(w);
  if (WEIGHTS.has(n as TypographyLevel["weight"])) return n as TypographyLevel["weight"];
  return 400;
}

function coerceStyle(s: unknown): TypographyLevel["style"] {
  return s === "italic" ? "italic" : "normal";
}

function coerceLevel(raw: unknown, fallback: TypographyLevel): TypographyLevel {
  if (!raw || typeof raw !== "object") return { ...fallback };
  const o = raw as Record<string, unknown>;
  return {
    font: coerceFont(o.font, fallback.font),
    weight: coerceWeight(o.weight),
    style: coerceStyle(o.style),
  };
}

/** Deep-enough clone for immutable defaults (avoid mutating shared defaults). */
export function cloneTypographyDefaults(): TypographyConfig {
  return {
    h1: { ...DEFAULT_TYPOGRAPHY.h1 },
    h2: { ...DEFAULT_TYPOGRAPHY.h2 },
    h3: { ...DEFAULT_TYPOGRAPHY.h3 },
    p: { ...DEFAULT_TYPOGRAPHY.p },
  };
}

export function resolveTypographyFromApi(data: unknown): TypographyConfig {
  if (!data || typeof data !== "object") return cloneTypographyDefaults();
  const o = data as Record<string, unknown>;
  const t =
    o.typography && typeof o.typography === "object"
      ? (o.typography as Record<string, unknown>)
      : o;
  return {
    h1: coerceLevel(t.h1, DEFAULT_TYPOGRAPHY.h1),
    h2: coerceLevel(t.h2, DEFAULT_TYPOGRAPHY.h2),
    h3: coerceLevel(t.h3, DEFAULT_TYPOGRAPHY.h3),
    p: coerceLevel(t.p, DEFAULT_TYPOGRAPHY.p),
  };
}

function familyCssValue(font: AllowedFontKey): string {
  if (font === "Georgia") return GEORGIA_FONT_STACK_CSS;
  return FONT_CSS_VAR[font];
}

/**
 * Selectors that must match / beat `@tailwindcss/typography` (e.g. `.prose h3`), which
 * otherwise wins over bare `h3` and makes headings inherit `body.font-sans` → `--p-font`.
 */
export const CMS_TYPO_CONTEXTS = [
  "",
  ".prose ",
  ".blog-content ",
  ".category-content ",
  ".product-content ",
];

function levelSelectors(tag: "h1" | "h2" | "h3" | "p"): string {
  return CMS_TYPO_CONTEXTS.map((ctx) => `${ctx}${tag}`.trim()).join(",");
}

/**
 * :root variables + element rules. Injected in <head> after `globals.css` for first paint.
 */
export function typographyThemeStyleCss(typography: TypographyConfig): string {
  const t = typography;
  const lines: string[] = [
    `:root{`,
    `--h1-font:${familyCssValue(t.h1.font)};--h1-weight:${t.h1.weight};--h1-style:${t.h1.style};`,
    `--h2-font:${familyCssValue(t.h2.font)};--h2-weight:${t.h2.weight};--h2-style:${t.h2.style};`,
    `--h3-font:${familyCssValue(t.h3.font)};--h3-weight:${t.h3.weight};--h3-style:${t.h3.style};`,
    `--p-font:${familyCssValue(t.p.font)};--p-weight:${t.p.weight};--p-style:${t.p.style};`,
    `}`,
    `${levelSelectors("h1")}{font-family:var(--h1-font),ui-sans-serif,system-ui,sans-serif;font-weight:var(--h1-weight);font-style:var(--h1-style);}`,
    `${levelSelectors("h2")}{font-family:var(--h2-font),ui-sans-serif,system-ui,sans-serif;font-weight:var(--h2-weight);font-style:var(--h2-style);}`,
    `${levelSelectors("h3")}{font-family:var(--h3-font),ui-sans-serif,system-ui,sans-serif;font-weight:var(--h3-weight);font-style:var(--h3-style);}`,
    `${levelSelectors("p")}{font-family:var(--p-font),ui-sans-serif,system-ui,sans-serif;font-weight:var(--p-weight);font-style:var(--p-style);}`,
    /* `p` drives body: most non-heading text inherits from `body` (nav, cards, divs). */
    `body.font-sans{font-family:var(--p-font),ui-sans-serif,system-ui,sans-serif;font-weight:var(--p-weight);font-style:var(--p-style);}`,
  ];
  return lines.join("");
}
