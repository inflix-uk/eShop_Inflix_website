import type { CSSProperties } from "react";

/**
 * Hero banner video display size / ratio (admin Video tab → storefront background).
 */

export const BANNER_HERO_DESKTOP_W = 1200;
export const BANNER_HERO_DESKTOP_H = 417;
export const BANNER_HERO_MOBILE_W = 1080;
export const BANNER_HERO_MOBILE_H = 1920;

export type BannerVideoLayoutPreset =
  | "hero"
  | "16:9"
  | "21:9"
  | "4:3"
  | "9:16"
  | "custom";

export const BANNER_VIDEO_LAYOUT_OPTIONS: {
  value: BannerVideoLayoutPreset;
  label: string;
  hint: string;
}[] = [
  {
    value: "hero",
    label: "Match hero images",
    hint: `Desktop ${BANNER_HERO_DESKTOP_W}×${BANNER_HERO_DESKTOP_H}, mobile ${BANNER_HERO_MOBILE_W}×${BANNER_HERO_MOBILE_H}`,
  },
  { value: "16:9", label: "16:9 Widescreen", hint: "Standard wide video" },
  { value: "21:9", label: "21:9 Ultrawide", hint: "Cinematic wide" },
  { value: "4:3", label: "4:3 Standard", hint: "Classic TV ratio" },
  { value: "9:16", label: "9:16 Vertical", hint: "Stories / mobile portrait" },
  { value: "custom", label: "Custom (px)", hint: "Your own width × height" },
];

export type ResolvedVideoAspect = {
  width: number;
  height: number;
  aspectRatioCss: string;
};

export function parseBannerVideoLayoutPreset(raw: unknown): BannerVideoLayoutPreset {
  const s = String(raw ?? "hero").trim() as BannerVideoLayoutPreset;
  return BANNER_VIDEO_LAYOUT_OPTIONS.some((o) => o.value === s) ? s : "hero";
}

export function parseBannerVideoPx(raw: unknown): number | undefined {
  const n = Number(raw);
  if (!Number.isFinite(n) || n <= 0) return undefined;
  return Math.round(Math.min(3840, n));
}

export function resolveBannerVideoAspect(
  preset: BannerVideoLayoutPreset,
  customWidthPx: number | undefined,
  customHeightPx: number | undefined,
  variant: "desktop" | "mobile" = "desktop"
): ResolvedVideoAspect {
  if (preset === "custom") {
    const w = customWidthPx;
    const h = customHeightPx;
    if (w && h) {
      return {
        width: w,
        height: h,
        aspectRatioCss: `${w} / ${h}`,
      };
    }
  }

  if (preset === "hero") {
    const w = variant === "mobile" ? BANNER_HERO_MOBILE_W : BANNER_HERO_DESKTOP_W;
    const h = variant === "mobile" ? BANNER_HERO_MOBILE_H : BANNER_HERO_DESKTOP_H;
    return { width: w, height: h, aspectRatioCss: `${w} / ${h}` };
  }

  const ratioMap: Record<string, [number, number]> = {
    "16:9": [16, 9],
    "21:9": [21, 9],
    "4:3": [4, 3],
    "9:16": [9, 16],
  };
  const pair = ratioMap[preset] ?? [16, 9];
  return {
    width: pair[0],
    height: pair[1],
    aspectRatioCss: `${pair[0]} / ${pair[1]}`,
  };
}

/** Clips video to admin ratio; banner slide height / text layout stay unchanged. */
export function buildBannerVideoBoxStyle(aspect: ResolvedVideoAspect): CSSProperties {
  return {
    position: "relative",
    width: "100%",
    maxWidth: "100%",
    height: "100%",
    maxHeight: "100%",
    aspectRatio: aspect.aspectRatioCss,
    margin: "0 auto",
    overflow: "hidden",
  };
}
