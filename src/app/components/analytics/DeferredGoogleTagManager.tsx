"use client";

import { useEffect } from "react";
import {
  COOKIE_CONSENT_UPDATED_EVENT,
  COOKIE_CONSENT_UPDATED_EVENT_LEGACY,
  getConsentPreferences,
  hasAnalyticsConsent,
} from "@/app/lib/cookieConsent";
import {
  applyGoogleConsentMode,
  setDefaultConsentMode,
} from "@/app/lib/consentMode";
import { syncFacebookPixelForConsent } from "@/app/lib/facebookPixel";

const GTM_ID = "GTM-P938DWL3";
const CLARITY_ID = "ok17wd71hr";

/** After GTM loads, stagger Clarity so parse/eval stays off one long task. */
const CLARITY_DELAY_MS = 6500;

declare global {
  interface Window {
    __storeIdlePixels?: boolean;
    __gtmInjected?: boolean;
    __clarityInjected?: boolean;
  }
}

function injectGtm() {
  if (window.__gtmInjected) return;
  window.__gtmInjected = true;
  const w = window as Window & { dataLayer?: Record<string, unknown>[] };
  w.dataLayer = w.dataLayer || [];
  w.dataLayer.push({ "gtm.start": Date.now(), event: "gtm.js" });
  const s = document.createElement("script");
  s.id = "gtm-script";
  s.async = true;
  s.src = `https://www.googletagmanager.com/gtm.js?id=${GTM_ID}`;
  document.head.appendChild(s);
}

function injectClarity() {
  if (window.__clarityInjected) return;
  window.__clarityInjected = true;
  const s = document.createElement("script");
  s.id = "clarity-script";
  s.defer = true;
  s.text = `(function(c,l,a,r,i,t,y){c[a]=c[a]||function(){(c[a].q=c[a].q||[]).push(arguments)};t=l.createElement(r);t.defer=true;t.src="https://www.clarity.ms/tag/"+i;y=l.getElementsByTagName(r)[0];y.parentNode.insertBefore(t,y)})(window,document,"clarity","script","${CLARITY_ID}");`;
  document.head.appendChild(s);
}

/**
 * Consent Mode default (already in <head>) → always load GTM → apply grant/deny.
 * Clarity only when analytics consent is granted.
 */
export default function DeferredGoogleTagManager() {
  useEffect(() => {
    if (typeof window === "undefined") return;

    let cancelled = false;
    let clarityHandle: number | undefined;

    const syncConsentMode = () => {
      try {
        const prefs = getConsentPreferences();
        applyGoogleConsentMode(prefs.analytics, prefs.marketing);
        syncFacebookPixelForConsent(prefs.marketing);
      } catch {
        /* non-fatal */
      }
    };

    const injectTags = () => {
      if (cancelled) return;
      window.__storeIdlePixels = true;
      try {
        injectGtm();
        syncConsentMode();
        clarityHandle = window.setTimeout(() => {
          if (!cancelled && hasAnalyticsConsent()) injectClarity();
        }, CLARITY_DELAY_MS) as unknown as number;
      } catch {
        /* non-fatal */
      }
    };

    const onConsentUpdated = () => {
      syncConsentMode();
      if (hasAnalyticsConsent() && window.__gtmInjected && !window.__clarityInjected) {
        injectClarity();
      }
    };

    try {
      setDefaultConsentMode();
      syncConsentMode();
    } catch {
      /* non-fatal */
    }

    injectTags();
    window.addEventListener(COOKIE_CONSENT_UPDATED_EVENT, onConsentUpdated);
    window.addEventListener(COOKIE_CONSENT_UPDATED_EVENT_LEGACY, onConsentUpdated);

    return () => {
      cancelled = true;
      window.removeEventListener(COOKIE_CONSENT_UPDATED_EVENT, onConsentUpdated);
      window.removeEventListener(COOKIE_CONSENT_UPDATED_EVENT_LEGACY, onConsentUpdated);
      if (clarityHandle != null) window.clearTimeout(clarityHandle);
    };
  }, []);

  return null;
}
