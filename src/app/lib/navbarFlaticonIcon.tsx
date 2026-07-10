"use client";

import { useEffect } from "react";
import type { IconType } from "react-icons";

export const FLATICON_STYLESHEETS = [
  "https://cdn-uicons.flaticon.com/2.6.0/uicons-regular-rounded/css/uicons-regular-rounded.css",
  "https://cdn-uicons.flaticon.com/2.6.0/uicons-bold-rounded/css/uicons-bold-rounded.css",
  "https://cdn-uicons.flaticon.com/2.6.0/uicons-solid-rounded/css/uicons-solid-rounded.css",
  "https://cdn-uicons.flaticon.com/2.6.0/uicons-regular-straight/css/uicons-regular-straight.css",
  "https://cdn-uicons.flaticon.com/2.6.0/uicons-bold-straight/css/uicons-bold-straight.css",
  "https://cdn-uicons.flaticon.com/2.6.0/uicons-solid-straight/css/uicons-solid-straight.css",
  "https://cdn-uicons.flaticon.com/2.6.0/uicons-brands/css/uicons-brands.css",
];

export const DEFAULT_NAVBAR_FLATICON = "fi-rr-apps";

export const LEGACY_FEATHER_TO_FLATICON: Record<string, string> = {
  FiHome: "fi-rr-home",
  FiGrid: "fi-rr-apps",
  FiStar: "fi-rr-star",
  FiTag: "fi-rr-tags",
  FiShoppingCart: "fi-rr-shopping-cart",
  FiUser: "fi-rr-user",
  FiDownload: "fi-rr-download",
  FiPhone: "fi-rr-phone-call",
  FiSearch: "fi-rr-search",
};

export function loadFlaticonStylesheets() {
  if (typeof document === "undefined") return;
  FLATICON_STYLESHEETS.forEach((href) => {
    if (document.querySelector(`link[rel="stylesheet"][href="${href}"]`)) return;
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = href;
    document.head.appendChild(link);
  });
}

export function useFlaticonStylesheets() {
  useEffect(() => {
    loadFlaticonStylesheets();
  }, []);
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

export function looksLikeFlaticonClass(str: string): boolean {
  if (!str || typeof str !== "string") return false;
  const t = str.trim();
  return (
    /^fi[\s-]/i.test(t) ||
    /\bfi-(rr|br|sr|rs|bs|ss|tr|ts)-/i.test(t)
  );
}

function toFlaticonHtml(classOrClasses: string): string {
  const t = String(classOrClasses || "").trim();
  if (!t) return `<i class="fi ${DEFAULT_NAVBAR_FLATICON}"></i>`;
  if (looksLikeIconHtml(t)) return decodeIconHtmlIfNeeded(t);

  let cls = t;
  if (!/\bfi[\s-]/i.test(cls)) {
    cls = `fi fi-rr-${cls.replace(/^fi-?/i, "")}`;
  } else if (cls.startsWith("fi-")) {
    cls = `fi ${cls}`;
  }

  return `<i class="${cls}"></i>`;
}

export function normalizeNavbarIconHtml(
  code: string | undefined | null,
  fallback = DEFAULT_NAVBAR_FLATICON
): string {
  const raw = String(code || "").trim();
  if (!raw) return toFlaticonHtml(fallback);
  if (looksLikeIconHtml(raw)) return decodeIconHtmlIfNeeded(raw);
  if (LEGACY_FEATHER_TO_FLATICON[raw]) return toFlaticonHtml(LEGACY_FEATHER_TO_FLATICON[raw]);
  if (looksLikeFlaticonClass(raw)) return toFlaticonHtml(raw);
  return toFlaticonHtml(fallback);
}

export function NavbarIcon({
  code,
  className = "",
  fallback = DEFAULT_NAVBAR_FLATICON,
  reactIconMap,
}: {
  code?: string | null;
  className?: string;
  fallback?: string;
  reactIconMap?: Record<string, IconType>;
}) {
  const raw = String(code || "").trim();
  if (raw && reactIconMap?.[raw]) {
    const Icon = reactIconMap[raw];
    return <Icon className={className} aria-hidden />;
  }

  const html = normalizeNavbarIconHtml(code, fallback);
  return (
    <span
      data-nav-link-icon=""
      className={`inline-flex items-center justify-center [&>i]:text-[1em] [&>i]:text-inherit ${className || ""}`}
      dangerouslySetInnerHTML={{ __html: html }}
      aria-hidden
    />
  );
}

export function createNavbarIconSlot(
  code: string | undefined,
  fallback = DEFAULT_NAVBAR_FLATICON,
  reactIconMap?: Record<string, IconType>
) {
  return function NavbarIconSlot({ className }: { className?: string }) {
    return (
      <NavbarIcon
        code={code}
        className={className}
        fallback={fallback}
        reactIconMap={reactIconMap}
      />
    );
  };
}
