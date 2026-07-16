"use client";

import { useEffect } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import {
  COOKIE_CONSENT_UPDATED_EVENT,
  COOKIE_CONSENT_UPDATED_EVENT_LEGACY,
} from "@/app/lib/cookieConsent";
import {
  bootstrapAttribution,
  captureMarketingAttribution,
  clearPersistedVisitorIdIfDenied,
  trackCampaignClick,
} from "@/app/lib/marketingAttribution";
import { trackPageView } from "@/app/lib/analyticsEvents";

/** Guide §6.2 — always bootstrap + campaign click; session/pageview if analytics. */
export default function MarketingAttributionCapture() {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  useEffect(() => {
    trackCampaignClick();
    bootstrapAttribution();
    captureMarketingAttribution();
    trackPageView();
  }, [pathname, searchParams]);

  useEffect(() => {
    const onConsentUpdated = () => {
      queueMicrotask(() => {
        clearPersistedVisitorIdIfDenied();
        trackCampaignClick();
        bootstrapAttribution();
        captureMarketingAttribution();
        trackPageView();
      });
    };
    window.addEventListener(COOKIE_CONSENT_UPDATED_EVENT, onConsentUpdated);
    window.addEventListener(COOKIE_CONSENT_UPDATED_EVENT_LEGACY, onConsentUpdated);
    return () => {
      window.removeEventListener(COOKIE_CONSENT_UPDATED_EVENT, onConsentUpdated);
      window.removeEventListener(COOKIE_CONSENT_UPDATED_EVENT_LEGACY, onConsentUpdated);
    };
  }, []);

  return null;
}
