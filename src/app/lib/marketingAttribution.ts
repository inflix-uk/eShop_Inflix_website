/**
 * Guide §6.2–§6.6 — storefront attribution (Zextons matrix).
 *
 * Always (no consent): URL UTMs + URL click IDs; campaign click POST.
 * Marketing: _fbc / _fbp cookies.
 * Analytics: visitorId persist, session POST, gaClientId.
 * Order: keep URL click IDs without marketing; strip only fbc/fbp.
 */
import {
  getConsentPreferences,
  getConversionConsent,
  hasAnalyticsConsent,
  hasMarketingConsent,
  readMarketingConsent,
  type MarketingConsentState,
} from '@/app/lib/cookieConsent';

export type { MarketingConsentState };
export { readMarketingConsent, getConversionConsent };

const CAMPAIGN_CLICK_DEDUPE_PREFIX = 'campaign_click_sent_';

const STORAGE_KEY = 'inflix_attribution';
const STORAGE_KEY_LEGACY = 'marketingAttribution_v1';
const VISITOR_ID_KEY = 'inflix_visitor_id';
const VISITOR_ID_KEY_LEGACY = 'marketingVisitorId';
const VISITOR_EPHEMERAL_KEY = 'inflix_visitor_id_ephemeral';
const SESSION_STORAGE_KEY = 'inflix_session_v1';
const SESSION_STORAGE_KEY_LEGACY = 'marketingSession_v1';

const ATTRIBUTION_TTL_MS = 90 * 24 * 60 * 60 * 1000;

const MAX = {
  generic: 256,
  campaign: 200,
  referrer: 2048,
  landingPage: 2048,
  clickId: 256,
  id: 128,
} as const;

const UTM_KEYS = [
  'utm_source',
  'utm_medium',
  'utm_campaign',
  'utm_term',
  'utm_content',
  'utm_id',
] as const;

/** URL click IDs — always capture (guide §6.4 / §7.5). */
const URL_CLICK_ID_KEYS = [
  'gclid',
  'gbraid',
  'wbraid',
  'fbclid',
  'msclkid',
  'ttclid',
  'oppref',
] as const;

/** Cookie-based Meta IDs — marketing consent only. */
const COOKIE_CLICK_ID_KEYS = ['fbc', 'fbp'] as const;

type UrlClickIdKey = (typeof URL_CLICK_ID_KEYS)[number];
type CookieClickIdKey = (typeof COOKIE_CLICK_ID_KEYS)[number];
type ClickIdKey = UrlClickIdKey | CookieClickIdKey;

export interface MarketingTouch {
  source?: string;
  medium?: string;
  campaign?: string;
  content?: string;
  term?: string;
  referrer?: string;
  referrerDomain?: string;
  landingPage?: string;
  capturedAt?: string;
}

export interface MarketingAttributionPayload {
  firstTouch?: MarketingTouch;
  lastTouch?: MarketingTouch;
  orderTouch?: MarketingTouch;
  clickIds?: Partial<Record<ClickIdKey, string>>;
  sessionId?: string;
  visitorId?: string;
  gaClientId?: string | null;
  consent?: MarketingConsentState;
  firstVisitAt?: string;
  lastVisitAt?: string;
}

interface StoredAttribution {
  schemaVersion: 1;
  firstTouch?: MarketingTouch;
  lastTouch?: MarketingTouch;
  landingPage?: string;
  clickIds?: Partial<Record<ClickIdKey, string>>;
  gaClientId?: string;
  firstVisitAt?: string;
  lastVisitAt?: string;
  updatedAt: string;
}

interface StoredSession {
  sessionId: string;
  landingPage?: string;
  startedAt: string;
}

function isBrowser(): boolean {
  return typeof window !== 'undefined';
}

function devLog(...args: unknown[]) {
  if (process.env.NODE_ENV === 'development') {
    console.debug('[marketingAttribution]', ...args);
  }
}

function truncate(value: string | null | undefined, max: number): string | undefined {
  if (value == null) return undefined;
  const trimmed = String(value).trim();
  if (!trimmed) return undefined;
  return trimmed.length > max ? trimmed.slice(0, max) : trimmed;
}

function parseReferrerDomain(referrer: string | undefined): string | undefined {
  if (!referrer) return undefined;
  try {
    return new URL(referrer).hostname.toLowerCase();
  } catch {
    return undefined;
  }
}

function generateId(prefix: string): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return `${prefix}_${crypto.randomUUID()}`;
  }
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`;
}

function readCookie(name: string): string | undefined {
  if (!isBrowser()) return undefined;
  const match = document.cookie.match(new RegExp(`(?:^|; )${name}=([^;]*)`));
  return match ? decodeURIComponent(match[1]) : undefined;
}

function loadStored(): StoredAttribution | null {
  if (!isBrowser()) return null;
  try {
    const raw =
      sessionStorage.getItem(STORAGE_KEY) ||
      localStorage.getItem(STORAGE_KEY) ||
      localStorage.getItem(STORAGE_KEY_LEGACY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as StoredAttribution;
    if (parsed?.schemaVersion !== 1 || !parsed.updatedAt) return null;
    const age = Date.now() - new Date(parsed.updatedAt).getTime();
    if (Number.isNaN(age) || age > ATTRIBUTION_TTL_MS) {
      clearStoredAttribution();
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

function clearStoredAttribution(): void {
  try {
    sessionStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem(STORAGE_KEY_LEGACY);
  } catch {
    /* ignore */
  }
}

/** Dual-write sessionStorage + localStorage (guide §6.4). */
function saveStored(data: StoredAttribution): void {
  if (!isBrowser()) return;
  const json = JSON.stringify(data);
  try {
    sessionStorage.setItem(STORAGE_KEY, json);
  } catch {
    /* ignore */
  }
  try {
    localStorage.setItem(STORAGE_KEY, json);
  } catch {
    /* ignore */
  }
}

function loadOrCreateSession(): StoredSession {
  if (!isBrowser()) {
    return { sessionId: generateId('msess'), startedAt: new Date().toISOString() };
  }
  try {
    const raw =
      sessionStorage.getItem(SESSION_STORAGE_KEY) ||
      sessionStorage.getItem(SESSION_STORAGE_KEY_LEGACY);
    if (raw) {
      const parsed = JSON.parse(raw) as StoredSession;
      if (parsed?.sessionId) return parsed;
    }
  } catch {
    /* ignore */
  }
  const session: StoredSession = {
    sessionId: generateId('msess'),
    startedAt: new Date().toISOString(),
  };
  try {
    sessionStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(session));
  } catch {
    /* ignore */
  }
  return session;
}

/** Persist visitorId only with analytics consent; else ephemeral sessionStorage. */
function resolveVisitorId(analytics: boolean): string | undefined {
  if (!isBrowser()) return undefined;
  try {
    if (analytics) {
      let visitorId =
        localStorage.getItem(VISITOR_ID_KEY) ||
        localStorage.getItem(VISITOR_ID_KEY_LEGACY);
      if (!visitorId) {
        visitorId =
          sessionStorage.getItem(VISITOR_EPHEMERAL_KEY) || generateId('mvis');
        localStorage.setItem(VISITOR_ID_KEY, visitorId);
      }
      return truncate(visitorId, MAX.id);
    }

    let ephemeral = sessionStorage.getItem(VISITOR_EPHEMERAL_KEY);
    if (!ephemeral) {
      ephemeral = generateId('mvis');
      sessionStorage.setItem(VISITOR_EPHEMERAL_KEY, ephemeral);
    }
    return truncate(ephemeral, MAX.id);
  } catch {
    return undefined;
  }
}

/** Guide: both denied → clear persisted visitor id (keep attribution click IDs). */
export function clearPersistedVisitorIdIfDenied(): void {
  if (!isBrowser()) return;
  const prefs = getConsentPreferences();
  if (prefs.analytics || prefs.marketing) return;
  try {
    localStorage.removeItem(VISITOR_ID_KEY);
    localStorage.removeItem(VISITOR_ID_KEY_LEGACY);
  } catch {
    /* ignore */
  }
}

function hasUtmParams(params: URLSearchParams): boolean {
  return UTM_KEYS.some((key) => Boolean(params.get(key)));
}

function hasCampaignParams(params: URLSearchParams): boolean {
  if (hasUtmParams(params)) return true;
  return URL_CLICK_ID_KEYS.some((key) => params.get(key));
}

function isExternalReferrer(referrer: string): boolean {
  if (!referrer) return false;
  try {
    const refHost = new URL(referrer).hostname.toLowerCase();
    const currentHost = window.location.hostname.toLowerCase();
    return refHost !== currentHost;
  } catch {
    return false;
  }
}

function hasTouchContent(touch: MarketingTouch | undefined): boolean {
  if (!touch) return false;
  return Boolean(
    touch.source ||
      touch.medium ||
      touch.campaign ||
      touch.content ||
      touch.term ||
      touch.referrer ||
      touch.referrerDomain ||
      touch.landingPage
  );
}

function buildTouch(
  params: URLSearchParams,
  referrer: string,
  landingPage: string
): MarketingTouch | undefined {
  const touch: MarketingTouch = {
    capturedAt: new Date().toISOString(),
    landingPage: truncate(landingPage, MAX.landingPage),
  };

  const source = truncate(params.get('utm_source'), MAX.generic);
  const medium = truncate(params.get('utm_medium'), MAX.generic);
  const campaign = truncate(params.get('utm_campaign'), MAX.campaign);
  const content = truncate(params.get('utm_content'), MAX.generic);
  const term = truncate(params.get('utm_term'), MAX.generic);

  if (source) touch.source = source;
  if (medium) touch.medium = medium;
  if (campaign) touch.campaign = campaign;
  if (content) touch.content = content;
  if (term) touch.term = term;

  const ref = truncate(referrer, MAX.referrer);
  if (ref) {
    touch.referrer = ref;
    const domain = parseReferrerDomain(ref);
    if (domain) touch.referrerDomain = truncate(domain, MAX.generic);
  }

  return hasTouchContent(touch) ? touch : undefined;
}

function buildUrlClickIds(
  params: URLSearchParams
): Partial<Record<UrlClickIdKey, string>> | undefined {
  const clickIds: Partial<Record<UrlClickIdKey, string>> = {};
  for (const key of URL_CLICK_ID_KEYS) {
    const value = truncate(params.get(key), MAX.clickId);
    if (value) clickIds[key] = value;
  }
  return Object.keys(clickIds).length > 0 ? clickIds : undefined;
}

function buildCookieClickIds(
  allowMarketing: boolean
): Partial<Record<CookieClickIdKey, string>> | undefined {
  if (!allowMarketing) return undefined;
  const clickIds: Partial<Record<CookieClickIdKey, string>> = {};
  const fbc = truncate(readCookie('_fbc'), MAX.clickId);
  const fbp = truncate(readCookie('_fbp'), MAX.clickId);
  if (fbc) clickIds.fbc = fbc;
  if (fbp) clickIds.fbp = fbp;
  return Object.keys(clickIds).length > 0 ? clickIds : undefined;
}

function mergeClickIds(
  ...sources: Array<Partial<Record<ClickIdKey, string>> | undefined>
): Partial<Record<ClickIdKey, string>> | undefined {
  const merged: Partial<Record<ClickIdKey, string>> = {};
  for (const source of sources) {
    if (!source) continue;
    for (const [key, value] of Object.entries(source)) {
      if (value) merged[key as ClickIdKey] = value;
    }
  }
  return Object.keys(merged).length > 0 ? merged : undefined;
}

function readGaClientId(allowAnalytics: boolean): string | undefined {
  if (!allowAnalytics) return undefined;
  const ga = readCookie('_ga');
  if (!ga) return undefined;
  // _ga=GA1.1.XXXXXXXXXX.YYYYYYYYYY → client id is last two segments
  const parts = ga.split('.');
  if (parts.length >= 4) {
    return truncate(`${parts[parts.length - 2]}.${parts[parts.length - 1]}`, MAX.id);
  }
  return truncate(ga, MAX.id);
}

function scheduleGaClientIdPoll(): void {
  if (!isBrowser() || !hasAnalyticsConsent()) return;
  const existing = loadStored();
  if (existing?.gaClientId) return;
  const delays = [500, 1500, 3000, 5000];
  for (const ms of delays) {
    window.setTimeout(() => {
      if (!hasAnalyticsConsent()) return;
      const gaClientId = readGaClientId(true);
      if (!gaClientId) return;
      const stored = loadStored();
      if (!stored) return;
      stored.gaClientId = gaClientId;
      stored.updatedAt = new Date().toISOString();
      saveStored(stored);
    }, ms);
  }
}

/** URL click IDs stay; fbc/fbp only with marketing. */
export function stripMarketingAttributionFields(
  clickIds: Partial<Record<ClickIdKey, string>> | undefined,
  marketing: boolean
): Partial<Record<ClickIdKey, string>> | undefined {
  if (!clickIds) return undefined;
  const next = { ...clickIds };
  if (!marketing) {
    delete next.fbc;
    delete next.fbp;
  }
  return Object.keys(next).length > 0 ? next : undefined;
}

function detectDeviceType(): 'mobile' | 'desktop' | 'tablet' | 'unknown' {
  const ua = navigator.userAgent;
  if (/ipad|tablet|playbook|silk|(android(?!.*mobile))/i.test(ua)) return 'tablet';
  if (/mobile|iphone|ipod|android.*mobile|windows phone/i.test(ua)) return 'mobile';
  return 'desktop';
}

function resolveTrafficSourceForSession(): string {
  try {
    const stored = loadStored();
    const touch = stored?.lastTouch ?? stored?.firstTouch;
    return touch?.source?.trim() || 'direct';
  } catch {
    return 'direct';
  }
}

function prunePayload(
  payload: MarketingAttributionPayload
): MarketingAttributionPayload | undefined {
  const result: MarketingAttributionPayload = {};

  if (payload.firstTouch && hasTouchContent(payload.firstTouch)) {
    result.firstTouch = payload.firstTouch;
  }
  if (payload.lastTouch && hasTouchContent(payload.lastTouch)) {
    result.lastTouch = payload.lastTouch;
  }
  if (payload.orderTouch && hasTouchContent(payload.orderTouch)) {
    result.orderTouch = payload.orderTouch;
  }
  if (payload.clickIds && Object.keys(payload.clickIds).length > 0) {
    result.clickIds = payload.clickIds;
  }
  if (payload.sessionId) result.sessionId = payload.sessionId;
  if (payload.visitorId) result.visitorId = payload.visitorId;
  if (payload.gaClientId) result.gaClientId = payload.gaClientId;
  if (payload.firstVisitAt) result.firstVisitAt = payload.firstVisitAt;
  if (payload.lastVisitAt) result.lastVisitAt = payload.lastVisitAt;
  if (payload.consent) result.consent = payload.consent;

  const hasAttributionData =
    result.firstTouch ||
    result.lastTouch ||
    result.orderTouch ||
    result.clickIds ||
    result.sessionId ||
    result.visitorId ||
    result.gaClientId;

  if (!hasAttributionData && result.consent) {
    return { consent: result.consent };
  }

  return hasAttributionData ? result : undefined;
}

/**
 * Guide §6.2 — always bootstrap URL UTMs + URL click IDs (no consent).
 * Marketing → fbc/fbp; Analytics → gaClientId.
 */
export function bootstrapAttribution(): void {
  if (!isBrowser()) return;

  try {
    const prefs = getConsentPreferences();
    const params = new URLSearchParams(window.location.search);
    const referrer = document.referrer || '';
    const currentPage = window.location.href;
    const touch = buildTouch(params, referrer, currentPage);
    const urlClickIds = buildUrlClickIds(params);
    const cookieClickIds = buildCookieClickIds(prefs.marketing);
    const campaignVisit =
      hasCampaignParams(params) || isExternalReferrer(referrer) || Boolean(urlClickIds);

    const stored = loadStored() || {
      schemaVersion: 1 as const,
      updatedAt: new Date().toISOString(),
    };

    if (touch && campaignVisit) {
      if (!stored.firstTouch) {
        stored.firstTouch = touch;
        stored.landingPage = truncate(currentPage, MAX.landingPage);
      }
      stored.lastTouch = touch;
    }

    stored.clickIds = mergeClickIds(
      stored.clickIds,
      urlClickIds,
      cookieClickIds
    );

    if (!stored.firstVisitAt) {
      stored.firstVisitAt = stored.firstTouch?.capturedAt || new Date().toISOString();
    }
    stored.lastVisitAt = new Date().toISOString();

    if (prefs.analytics) {
      const gaClientId = readGaClientId(true);
      if (gaClientId) stored.gaClientId = gaClientId;
    } else {
      delete stored.gaClientId;
    }

    // Strip cookie IDs from store when marketing denied
    if (!prefs.marketing && stored.clickIds) {
      const next = { ...stored.clickIds };
      delete next.fbc;
      delete next.fbp;
      stored.clickIds = Object.keys(next).length > 0 ? next : undefined;
    }

    stored.updatedAt = new Date().toISOString();

    if (
      stored.firstTouch ||
      stored.lastTouch ||
      stored.clickIds ||
      stored.landingPage
    ) {
      saveStored(stored);
    }

    if (prefs.analytics) {
      resolveVisitorId(true);
    }

    clearPersistedVisitorIdIfDenied();
    if (prefs.analytics) {
      scheduleGaClientIdPoll();
    }
    devLog('bootstrap', {
      analytics: prefs.analytics,
      marketing: prefs.marketing,
      hasTouch: Boolean(touch),
      clickIds: stored.clickIds ? Object.keys(stored.clickIds) : [],
    });
  } catch (error) {
    devLog('bootstrap error', error);
  }
}

function buildSessionAttributionPayload(): MarketingAttributionPayload | undefined {
  try {
    const consent = readMarketingConsent();
    if (!consent.analytics) return undefined;

    const stored = loadStored();
    const session = loadOrCreateSession();
    const visitorId = resolveVisitorId(true);
    const params = new URLSearchParams(window.location.search);
    const referrer = document.referrer || '';
    const currentPage = window.location.href;
    const currentTouch = buildTouch(params, referrer, currentPage);

    const urlClickIds = buildUrlClickIds(params);
    const cookieClickIds = buildCookieClickIds(consent.marketing);

    const payload: MarketingAttributionPayload = {
      consent,
      sessionId: session.sessionId,
      visitorId: visitorId || undefined,
      gaClientId: stored?.gaClientId || readGaClientId(true) || null,
    };

    if (stored?.firstTouch) payload.firstTouch = stored.firstTouch;
    if (stored?.lastTouch) payload.lastTouch = stored.lastTouch;

    if (currentTouch) {
      payload.orderTouch = currentTouch;
      if (!payload.lastTouch) payload.lastTouch = currentTouch;
      if (!payload.firstTouch) payload.firstTouch = currentTouch;
    }

    payload.clickIds = mergeClickIds(stored?.clickIds, urlClickIds, cookieClickIds);

    return prunePayload(payload);
  } catch {
    return undefined;
  }
}

/** Persist consented browser session for admin analytics (analytics required). */
function syncVisitorSessionRecord(): void {
  if (!isBrowser() || !hasAnalyticsConsent()) return;

  const apiBase = (process.env.NEXT_PUBLIC_API_URL || '').replace(/\/$/, '');
  if (!apiBase) return;

  const session = loadOrCreateSession();
  const visitorId = resolveVisitorId(true);
  const attribution = buildSessionAttributionPayload();

  try {
    fetch(`${apiBase}/analytics/visitor-session`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sessionId: session.sessionId,
        visitorId,
        startedAt: session.startedAt,
        landingPage: session.landingPage || window.location.href,
        deviceType: detectDeviceType(),
        trafficSource: resolveTrafficSourceForSession(),
        attribution,
      }),
      keepalive: true,
    }).catch(() => {
      /* non-fatal */
    });
  } catch {
    /* non-fatal */
  }
}

/**
 * Guide §6.2 / §4.5.1 — POST campaign click (consent-independent).
 */
export function trackCampaignClick(): void {
  if (!isBrowser()) return;

  try {
    const apiBase = (process.env.NEXT_PUBLIC_API_URL || '').replace(/\/$/, '');
    if (!apiBase) return;

    const params = new URLSearchParams(window.location.search);
    const utmSource = truncate(params.get('utm_source'), MAX.generic);
    const utmMedium = truncate(params.get('utm_medium'), MAX.generic);
    const utmCampaign = truncate(params.get('utm_campaign'), MAX.campaign);
    const utmTerm = truncate(params.get('utm_term'), MAX.generic);
    const utmContent = truncate(params.get('utm_content'), MAX.generic);
    const utmId = truncate(params.get('utm_id'), MAX.id);

    if (!utmSource && !utmMedium && !utmCampaign && !utmId) return;

    const session = loadOrCreateSession();
    const dedupeKey = `${CAMPAIGN_CLICK_DEDUPE_PREFIX}${session.sessionId}|${utmSource || ''}|${utmMedium || ''}|${utmCampaign || ''}|${utmId || ''}|${utmTerm || ''}`;
    try {
      if (sessionStorage.getItem(dedupeKey)) return;
      sessionStorage.setItem(dedupeKey, '1');
    } catch {
      /* continue */
    }

    const visitorId = resolveVisitorId(hasAnalyticsConsent());

    fetch(`${apiBase}/analytics/campaign/click`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        visitorId,
        sessionId: session.sessionId,
        utmSource,
        utmMedium,
        utmCampaign,
        utmTerm,
        utmContent,
        utmId,
        landingPage: truncate(window.location.href, MAX.landingPage),
        referrer: truncate(document.referrer || '', MAX.referrer),
        deviceType: detectDeviceType(),
        userAgent: truncate(navigator.userAgent, 512),
      }),
      keepalive: true,
    }).catch(() => {
      /* non-fatal */
    });
  } catch (error) {
    devLog('trackCampaignClick error', error);
  }
}

/**
 * Route/consent entry: always bootstrap + campaign click; session if analytics.
 */
export function captureMarketingAttribution(): void {
  if (!isBrowser()) return;
  try {
    bootstrapAttribution();
    if (hasAnalyticsConsent()) {
      syncVisitorSessionRecord();
    }
  } catch (error) {
    devLog('capture error', error);
  }
}

/**
 * Order payload — guide §6.4 / §7.5:
 * - Always include URL click IDs when present
 * - fbc/fbp only with marketing
 * - visitorId / gaClientId with analytics
 */
export function getMarketingAttributionForOrder(): MarketingAttributionPayload | undefined {
  if (!isBrowser()) return undefined;

  try {
    bootstrapAttribution();
    const consent = readMarketingConsent();
    const params = new URLSearchParams(window.location.search);
    const referrer = document.referrer || '';
    const currentPage = window.location.href;
    const stored = loadStored();
    const session = loadOrCreateSession();

    const urlClickIds = buildUrlClickIds(params);
    const cookieClickIds = buildCookieClickIds(consent.marketing);
    const clickIds = stripMarketingAttributionFields(
      mergeClickIds(stored?.clickIds, urlClickIds, cookieClickIds),
      consent.marketing
    );

    const orderTouch = buildTouch(params, referrer, currentPage);
    const shouldIncludeOrderTouch =
      hasCampaignParams(params) ||
      isExternalReferrer(referrer) ||
      Boolean(stored?.firstTouch || stored?.lastTouch || clickIds);

    return prunePayload({
      firstTouch: stored?.firstTouch,
      lastTouch: stored?.lastTouch,
      orderTouch: shouldIncludeOrderTouch ? orderTouch : undefined,
      clickIds,
      sessionId: truncate(session.sessionId, MAX.id),
      visitorId: consent.analytics ? resolveVisitorId(true) : undefined,
      gaClientId: consent.analytics
        ? stored?.gaClientId || readGaClientId(true) || null
        : null,
      firstVisitAt: stored?.firstVisitAt,
      lastVisitAt: stored?.lastVisitAt,
      consent,
    });
  } catch (error) {
    devLog('order payload error', error);
    return undefined;
  }
}

export function withMarketingAttribution<T extends Record<string, unknown>>(
  orderData: T
): T & {
  marketingAttribution?: MarketingAttributionPayload;
  conversionConsent?: { analytics: boolean; marketing: boolean };
} {
  try {
    const marketingAttribution = getMarketingAttributionForOrder();
    const conversionConsent = getConversionConsent();
    if (!marketingAttribution && !conversionConsent) return orderData;
    return {
      ...orderData,
      ...(marketingAttribution ? { marketingAttribution } : {}),
      conversionConsent,
    };
  } catch {
    return orderData;
  }
}

// Re-export for callers that used the old name
export { hasMarketingConsent, hasAnalyticsConsent };
