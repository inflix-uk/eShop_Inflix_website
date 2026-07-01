/**
 * Storefront marketing attribution capture (Phase 1C).
 * Sends raw touch/click/consent data to POST /create/order — backend normalizes.
 *
 * Consent (ConsentCookie.tsx via js-cookie) — see cookieConsent.ts.
 *
 * BEFORE explicit consent (banner unset / no opt-in):
 * - No localStorage attribution, visitorId, or sessionStorage session
 * - No click IDs in order payload
 * - Order payload may include `consent` + ephemeral UTM-only `orderTouch` (no referrer/landing URL)
 */
import {
  readMarketingConsent,
  type MarketingConsentState,
} from '@/app/lib/cookieConsent';

export type { MarketingConsentState };
export { readMarketingConsent };

const STORAGE_KEY = 'marketingAttribution_v1';
const VISITOR_ID_KEY = 'marketingVisitorId';
const SESSION_STORAGE_KEY = 'marketingSession_v1';

/** Align with typical attribution lookback; stored record expires after this. */
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
] as const;

/** Matches backend ALLOWED_CLICK_IDS in marketingAttribution.js — LinkedIn li_fat_id not supported. */
const CLICK_ID_KEYS = [
  'gclid',
  'gbraid',
  'wbraid',
  'fbclid',
  'msclkid',
  'ttclid',
] as const;

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
  clickIds?: Partial<Record<(typeof CLICK_ID_KEYS)[number], string>>;
  sessionId?: string;
  visitorId?: string;
  consent?: MarketingConsentState;
}

interface StoredAttribution {
  schemaVersion: 1;
  firstTouch?: MarketingTouch;
  lastTouch?: MarketingTouch;
  landingPage?: string;
  clickIds?: Partial<Record<(typeof CLICK_ID_KEYS)[number], string>>;
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

function traceEnabled(): boolean {
  return (
    process.env.NODE_ENV === 'development' ||
    process.env.NEXT_PUBLIC_MARKETING_ATTRIBUTION_DEBUG === 'true'
  );
}

/** Dev/staging trace — filter browser console with `orderAttribution`. */
export function logOrderAttributionTrace(
  stage: 'capture' | 'capture-skipped' | 'checkout',
  payload?: MarketingAttributionPayload,
  detail?: string
): void {
  if (!traceEnabled() || !isBrowser()) return;

  if (stage === 'capture-skipped') {
    console.log(`[orderAttribution] capture skipped — ${detail ?? 'unknown reason'}`);
    return;
  }

  const p = payload ?? getMarketingAttributionForOrder();
  if (!p) {
    console.log(`[orderAttribution] ${stage} — no marketingAttribution payload`);
    return;
  }

  const gclid = p.clickIds?.gclid ?? null;
  const source = p.orderTouch?.source ?? p.lastTouch?.source ?? p.firstTouch?.source ?? null;
  const medium = p.orderTouch?.medium ?? p.lastTouch?.medium ?? p.firstTouch?.medium ?? null;

  let urlGclid: string | null = null;
  let storedGclid: string | null = null;
  try {
    urlGclid = new URLSearchParams(window.location.search).get('gclid');
    const storedRaw = localStorage.getItem(STORAGE_KEY);
    if (storedRaw) {
      const parsed = JSON.parse(storedRaw) as StoredAttribution;
      storedGclid = parsed?.clickIds?.gclid ?? null;
    }
  } catch {
    /* ignore */
  }

  console.log(
    `[orderAttribution] ${stage} OK — gclid: ${gclid ?? 'none'} | source: ${source ?? 'none'} | medium: ${medium ?? 'none'} | marketing consent: ${p.consent?.marketing ?? false}`
  );
  console.log('[orderAttribution] URL gclid:', urlGclid || 'not in URL');
  console.log('[orderAttribution] stored gclid:', storedGclid || 'none');
  if (!gclid && !urlGclid && (medium === 'cpc' || source === 'google')) {
    console.log(
      '[orderAttribution] hint: UTM-only visit — add &gclid=TEST-GCLID-123 to URL to test Google Ads click ID capture'
    );
  }
  if (stage === 'capture') {
    console.log(
      '[orderAttribution] note: backend logs appear on checkout (POST /create/order) — homepage capture is browser-only'
    );
  }
  console.log('[orderAttribution] consent:', p.consent);
  console.log('[orderAttribution] Google Ads clickIds:', {
    gclid: p.clickIds?.gclid ?? null,
    gbraid: p.clickIds?.gbraid ?? null,
    wbraid: p.clickIds?.wbraid ?? null,
  });
  console.log('[orderAttribution] touch summary:', {
    firstTouch: p.firstTouch
      ? { source: p.firstTouch.source, medium: p.firstTouch.medium, campaign: p.firstTouch.campaign }
      : null,
    lastTouch: p.lastTouch
      ? { source: p.lastTouch.source, medium: p.lastTouch.medium, campaign: p.lastTouch.campaign }
      : null,
    orderTouch: p.orderTouch
      ? { source: p.orderTouch.source, medium: p.orderTouch.medium, campaign: p.orderTouch.campaign }
      : null,
  });
  console.log('[orderAttribution] visitorId:', p.visitorId ?? null);
  console.log('[orderAttribution] sessionId:', p.sessionId ?? null);
  if (stage === 'checkout') {
    console.log('[orderAttribution] full checkout payload:', p);
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

function loadStored(): StoredAttribution | null {
  if (!isBrowser()) return null;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as StoredAttribution;
    if (parsed?.schemaVersion !== 1 || !parsed.updatedAt) return null;
    const age = Date.now() - new Date(parsed.updatedAt).getTime();
    if (Number.isNaN(age) || age > ATTRIBUTION_TTL_MS) {
      localStorage.removeItem(STORAGE_KEY);
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

function saveStored(data: StoredAttribution): void {
  if (!isBrowser()) return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch {
    /* quota / private mode */
  }
}

function loadOrCreateSession(): StoredSession {
  if (!isBrowser()) {
    return { sessionId: generateId('msess'), startedAt: new Date().toISOString() };
  }
  try {
    const raw = sessionStorage.getItem(SESSION_STORAGE_KEY);
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

function getOrCreateVisitorId(): string | undefined {
  if (!isBrowser()) return undefined;
  try {
    let visitorId = localStorage.getItem(VISITOR_ID_KEY);
    if (!visitorId) {
      visitorId = generateId('mvis');
      localStorage.setItem(VISITOR_ID_KEY, visitorId);
    }
    return truncate(visitorId, MAX.id);
  } catch {
    return undefined;
  }
}

function hasUtmParams(params: URLSearchParams): boolean {
  return UTM_KEYS.some((key) => Boolean(params.get(key)));
}

function hasCampaignParams(params: URLSearchParams): boolean {
  if (hasUtmParams(params)) return true;
  return CLICK_ID_KEYS.some((key) => params.get(key));
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

/** Pre-consent checkout: UTM fields only — no referrer, landing URL, or click IDs. */
function buildEphemeralUtmOnlyTouch(params: URLSearchParams): MarketingTouch | undefined {
  if (!hasUtmParams(params)) return undefined;

  const touch: MarketingTouch = {
    capturedAt: new Date().toISOString(),
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

  return touch.source || touch.medium || touch.campaign ? touch : undefined;
}

function buildClickIds(
  params: URLSearchParams,
  allowMarketing: boolean
): MarketingAttributionPayload['clickIds'] | undefined {
  if (!allowMarketing) return undefined;

  const clickIds: NonNullable<MarketingAttributionPayload['clickIds']> = {};
  for (const key of CLICK_ID_KEYS) {
    const value = truncate(params.get(key), MAX.clickId);
    if (value) clickIds[key] = value;
  }
  return Object.keys(clickIds).length > 0 ? clickIds : undefined;
}

function mergeClickIds(
  ...sources: Array<MarketingAttributionPayload['clickIds'] | undefined>
): MarketingAttributionPayload['clickIds'] | undefined {
  const merged: NonNullable<MarketingAttributionPayload['clickIds']> = {};
  for (const source of sources) {
    if (!source) continue;
    for (const key of CLICK_ID_KEYS) {
      if (source[key]) merged[key] = source[key];
    }
  }
  return Object.keys(merged).length > 0 ? merged : undefined;
}

function detectDeviceType(): 'mobile' | 'desktop' | 'tablet' | 'unknown' {
  const ua = navigator.userAgent;
  if (/ipad|tablet|playbook|silk|(android(?!.*mobile))/i.test(ua)) return 'tablet';
  if (/mobile|iphone|ipod|android.*mobile|windows phone/i.test(ua)) return 'mobile';
  return 'desktop';
}

function resolveTrafficSourceForSession(): string {
  try {
    const storedRaw = localStorage.getItem(STORAGE_KEY);
    if (!storedRaw) return 'direct';
    const parsed = JSON.parse(storedRaw) as StoredAttribution;
    const touch = parsed.lastTouch ?? parsed.firstTouch;
    const source = touch?.source?.trim();
    return source || 'direct';
  } catch {
    return 'direct';
  }
}

/** Persist consented browser session for admin data-quality visitor session counts. */
function syncVisitorSessionRecord(): void {
  if (!isBrowser()) return;

  const apiBase = (process.env.NEXT_PUBLIC_API_URL || '').replace(/\/$/, '');
  if (!apiBase) return;

  const session = loadOrCreateSession();
  const visitorId = getOrCreateVisitorId();

  try {
    fetch(`${apiBase}/analytics/visitor-session`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sessionId: session.sessionId,
        visitorId,
        startedAt: session.startedAt,
        landingPage: session.landingPage,
        deviceType: detectDeviceType(),
        trafficSource: resolveTrafficSourceForSession(),
      }),
      keepalive: true,
    }).catch(() => {
      /* non-fatal */
    });
  } catch {
    /* non-fatal */
  }
}

function prunePayload(payload: MarketingAttributionPayload): MarketingAttributionPayload | undefined {
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
  if (payload.consent) result.consent = payload.consent;

  const hasAttributionData =
    result.firstTouch ||
    result.lastTouch ||
    result.orderTouch ||
    result.clickIds ||
    result.sessionId ||
    result.visitorId;

  if (!hasAttributionData && result.consent) {
    return { consent: result.consent };
  }

  return hasAttributionData ? result : undefined;
}

/**
 * Capture attribution on page load / route change. Never throws.
 * Requires explicit analytics consent before any persistence.
 */
export function captureMarketingAttribution(): void {
  if (!isBrowser()) return;

  try {
    const consent = readMarketingConsent();
    if (!consent.analytics) {
      logOrderAttributionTrace(
        'capture-skipped',
        undefined,
        'analytics consent not granted — click Accept all or enable Performance cookies, then capture runs again'
      );
      devLog('capture skipped — analytics consent not granted');
      return;
    }

    syncVisitorSessionRecord();

    const params = new URLSearchParams(window.location.search);
    const referrer = document.referrer || '';
    const currentPage = window.location.href;
    const touch = buildTouch(params, referrer, currentPage);
    const campaignVisit = hasCampaignParams(params) || isExternalReferrer(referrer);

    if (!campaignVisit || !touch) {
      logOrderAttributionTrace(
        'capture-skipped',
        undefined,
        'no campaign signal in URL (need utm_* or gclid/fbclid etc.)'
      );
      devLog('capture skipped — direct/internal visit');
      return;
    }

    const session = loadOrCreateSession();
    if (!session.landingPage) {
      session.landingPage = truncate(currentPage, MAX.landingPage);
      try {
        sessionStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(session));
      } catch {
        /* ignore */
      }
    }

    const stored = loadStored() || {
      schemaVersion: 1 as const,
      updatedAt: new Date().toISOString(),
    };

    if (!stored.firstTouch) {
      stored.firstTouch = touch;
      stored.landingPage = truncate(currentPage, MAX.landingPage);
    }
    stored.lastTouch = touch;
    stored.updatedAt = new Date().toISOString();

    if (consent.marketing) {
      const capturedClickIds = buildClickIds(params, true);
      if (capturedClickIds) {
        stored.clickIds = mergeClickIds(stored.clickIds, capturedClickIds);
      }
    }

    saveStored(stored);

    getOrCreateVisitorId();
    devLog('captured', { campaignVisit, source: touch.source, medium: touch.medium });
    logOrderAttributionTrace('capture', getMarketingAttributionForOrder());
  } catch (error) {
    devLog('capture error', error);
  }
}

/**
 * Build marketingAttribution for POST /create/order. Never throws.
 */
export function getMarketingAttributionForOrder(): MarketingAttributionPayload | undefined {
  if (!isBrowser()) return undefined;

  try {
    const consent = readMarketingConsent();
    const params = new URLSearchParams(window.location.search);
    const referrer = document.referrer || '';
    const currentPage = window.location.href;
    const stored = loadStored();
    const clickIds = consent.marketing
      ? mergeClickIds(stored?.clickIds, buildClickIds(params, true))
      : undefined;

    if (consent.analytics) {
      const orderTouchRaw = buildTouch(params, referrer, currentPage);
      const shouldIncludeOrderTouch =
        hasCampaignParams(params) ||
        isExternalReferrer(referrer) ||
        Boolean(stored?.firstTouch || stored?.lastTouch);
      const session = loadOrCreateSession();
      const visitorId = getOrCreateVisitorId();

      return prunePayload({
        firstTouch: stored?.firstTouch,
        lastTouch: stored?.lastTouch,
        orderTouch: shouldIncludeOrderTouch ? orderTouchRaw : undefined,
        clickIds,
        sessionId: truncate(session.sessionId, MAX.id),
        visitorId,
        consent,
      });
    }

    return prunePayload({
      orderTouch: buildEphemeralUtmOnlyTouch(params),
      consent,
    });
  } catch (error) {
    devLog('order payload error', error);
    return undefined;
  }
}

/**
 * Safely attach marketingAttribution to an order payload without mutating the input.
 */
export function withMarketingAttribution<T extends Record<string, unknown>>(
  orderData: T
): T & { marketingAttribution?: MarketingAttributionPayload } {
  try {
    const marketingAttribution = getMarketingAttributionForOrder();
    if (!marketingAttribution) return orderData;
    logOrderAttributionTrace('checkout', marketingAttribution);
    return { ...orderData, marketingAttribution };
  } catch {
    return orderData;
  }
}
