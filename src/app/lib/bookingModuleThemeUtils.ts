import type { CSSProperties } from "react";

/** Podcast / PSM booking card defaults — used when CMS fields are empty. */
export const DEFAULT_BOOKING_MODULE_UI = {
  serviceCardBgColor: "#0c0c0c",
  buttonBgColor: "#c2fc12",
  buttonTextColor: "#050505",
  listTextColor: "#9ca3af",
  headingColor: "#f5f0e8",
  subheadingColor: "#9ca3af",
  descriptionColor: "#9ca3af",
} as const;

export type BookingModuleUi = {
  serviceCardBgColor: string;
  buttonBgColor: string;
  buttonTextColor: string;
  listTextColor: string;
  headingColor: string;
  subheadingColor: string;
  descriptionColor: string;
};

const FIELD_KEYS = Object.keys(
  DEFAULT_BOOKING_MODULE_UI
) as (keyof BookingModuleUi)[];

function isHex6(value: string): boolean {
  return /^#[0-9a-fA-F]{6}$/.test(value.trim());
}

function resolveField(
  raw: unknown,
  key: keyof BookingModuleUi
): string {
  const trimmed = String(raw ?? "").trim();
  if (trimmed && isHex6(trimmed)) return trimmed.toLowerCase();
  return DEFAULT_BOOKING_MODULE_UI[key];
}

/** Resolve booking module colors from API `uiCustom.booking` (ignores site :root primary/secondary). */
export function resolveBookingModuleUi(
  raw: Partial<Record<keyof BookingModuleUi, string>> | null | undefined
): BookingModuleUi {
  const src = raw && typeof raw === "object" ? raw : {};
  const out = {} as BookingModuleUi;
  for (const key of FIELD_KEYS) {
    out[key] = resolveField(src[key], key);
  }
  return out;
}

/** CSS variables scoped to `.booking-module-root` — higher priority than global theme inside booking cards. */
export function bookingModuleUiStyleVars(
  ui: BookingModuleUi
): Record<string, string> {
  return {
    "--psm-coal": ui.serviceCardBgColor,
    "--psm-green": ui.buttonBgColor,
    "--psm-btn-text": ui.buttonTextColor,
    "--psm-cream": ui.headingColor,
    "--psm-muted": ui.listTextColor,
    "--psm-subheading": ui.subheadingColor,
    "--psm-description": ui.descriptionColor,
    "--psm-line": hexToRgba(ui.buttonBgColor, 0.35),
    "--psm-line-soft": "rgba(255, 255, 255, 0.08)",
  };
}

function hexToRgba(hex: string, alpha: number): string {
  const m = /^#?([0-9a-fA-F]{6})$/.exec(hex.trim());
  if (!m) return `rgba(194, 252, 18, ${alpha})`;
  const n = parseInt(m[1], 16);
  const r = (n >> 16) & 255;
  const g = (n >> 8) & 255;
  const b = n & 255;
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

export function bookingModuleRootStyle(ui: BookingModuleUi): CSSProperties {
  return bookingModuleUiStyleVars(ui) as CSSProperties;
}
