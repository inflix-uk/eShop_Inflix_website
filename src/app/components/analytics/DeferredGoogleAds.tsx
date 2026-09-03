"use client";

import { useEffect } from "react";
import {
  COOKIE_CONSENT_UPDATED_EVENT,
  COOKIE_CONSENT_UPDATED_EVENT_LEGACY,
  hasMarketingConsent,
} from "@/app/lib/cookieConsent";
import { ensureGtag } from "@/app/lib/consentMode";

declare global {
  interface Window {
    __googleAdsInjected?: boolean;
    __googleAdsConfigId?: string;
  }
}

function normalizeAdsId(raw: string | undefined | null): string {
  const value = String(raw || "").trim().toUpperCase();
  if (!value) return "";
  if (/^AW-\d+$/.test(value)) return value;
  if (/^\d+$/.test(value)) return `AW-${value}`;
  return "";
}

function injectGoogleAds(adsId: string) {
  if (typeof window === "undefined" || !adsId) return;
  if (window.__googleAdsInjected && window.__googleAdsConfigId === adsId) return;

  window.__googleAdsInjected = true;
  window.__googleAdsConfigId = adsId;

  ensureGtag();
  window.gtag?.("js", new Date());
  window.gtag?.("config", adsId);

  if (!document.querySelector(`script[data-inflix-google-ads="${adsId}"]`)) {
    const s = document.createElement("script");
    s.async = true;
    s.src = `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(adsId)}`;
    s.dataset.inflixGoogleAds = adsId;
    document.head.appendChild(s);
  }
}

/**
 * Separate Google Ads (AW-…) loader — independent of the GTM container.
 * Injects only when marketing consent is granted.
 */
export default function DeferredGoogleAds({
  conversionId,
}: {
  conversionId?: string | null;
}) {
  const adsId = normalizeAdsId(conversionId);

  useEffect(() => {
    if (!adsId) return;

    const tryInject = () => {
      if (hasMarketingConsent()) injectGoogleAds(adsId);
    };

    tryInject();
    window.addEventListener(COOKIE_CONSENT_UPDATED_EVENT, tryInject);
    window.addEventListener(COOKIE_CONSENT_UPDATED_EVENT_LEGACY, tryInject);
    return () => {
      window.removeEventListener(COOKIE_CONSENT_UPDATED_EVENT, tryInject);
      window.removeEventListener(COOKIE_CONSENT_UPDATED_EVENT_LEGACY, tryInject);
    };
  }, [adsId]);

  return null;
}
