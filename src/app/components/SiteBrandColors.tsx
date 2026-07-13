"use client";

import { useEffect } from "react";
import { resolveSiteTheme, applyBookingCardThemeToRoot } from "@/app/lib/siteThemeUtils";
import {
  applyTagColorsStyleDocument,
  removeTagColorsStyleDocument,
  resolveTagColorsFromApi,
  resolveTagColorsEnabled,
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
        applyBookingCardThemeToRoot(root, t.bookingServiceCardBgColor);
        document.body.style.backgroundColor = t.bodyBgColor;

        if (resolveTagColorsEnabled(json.data)) {
          applyTagColorsStyleDocument(document, resolveTagColorsFromApi(json.data));
        } else {
          removeTagColorsStyleDocument(document);
        }
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
