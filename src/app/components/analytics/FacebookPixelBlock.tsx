"use client";

import { useEffect } from "react";
import {
  COOKIE_CONSENT_UPDATED_EVENT,
  COOKIE_CONSENT_UPDATED_EVENT_LEGACY,
  getConsentPreferences,
} from "@/app/lib/cookieConsent";
import { syncFacebookPixelForConsent } from "@/app/lib/facebookPixel";

/**
 * GTM may call fbq(). Until marketing consent, a discard-only stub is installed
 * in <head>. After marketing is granted, replace the stub (do not flush) so the
 * official pixel can load. Revoke reinstalls the stub.
 */
export default function FacebookPixelBlock() {
  useEffect(() => {
    const sync = () => {
      try {
        syncFacebookPixelForConsent(getConsentPreferences().marketing);
      } catch {
        /* non-fatal */
      }
    };

    sync();
    window.addEventListener(COOKIE_CONSENT_UPDATED_EVENT, sync);
    window.addEventListener(COOKIE_CONSENT_UPDATED_EVENT_LEGACY, sync);
    return () => {
      window.removeEventListener(COOKIE_CONSENT_UPDATED_EVENT, sync);
      window.removeEventListener(COOKIE_CONSENT_UPDATED_EVENT_LEGACY, sync);
    };
  }, []);

  return null;
}
