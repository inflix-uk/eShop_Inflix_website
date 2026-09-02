/**
 * Consent storage (Zextons spec).
 * Cookies: cookieConsent, analytics, marketing (365d, SameSite=Lax, Secure on HTTPS).
 * Legacy: performance → analytics, targeting → marketing (cleaned on save).
 */
import Cookies from 'js-cookie';

export interface MarketingConsentState {
  analytics: boolean;
  marketing: boolean;
  capturedAt: string;
}

export type ConsentStatus =
  | 'accepted'
  | 'rejected'
  | 'preferences'
  | 'customized'
  | '';

export interface ConsentPreferences {
  necessary: true;
  analytics: boolean;
  marketing: boolean;
  status: ConsentStatus;
  hasChoice: boolean;
}

export const COOKIE_CONSENT_UPDATED_EVENT = 'inflix-consent-updated';
export const OPEN_CONSENT_SETTINGS_EVENT = 'inflix-open-consent-settings';

/** Alias used by older listeners — keep in sync with COOKIE_CONSENT_UPDATED_EVENT. */
export const COOKIE_CONSENT_UPDATED_EVENT_LEGACY = 'cookie-consent-updated';

const COOKIE_OPTS: Cookies.CookieAttributes = {
  expires: 365,
  sameSite: 'Lax',
  path: '/',
  ...(typeof window !== 'undefined' && window.location?.protocol === 'https:'
    ? { secure: true }
    : {}),
};

function isGranted(value: string | undefined): boolean {
  return value === 'true';
}

export function dispatchCookieConsentUpdated(): void {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new CustomEvent(COOKIE_CONSENT_UPDATED_EVENT));
  window.dispatchEvent(new CustomEvent(COOKIE_CONSENT_UPDATED_EVENT_LEGACY));
}

export function openConsentSettings(): void {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new CustomEvent(OPEN_CONSENT_SETTINGS_EVENT));
}

/**
 * Save-preferences status only (not Accept all / Reject all).
 * Both optional categories off → preferences; any on → customized.
 */
export function resolveGranularConsentStatus(
  analytics: boolean,
  marketing: boolean
): ConsentStatus {
  if (!analytics && !marketing) return 'preferences';
  return 'customized';
}

type CookieReader = (name: string) => string | undefined;

/**
 * Pure read algorithm — unit-tested without js-cookie.
 * Denied by default until the user chooses.
 */
export function readConsentPreferencesFromStore(
  getCookie: CookieReader
): ConsentPreferences {
  const statusRaw = (getCookie('cookieConsent') || '') as ConsentStatus;
  const hasStatus = Boolean(statusRaw);

  if (!hasStatus) {
    return {
      necessary: true,
      analytics: false,
      marketing: false,
      status: '',
      hasChoice: false,
    };
  }

  const analyticsCookie = getCookie('analytics');
  const marketingCookie = getCookie('marketing');
  const analyticsMissing = analyticsCookie == null || analyticsCookie === '';
  const marketingMissing = marketingCookie == null || marketingCookie === '';

  // Legacy Accept: status=accepted and both category cookies missing.
  if (statusRaw === 'accepted' && analyticsMissing && marketingMissing) {
    return {
      necessary: true,
      analytics: true,
      marketing: true,
      status: 'accepted',
      hasChoice: true,
    };
  }

  if (statusRaw === 'rejected') {
    return {
      necessary: true,
      analytics: false,
      marketing: false,
      status: 'rejected',
      hasChoice: true,
    };
  }

  let analytics = isGranted(analyticsCookie);
  let marketing = isGranted(marketingCookie);

  if (analyticsMissing && getCookie('performance') != null) {
    analytics = isGranted(getCookie('performance'));
  }
  if (marketingMissing && getCookie('targeting') != null) {
    marketing = isGranted(getCookie('targeting'));
  }

  return {
    necessary: true,
    analytics,
    marketing,
    status: statusRaw,
    hasChoice: true,
  };
}

/**
 * Read current preferences. Migrates legacy performance/targeting if new cookies absent.
 */
export function getConsentPreferences(): ConsentPreferences {
  return readConsentPreferencesFromStore((name) => Cookies.get(name));
}

export function saveConsentPreferences(input: {
  analytics: boolean;
  marketing: boolean;
  status?: ConsentStatus;
}): ConsentPreferences {
  const analytics = Boolean(input.analytics);
  const marketing = Boolean(input.marketing);
  const status =
    input.status || resolveGranularConsentStatus(analytics, marketing);

  Cookies.set('cookieConsent', status, COOKIE_OPTS);
  Cookies.set('analytics', String(analytics), COOKIE_OPTS);
  Cookies.set('marketing', String(marketing), COOKIE_OPTS);

  Cookies.remove('performance', { path: '/' });
  Cookies.remove('targeting', { path: '/' });

  const prefs = getConsentPreferences();
  dispatchCookieConsentUpdated();
  return prefs;
}

export function acceptAllConsent(): ConsentPreferences {
  return saveConsentPreferences({
    analytics: true,
    marketing: true,
    status: 'accepted',
  });
}

export function rejectAllConsent(): ConsentPreferences {
  return saveConsentPreferences({
    analytics: false,
    marketing: false,
    status: 'rejected',
  });
}

/** Explicit opt-in snapshot for order.marketingAttribution.consent */
export function readMarketingConsent(): MarketingConsentState {
  const prefs = getConsentPreferences();
  return {
    analytics: prefs.analytics,
    marketing: prefs.marketing,
    capturedAt: new Date().toISOString(),
  };
}

export function getConversionConsent(): { analytics: boolean; marketing: boolean } {
  const prefs = getConsentPreferences();
  return { analytics: prefs.analytics, marketing: prefs.marketing };
}

export function hasAnalyticsConsent(): boolean {
  return getConsentPreferences().analytics;
}

export function hasMarketingConsent(): boolean {
  return getConsentPreferences().marketing;
}
