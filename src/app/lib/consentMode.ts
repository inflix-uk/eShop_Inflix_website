/**
 * Guide §7.4 — Google Consent Mode v2 helpers.
 * Default denied; GTM may load cookieless; apply grant/deny after user choice.
 */

type GtagFn = (...args: unknown[]) => void;

declare global {
  interface Window {
    dataLayer?: Record<string, unknown>[];
    gtag?: GtagFn;
  }
}

function ensureGtag(): GtagFn {
  window.dataLayer = window.dataLayer || [];
  if (typeof window.gtag !== 'function') {
    window.gtag = function gtag(...args: unknown[]) {
      // Consent Mode API pushes command tuples; cast for dataLayer typing.
      window.dataLayer!.push(args as unknown as Record<string, unknown>);
    };
  }
  return window.gtag;
}

/** Call once before GTM inject — deny-by-default Consent Mode v2. */
export function setDefaultConsentMode(): void {
  if (typeof window === 'undefined') return;
  const gtag = ensureGtag();
  gtag('consent', 'default', {
    analytics_storage: 'denied',
    ad_storage: 'denied',
    ad_user_data: 'denied',
    ad_personalization: 'denied',
    functionality_storage: 'granted',
    security_storage: 'granted',
    wait_for_update: 500,
  });
  gtag('set', 'ads_data_redaction', true);
  gtag('set', 'url_passthrough', true);
}

/** Update Consent Mode after user choice / on load when prefs already set. */
export function applyGoogleConsentMode(analytics: boolean, marketing: boolean): void {
  if (typeof window === 'undefined') return;
  const gtag = ensureGtag();
  gtag('consent', 'update', {
    analytics_storage: analytics ? 'granted' : 'denied',
    ad_storage: marketing ? 'granted' : 'denied',
    ad_user_data: marketing ? 'granted' : 'denied',
    ad_personalization: marketing ? 'granted' : 'denied',
  });
}
