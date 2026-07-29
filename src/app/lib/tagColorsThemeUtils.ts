import { CMS_TYPO_CONTEXTS } from "@/app/lib/typographyThemeUtils";

export type TagColorKey = "h1" | "h2" | "h3" | "h4" | "h5" | "h6" | "p" | "span" | "label" | "bookingCalendarDate" | "bookingSelectedDateBg" | "bookingSelectedSlotBg";

export type TagColorsConfig = Record<TagColorKey, string>;

export const DEFAULT_TAG_COLORS: TagColorsConfig = {
  h1: "#111827",
  h2: "#111827",
  h3: "#1f2937",
  h4: "#1f2937",
  h5: "#374151",
  h6: "#374151",
  p: "#374151",
  span: "#374151",
  label: "#374151",
  bookingCalendarDate: "#111827",
  bookingSelectedDateBg: "#c2fc12",
  bookingSelectedSlotBg: "#c2fc12",
};

const TAG_KEYS: TagColorKey[] = ["h1", "h2", "h3", "h4", "h5", "h6", "p", "span", "label", "bookingCalendarDate", "bookingSelectedDateBg", "bookingSelectedSlotBg"];

const CUSTOM_SELECTORS: Partial<Record<TagColorKey, string>> = {
  bookingCalendarDate: "[data-booking-calendar-date]:not([data-selected]):not(:disabled),[data-booking-slot]:not([data-selected]):not(:disabled)",
  bookingSelectedDateBg: "[data-booking-calendar-date][data-selected='true']",
  bookingSelectedSlotBg: "[data-booking-slot][data-selected='true']",
};

const BG_COLOR_KEYS: TagColorKey[] = ["bookingSelectedDateBg", "bookingSelectedSlotBg"];

function normalizeHex(value: string): string | null {
  const v = (value || "").trim();
  if (/^#[0-9A-Fa-f]{6}$/.test(v)) return v.toLowerCase();
  if (/^#[0-9A-Fa-f]{3}$/.test(v)) {
    const r = v[1];
    const g = v[2];
    const b = v[3];
    return `#${r}${r}${g}${g}${b}${b}`.toLowerCase();
  }
  return null;
}

export function cloneTagColorDefaults(): TagColorsConfig {
  return { ...DEFAULT_TAG_COLORS };
}

export function resolveTagColorsFromApi(data: unknown): TagColorsConfig {
  const o = data && typeof data === "object" ? (data as Record<string, unknown>) : {};
  const raw =
    o.tagColors && typeof o.tagColors === "object"
      ? (o.tagColors as Record<string, unknown>)
      : o;
  const out = cloneTagColorDefaults();
  for (const key of TAG_KEYS) {
    const hex = normalizeHex(String(raw[key] ?? ""));
    if (hex) out[key] = hex;
  }
  return out;
}

/** Exclude chrome that must keep its own Tailwind colors (checkout cards, banners, navbar CTAs). */
const CUSTOM_COLOR_EXCLUSION =
  ":not([data-banner-text]):not([data-navbar-btn-text]):not([data-booking-btn-text]):not(.checkout-order-summary *):not(.booking-confirmation-module *)";

function levelSelectors(tag: TagColorKey): string {
  if (CUSTOM_SELECTORS[tag]) {
    return CUSTOM_SELECTORS[tag]!;
  }
  return CMS_TYPO_CONTEXTS.map((ctx) => `${ctx}${tag}${CUSTOM_COLOR_EXCLUSION}`.trim()).join(",");
}

/**
 * `!important` beats Tailwind utilities like `text-gray-900` on the same element.
 * Injected after globals + typography in `<head>`.
 */
export function tagColorsThemeStyleCss(tagColors: TagColorsConfig): string {
  const vars = TAG_KEYS.map((k) => `--${k}-color:${tagColors[k]}`).join(";");
  const rules = TAG_KEYS.map((k) => {
    const selector = levelSelectors(k);
    if (BG_COLOR_KEYS.includes(k)) {
      return `${selector}{background-color:var(--${k}-color)!important;border-color:var(--${k}-color)!important;}`;
    }
    return `${selector}{color:var(--${k}-color)!important;}`;
  });
  return `:root{${vars}}${rules.join("")}`;
}

export const TAG_COLORS_STYLE_ID = "cms-tag-colors-theme";

export function resolveTagColorsEnabled(data: unknown): boolean {
  if (!data || typeof data !== "object") return true;
  const o = data as Record<string, unknown>;
  if (typeof o.tagColorsEnabled === "boolean") return o.tagColorsEnabled;
  return true;
}

export function applyTagColorsStyleDocument(
  doc: Document,
  tagColors: TagColorsConfig
): void {
  const css = tagColorsThemeStyleCss(tagColors);
  let el = doc.getElementById(TAG_COLORS_STYLE_ID) as HTMLStyleElement | null;
  if (!el) {
    el = doc.createElement("style");
    el.id = TAG_COLORS_STYLE_ID;
    doc.head.appendChild(el);
  }
  el.textContent = css;
}

export function removeTagColorsStyleDocument(doc: Document): void {
  const el = doc.getElementById(TAG_COLORS_STYLE_ID);
  if (el) el.remove();
}
