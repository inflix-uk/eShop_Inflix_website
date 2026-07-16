/**
 * Guide §7.2 — consent storage (Zextons-style).
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

function resolveGranularConsentStatus(analytics: boolean, marketing: boolean): ConsentStatus {
  if (analytics && marketing) return 'accepted';
  if (!analytics && !marketing) return 'rejected';
  return 'customized';
}

/**
 * Read current preferences. Migrates legacy performance/targeting if new cookies absent.
 */
export function getConsentPreferences(): ConsentPreferences {
  const statusRaw = (Cookies.get('cookieConsent') || '') as ConsentStatus;
  const hasStatus = Boolean(statusRaw);

  let analytics = isGranted(Cookies.get('analytics'));
  let marketing = isGranted(Cookies.get('marketing'));

  // Legacy fallback when new cookies not yet written
  if (Cookies.get('analytics') == null && Cookies.get('performance') != null) {
    analytics = isGranted(Cookies.get('performance'));
  }
  if (Cookies.get('marketing') == null && Cookies.get('targeting') != null) {
    marketing = isGranted(Cookies.get('targeting'));
  }

  if (statusRaw === 'accepted') {
    analytics = true;
    marketing = true;
  } else if (statusRaw === 'rejected') {
    analytics = false;
    marketing = false;
  }

  return {
    necessary: true,
    analytics,
    marketing,
    status: statusRaw,
    hasChoice: hasStatus,
  };
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

  // Clean legacy aliases
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
