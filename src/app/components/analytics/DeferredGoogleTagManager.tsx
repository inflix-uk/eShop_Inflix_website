"use client";

import { useEffect } from "react";

const GTM_ID = "GTM-P938DWL3";
const AHREFS_KEY = "uvqeroCgZqjugCBgl++DGQ";
const CLARITY_ID = "ok17wd71hr";

/** After GTM loads, stagger other pixels so parse/eval stays off one long task. */
const AHREFS_DELAY_MS = 3500;
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

function injectAhrefs() {
  const s = document.createElement("script");
  s.async = true;
  s.src = "https://analytics.ahrefs.com/analytics.js";
  s.dataset.key = AHREFS_KEY;
  document.head.appendChild(s);
}

function injectClarity() {
  const s = document.createElement("script");
  s.defer = true;
  s.text = `(function(c,l,a,r,i,t,y){c[a]=c[a]||function(){(c[a].q=c[a].q||[]).push(arguments)};t=l.createElement(r);t.defer=true;t.src="https://www.clarity.ms/tag/"+i;y=l.getElementsByTagName(r)[0];y.parentNode.insertBefore(t,y)})(window,document,"clarity","script","${CLARITY_ID}");`;
  document.head.appendChild(s);
}

/**
 * Loads GTM, Ahrefs, and Clarity off the critical path:
 * - waits for `load` + a short quiet window, then `requestIdleCallback` (long timeout),
 * - optional early path on first pointer / key (still via idle; scroll is omitted so
 *   passive reading and Lighthouse scroll do not pull GTM onto the critical path),
 * - staggers Ahrefs/Clarity after GTM to split main-thread parse cost,
 * - defers injection until `document.visibilityState === "visible"` when possible.
 * Improves Lighthouse JS execution / TBT vs firing all tags in one idle slice.
 */
export default function DeferredGoogleTagManager() {
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (window.__storeIdlePixels) return;
    window.__storeIdlePixels = true;

    let cancelled = false;
    let fired = false;
    let idleHandle: number | undefined;
    let idleFallbackHandle: number | undefined;
    let postLoadQuietHandle: number | undefined;
    let fallbackHandle: number | undefined;
    let ahrefsHandle: number | undefined;
    let clarityHandle: number | undefined;
    let engagementConsumed = false;
    let waitingForVisible = false;
    let onVisibleHandler: (() => void) | undefined;

    const captureOpts = { capture: true, passive: true } as const;
    const keyOpts = { capture: true } as const;

    const injectAllTags = () => {
      if (cancelled || fired) return;
      fired = true;
      try {
        injectGtm();
        ahrefsHandle = window.setTimeout(() => {
          if (!cancelled) injectAhrefs();
        }, AHREFS_DELAY_MS) as unknown as number;
        clarityHandle = window.setTimeout(() => {
          if (!cancelled) injectClarity();
        }, CLARITY_DELAY_MS) as unknown as number;
      } catch {
        /* non-fatal */
      }
    };

    const runPixels = () => {
      if (cancelled || fired) return;
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

    const scheduleViaIdle = (timeout: number) => {
      if (cancelled || fired) return;
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
      if (cancelled || fired || engagementConsumed) return;
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
      if (cancelled) return;
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

    if (document.readyState === "complete") {
      boot();
    } else {
      window.addEventListener("load", boot, { once: true });
    }

    return () => {
      cancelled = true;
      cancelScheduledIdle();
      if (postLoadQuietHandle != null) window.clearTimeout(postLoadQuietHandle);
      if (fallbackHandle != null) window.clearTimeout(fallbackHandle);
      if (ahrefsHandle != null) window.clearTimeout(ahrefsHandle);
      if (clarityHandle != null) window.clearTimeout(clarityHandle);
      if (onVisibleHandler != null) {
        document.removeEventListener("visibilitychange", onVisibleHandler);
        onVisibleHandler = undefined;
        waitingForVisible = false;
      }
      window.removeEventListener("pointerdown", onEngagement, captureOpts);
      window.removeEventListener("keydown", onEngagement, keyOpts);
    };
  }, []);

  return null;
}
