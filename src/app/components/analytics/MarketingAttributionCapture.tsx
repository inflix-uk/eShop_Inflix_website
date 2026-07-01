"use client";

import { useEffect } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { COOKIE_CONSENT_UPDATED_EVENT } from "@/app/lib/cookieConsent";
import { captureMarketingAttribution } from "@/app/lib/marketingAttribution";
import { trackPageView } from "@/app/lib/analyticsEvents";

/** Runs on each navigation and after cookie consent changes. */
export default function MarketingAttributionCapture() {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  useEffect(() => {
    captureMarketingAttribution();
    trackPageView();
  }, [pathname, searchParams]);

  useEffect(() => {
    const onConsentUpdated = () => {
      queueMicrotask(() => {
        captureMarketingAttribution();
        trackPageView();
      });
    };
    window.addEventListener(COOKIE_CONSENT_UPDATED_EVENT, onConsentUpdated);
    return () => {
      window.removeEventListener(COOKIE_CONSENT_UPDATED_EVENT, onConsentUpdated);
    };
  }, []);

  return null;
}
