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

const GTM_ID = "GTM-P938DWL3";
const CLARITY_ID = "ok17wd71hr";

/** After GTM loads, stagger Clarity so parse/eval stays off one long task. */
const CLARITY_DELAY_MS = 6500;

/** Minimum quiet period after `load` before we schedule idle work. */
const POST_LOAD_QUIET_MS = 4000;

const DEFAULT_IDLE_TIMEOUT_MS = 12000;
const ENGAGEMENT_IDLE_TIMEOUT_MS = 3000;
const ABSOLUTE_FALLBACK_MS = 30000;

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
  s.async = true;
  s.src = `https://www.googletagmanager.com/gtm.js?id=${GTM_ID}`;
  document.head.appendChild(s);
}

function injectClarity() {
  if (window.__clarityInjected) return;
  window.__clarityInjected = true;
  const s = document.createElement("script");
  s.defer = true;
  s.text = `(function(c,l,a,r,i,t,y){c[a]=c[a]||function(){(c[a].q=c[a].q||[]).push(arguments)};t=l.createElement(r);t.defer=true;t.src="https://www.clarity.ms/tag/"+i;y=l.getElementsByTagName(r)[0];y.parentNode.insertBefore(t,y)})(window,document,"clarity","script","${CLARITY_ID}");`;
  document.head.appendChild(s);
}

/**
 * Guide §7.4 — Consent Mode default denied, always load GTM, then apply grant/deny.
 * Clarity only when analytics consent is granted.
 */
export default function DeferredGoogleTagManager() {
  useEffect(() => {
    if (typeof window === "undefined") return;

    let cancelled = false;
    let gtmFired = false;
    let booted = false;
    let idleHandle: number | undefined;
    let idleFallbackHandle: number | undefined;
    let postLoadQuietHandle: number | undefined;
    let fallbackHandle: number | undefined;
    let clarityHandle: number | undefined;
    let engagementConsumed = false;

    const captureOpts = { capture: true, passive: true } as const;
    const keyOpts = { capture: true } as const;

    const syncConsentMode = () => {
      try {
        const prefs = getConsentPreferences();
        applyGoogleConsentMode(prefs.analytics, prefs.marketing);
      } catch {
        /* non-fatal */
      }
    };

    const injectTags = () => {
      if (cancelled || gtmFired) return;
      gtmFired = true;
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

    const cancelScheduledIdle = () => {
      if (idleHandle != null && typeof window.cancelIdleCallback === "function") {
        window.cancelIdleCallback(idleHandle);
        idleHandle = undefined;
      }
      if (idleFallbackHandle != null) {
        window.clearTimeout(idleFallbackHandle);
        idleFallbackHandle = undefined;
      }
    };

    const cancelBootTimers = () => {
      cancelScheduledIdle();
      if (postLoadQuietHandle != null) {
        window.clearTimeout(postLoadQuietHandle);
        postLoadQuietHandle = undefined;
      }
      if (fallbackHandle != null) {
        window.clearTimeout(fallbackHandle);
        fallbackHandle = undefined;
      }
      window.removeEventListener("pointerdown", onEngagement, captureOpts);
      window.removeEventListener("keydown", onEngagement, keyOpts);
      engagementConsumed = false;
      booted = false;
    };

    const scheduleViaIdle = (timeout: number) => {
      if (cancelled || gtmFired) return;
      cancelScheduledIdle();
      if (typeof window.requestIdleCallback === "function") {
        idleHandle = window.requestIdleCallback(
          () => {
            idleHandle = undefined;
            if (!cancelled) injectTags();
          },
          { timeout }
        ) as unknown as number;
      } else {
        idleFallbackHandle = window.setTimeout(() => {
          idleFallbackHandle = undefined;
          if (!cancelled) injectTags();
        }, Math.max(timeout, 2000)) as unknown as number;
      }
    };

    const onEngagement = () => {
      if (cancelled || gtmFired || engagementConsumed) return;
      engagementConsumed = true;
      window.removeEventListener("pointerdown", onEngagement, captureOpts);
      window.removeEventListener("keydown", onEngagement, keyOpts);
      if (postLoadQuietHandle != null) {
        window.clearTimeout(postLoadQuietHandle);
        postLoadQuietHandle = undefined;
      }
      cancelScheduledIdle();
      scheduleViaIdle(ENGAGEMENT_IDLE_TIMEOUT_MS);
    };

    const boot = () => {
      if (cancelled || booted || gtmFired) return;
      if (window.__storeIdlePixels) return;
      booted = true;

      postLoadQuietHandle = window.setTimeout(() => {
        postLoadQuietHandle = undefined;
        if (!cancelled && !gtmFired) scheduleViaIdle(DEFAULT_IDLE_TIMEOUT_MS);
      }, POST_LOAD_QUIET_MS) as unknown as number;

      fallbackHandle = window.setTimeout(() => {
        if (!cancelled) injectTags();
      }, ABSOLUTE_FALLBACK_MS) as unknown as number;

      window.addEventListener("pointerdown", onEngagement, captureOpts);
      window.addEventListener("keydown", onEngagement, keyOpts);
    };

    const tryStart = () => {
      if (cancelled || gtmFired) return;
      if (document.readyState === "complete") {
        boot();
      } else {
        window.addEventListener("load", boot, { once: true });
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

    tryStart();
    window.addEventListener(COOKIE_CONSENT_UPDATED_EVENT, onConsentUpdated);
    window.addEventListener(COOKIE_CONSENT_UPDATED_EVENT_LEGACY, onConsentUpdated);

    return () => {
      cancelled = true;
      window.removeEventListener(COOKIE_CONSENT_UPDATED_EVENT, onConsentUpdated);
      window.removeEventListener(COOKIE_CONSENT_UPDATED_EVENT_LEGACY, onConsentUpdated);
      cancelBootTimers();
      if (clarityHandle != null) window.clearTimeout(clarityHandle);
    };
  }, []);

  return null;
}
