"use client";

import { useEffect } from "react";
import { resolveSiteTheme } from "@/app/lib/siteThemeUtils";
import {
  applyTagColorsStyleDocument,
  resolveTagColorsFromApi,
} from "@/app/lib/tagColorsThemeUtils";

/**
 * Re-applies theme after client navigation / when API may have updated.
 * First paint is handled by `SiteThemeInlineStyles` + `TagColorsThemeStyles` in root layout.
 */
export default function SiteBrandColors() {
  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const res = await fetch("/api/site-theme");
        const json = await res.json().catch(() => null);
        if (cancelled || !json?.success || !json?.data) return;

        const t = resolveSiteTheme(
          String(json.data.primaryColor ?? ""),
          String(json.data.secondaryColor ?? ""),
          String(json.data.bodyBgColor ?? ""),
          String(json.data.uiCustom?.booking?.serviceCardBgColor ?? "")
        );

        const root = document.documentElement;
        root.style.setProperty("--primary", t.primaryColor);
        root.style.setProperty("--secondary", t.secondaryColor);
        root.style.setProperty("--primary-rgb", t.primaryRgb);
        root.style.setProperty("--secondary-rgb", t.secondaryRgb);
        root.style.setProperty("--body-bg-color", t.bodyBgColor);
        root.style.setProperty("--booking-service-card-bg", t.bookingServiceCardBgColor);
        document.body.style.backgroundColor = t.bodyBgColor;

        applyTagColorsStyleDocument(document, resolveTagColorsFromApi(json.data));
      } catch {
        /* defaults from globals.css + layout inline theme */
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  return null;
}
