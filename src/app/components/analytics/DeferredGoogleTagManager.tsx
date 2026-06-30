"use client";

import { useEffect } from "react";
import {
  COOKIE_CONSENT_UPDATED_EVENT,
  hasAnalyticsConsent,
} from "@/app/lib/cookieConsent";

const GTM_ID = "GTM-P938DWL3";
const CLARITY_ID = "ok17wd71hr";

/** After GTM loads, stagger Clarity so parse/eval stays off one long task. */
const CLARITY_DELAY_MS = 6500;

/** Minimum quiet period after `load` before we schedule idle work (lets React/embla hydrate). */
const POST_LOAD_QUIET_MS = 7000;

/** `requestIdleCallback` timeout when no explicit user gesture fired (must be < ABSOLUTE_FALLBACK_MS). */
const DEFAULT_IDLE_TIMEOUT_MS = 22000;

/** User-gesture path: still idle-backed to avoid colliding with hydration, but sooner cap. */
const ENGAGEMENT_IDLE_TIMEOUT_MS = 4000;

/** Absolute fallback if neither idle nor engagement fires (crawlers, tab in background). */
const ABSOLUTE_FALLBACK_MS = 55000;

declare global {
  interface Window {
    __storeIdlePixels?: boolean;
  }
}

function injectGtm() {
  const w = window as Window & { dataLayer?: Record<string, unknown>[] };
  w.dataLayer = w.dataLayer || [];
  w.dataLayer.push({ "gtm.start": Date.now(), event: "gtm.js" });
  const s = document.createElement("script");
  s.async = true;
  s.src = `https://www.googletagmanager.com/gtm.js?id=${GTM_ID}`;
  document.head.appendChild(s);
}

function injectClarity() {
  const s = document.createElement("script");
  s.defer = true;
  s.text = `(function(c,l,a,r,i,t,y){c[a]=c[a]||function(){(c[a].q=c[a].q||[]).push(arguments)};t=l.createElement(r);t.defer=true;t.src="https://www.clarity.ms/tag/"+i;y=l.getElementsByTagName(r)[0];y.parentNode.insertBefore(t,y)})(window,document,"clarity","script","${CLARITY_ID}");`;
  document.head.appendChild(s);
}

/**
 * Loads GTM and Clarity off the critical path when performance/analytics
 * consent is granted. Ahrefs is loaded via GTM only (avoid duplicate inject).
 */
export default function DeferredGoogleTagManager() {
  useEffect(() => {
    if (typeof window === "undefined") return;

    let cancelled = false;
    let fired = false;
    let booted = false;
    let idleHandle: number | undefined;
    let idleFallbackHandle: number | undefined;
    let postLoadQuietHandle: number | undefined;
    let fallbackHandle: number | undefined;
    let clarityHandle: number | undefined;
    let engagementConsumed = false;
    let waitingForVisible = false;
    let onVisibleHandler: (() => void) | undefined;

    const captureOpts = { capture: true, passive: true } as const;
    const keyOpts = { capture: true } as const;

    const injectAllTags = () => {
      if (cancelled || fired || !hasAnalyticsConsent()) return;
      fired = true;
      window.__storeIdlePixels = true;
      try {
        injectGtm();
        clarityHandle = window.setTimeout(() => {
          if (!cancelled && hasAnalyticsConsent()) injectClarity();
        }, CLARITY_DELAY_MS) as unknown as number;
      } catch {
        /* non-fatal */
      }
    };

    const runPixels = () => {
      if (cancelled || fired || !hasAnalyticsConsent()) return;
      if (typeof document !== "undefined" && document.visibilityState !== "visible") {
        if (waitingForVisible) return;
        waitingForVisible = true;
        const onVis = () => {
          if (document.visibilityState !== "visible") return;
          document.removeEventListener("visibilitychange", onVis);
          waitingForVisible = false;
          onVisibleHandler = undefined;
          if (!cancelled) injectAllTags();
        };
        onVisibleHandler = onVis;
        document.addEventListener("visibilitychange", onVis);
        return;
      }
      injectAllTags();
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
      if (cancelled || fired || !hasAnalyticsConsent()) return;
      cancelScheduledIdle();
      if (typeof window.requestIdleCallback === "function") {
        idleHandle = window.requestIdleCallback(
          () => {
            idleHandle = undefined;
            if (!cancelled) runPixels();
          },
          { timeout }
        ) as unknown as number;
      } else {
        idleFallbackHandle = window.setTimeout(() => {
          idleFallbackHandle = undefined;
          if (!cancelled) runPixels();
        }, Math.max(timeout, 3200)) as unknown as number;
      }
    };

    const onEngagement = () => {
      if (cancelled || fired || engagementConsumed || !hasAnalyticsConsent()) return;
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
      if (cancelled || booted || fired || !hasAnalyticsConsent()) return;
      if (window.__storeIdlePixels) return;
      booted = true;

      postLoadQuietHandle = window.setTimeout(() => {
        postLoadQuietHandle = undefined;
        if (!cancelled && !fired) scheduleViaIdle(DEFAULT_IDLE_TIMEOUT_MS);
      }, POST_LOAD_QUIET_MS) as unknown as number;

      fallbackHandle = window.setTimeout(() => {
        if (!cancelled) runPixels();
      }, ABSOLUTE_FALLBACK_MS) as unknown as number;

      window.addEventListener("pointerdown", onEngagement, captureOpts);
      window.addEventListener("keydown", onEngagement, keyOpts);
    };

    const tryStart = () => {
      if (cancelled || fired) return;
      if (!hasAnalyticsConsent()) {
        cancelBootTimers();
        return;
      }
      if (document.readyState === "complete") {
        boot();
      } else {
        window.addEventListener("load", boot, { once: true });
      }
    };

    const onConsentUpdated = () => {
      if (!hasAnalyticsConsent()) {
        cancelBootTimers();
        return;
      }
      tryStart();
    };

    tryStart();
    window.addEventListener(COOKIE_CONSENT_UPDATED_EVENT, onConsentUpdated);

    return () => {
      cancelled = true;
      window.removeEventListener(COOKIE_CONSENT_UPDATED_EVENT, onConsentUpdated);
      cancelBootTimers();
      if (clarityHandle != null) window.clearTimeout(clarityHandle);
      if (onVisibleHandler != null) {
        document.removeEventListener("visibilitychange", onVisibleHandler);
        onVisibleHandler = undefined;
        waitingForVisible = false;
      }
    };
  }, []);

  return null;
}
