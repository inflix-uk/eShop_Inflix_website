"use client";

import React from "react";
import {
  isCatalogPresetIconId,
  renderPresetCatalogIcon,
} from "./catalogPresetIcons";

function apiBase(): string {
  const u = process.env.NEXT_PUBLIC_API_URL || "";
  return u.endsWith("/") ? u.slice(0, -1) : u;
}

export function decodeIconHtmlIfNeeded(str: string): string {
  if (!str || typeof str !== "string") return str;
  const t = str.trim();
  if (t.includes("&lt;") && !t.includes("<")) {
    if (typeof document === "undefined") {
      return t
        .replace(/&lt;/gi, "<")
        .replace(/&gt;/gi, ">")
        .replace(/&quot;/gi, '"')
        .replace(/&#39;/g, "'")
        .replace(/&amp;/gi, "&");
    }
    try {
      const ta = document.createElement("textarea");
      ta.innerHTML = t;
      return ta.value.trim();
    } catch {
      return t;
    }
  }
  return t;
}

export function looksLikeIconHtml(str: string): boolean {
  if (!str || typeof str !== "string") return false;
  return decodeIconHtmlIfNeeded(str).includes("<");
}

export function looksLikeImageUrl(str: string): boolean {
  if (!str || typeof str !== "string") return false;
  const t = str.trim();
  return (
    /^https?:\/\//i.test(t) ||
    /^\/uploads\//i.test(t) ||
    /^data:image\//i.test(t)
  );
}

export function getVariantValueImageSrc(
  image?: { url?: string; path?: string } | null
): string | null {
  if (!image) return null;
  if (image.url) return image.url;
  if (image.path) {
    const base = apiBase();
    const p = image.path.startsWith("/") ? image.path : `/${image.path}`;
    return base ? `${base}${p}` : p;
  }
  return null;
}

export type VariantOptionIconish = {
  icon?: string | null;
  image?: { url?: string; path?: string } | null;
};

export function renderVariantOptionIcon(
  item: VariantOptionIconish,
  className: string,
  innerClassName: string
): React.ReactNode {
  const imgFromValue = getVariantValueImageSrc(item.image ?? null);
  if (imgFromValue) {
    return (
      <img src={imgFromValue} alt="" className={`${className} object-contain`} />
    );
  }

  const raw = typeof item.icon === "string" ? item.icon.trim() : "";
  if (raw && looksLikeIconHtml(raw)) {
    const html = decodeIconHtmlIfNeeded(raw);
    return (
      <span
        className={innerClassName}
        dangerouslySetInnerHTML={{ __html: html }}
      />
    );
  }

  if (raw && looksLikeImageUrl(raw)) {
    return <img src={raw} alt="" className={`${className} object-contain`} />;
  }

  if (raw && isCatalogPresetIconId(raw)) {
    const preset = renderPresetCatalogIcon(raw, className, innerClassName);
    if (preset) return preset;
  }

  return null;
}
