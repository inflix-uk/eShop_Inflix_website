/**
 * Shared cookie consent reads (ConsentCookie.tsx via js-cookie).
 * - `performance` = analytics
 * - `targeting` = marketing
 * - `cookieConsent: accepted` → both granted; `rejected` → both denied
 */
import Cookies from 'js-cookie';

export interface MarketingConsentState {
  analytics: boolean;
  marketing: boolean;
  capturedAt: string;
}

export const COOKIE_CONSENT_UPDATED_EVENT = 'cookie-consent-updated';

/** Notify analytics/tag loaders that consent cookies changed. */
export function dispatchCookieConsentUpdated(): void {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new CustomEvent(COOKIE_CONSENT_UPDATED_EVENT));
}

/** Explicit opt-in only. Unset banner/cookies → both false. */
export function readMarketingConsent(): MarketingConsentState {
  const capturedAt = new Date().toISOString();
  const cookieConsent = Cookies.get('cookieConsent');
  const performanceGranted = Cookies.get('performance') === 'true';
  const targetingGranted = Cookies.get('targeting') === 'true';

  if (cookieConsent === 'accepted') {
    return { analytics: true, marketing: true, capturedAt };
  }
  if (cookieConsent === 'rejected') {
    return { analytics: false, marketing: false, capturedAt };
  }

  return {
    analytics: performanceGranted,
    marketing: targetingGranted,
    capturedAt,
  };
}

export function hasAnalyticsConsent(): boolean {
  return readMarketingConsent().analytics;
}

export function hasMarketingConsent(): boolean {
  return readMarketingConsent().marketing;
}
