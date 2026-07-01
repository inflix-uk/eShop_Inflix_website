/**
 * E-commerce funnel events for GTM/GA4 + first-party MarketingEvent store.
 * PII is SHA-256 hashed (Google Enhanced Conversions / Meta CAPI style) before storage.
 */
import { hasAnalyticsConsent, hasMarketingConsent, readMarketingConsent } from '@/app/lib/cookieConsent';
import { getMarketingAttributionForOrder } from '@/app/lib/marketingAttribution';

export type MarketingEventName = 'page_view' | 'add_to_cart' | 'begin_checkout' | 'purchase';

export interface EcommerceLineItem {
  productId?: string;
  name?: string;
  price?: number;
  quantity?: number;
}

export interface TrackEventOptions {
  path?: string;
  pageTitle?: string;
  value?: number;
  currency?: string;
  items?: EcommerceLineItem[];
  orderNumber?: string;
  email?: string;
  phone?: string;
  userData?: {
    emailSha256?: string;
    phoneSha256?: string;
  };
}

declare global {
  interface Window {
    dataLayer?: Record<string, unknown>[];
  }
}

function isBrowser(): boolean {
  return typeof window !== 'undefined';
}

function apiBase(): string {
  return (process.env.NEXT_PUBLIC_API_URL || '').replace(/\/$/, '');
}

function generateEventId(prefix: string): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return `${prefix}_${crypto.randomUUID()}`;
  }
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`;
}

async function sha256Hex(value: string): Promise<string> {
  const data = new TextEncoder().encode(value);
  const hash = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(hash))
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('');
}

export function normalizeEmail(email: string): string | undefined {
  const trimmed = String(email || '').trim().toLowerCase();
  if (!trimmed || !trimmed.includes('@')) return undefined;
  return trimmed;
}

export function normalizePhone(phone: string, defaultCountryCode = '44'): string | undefined {
  let digits = String(phone || '').replace(/\D/g, '');
  if (!digits) return undefined;

  if (digits.startsWith('00')) digits = digits.slice(2);

  if (defaultCountryCode === '44') {
    if (digits.startsWith('44')) {
      // keep
    } else if (digits.startsWith('0')) {
      digits = `44${digits.slice(1)}`;
    } else if (digits.length === 10) {
      digits = `44${digits}`;
    }
  }

  return digits || undefined;
}

export async function hashEmail(email: string): Promise<string | undefined> {
  const normalized = normalizeEmail(email);
  if (!normalized || !isBrowser()) return undefined;
  return sha256Hex(normalized);
}

export async function hashPhone(phone: string): Promise<string | undefined> {
  const normalized = normalizePhone(phone);
  if (!normalized || !isBrowser()) return undefined;
  return sha256Hex(normalized);
}

function detectDeviceType(): 'mobile' | 'desktop' | 'tablet' | 'unknown' {
  if (!isBrowser()) return 'unknown';
  const ua = navigator.userAgent;
  if (/ipad|tablet|playbook|silk|(android(?!.*mobile))/i.test(ua)) return 'tablet';
  if (/mobile|iphone|ipod|android.*mobile|windows phone/i.test(ua)) return 'mobile';
  return 'desktop';
}

export type MarketingPlatform =
  | 'google'
  | 'facebook'
  | 'microsoft'
  | 'tiktok'
  | 'email'
  | 'direct'
  | 'other';

export function inferMarketingPlatform(attribution?: ReturnType<typeof getMarketingAttributionForOrder>): {
  platform: MarketingPlatform;
  source?: string;
  medium?: string;
  campaign?: string;
  channel?: string;
} {
  const touch =
    attribution?.orderTouch || attribution?.lastTouch || attribution?.firstTouch || undefined;
  const source = touch?.source?.toLowerCase();
  const medium = touch?.medium?.toLowerCase();
  const campaign = touch?.campaign;
  const clickIds = attribution?.clickIds;

  if (clickIds?.gclid || clickIds?.gbraid || clickIds?.wbraid) {
    return { platform: 'google', source, medium, campaign, channel: 'paid_search' };
  }
  if (clickIds?.fbclid) {
    return { platform: 'facebook', source, medium, campaign, channel: 'paid_social' };
  }
  if (clickIds?.msclkid) {
    return { platform: 'microsoft', source, medium, campaign, channel: 'paid_search' };
  }
  if (clickIds?.ttclid) {
    return { platform: 'tiktok', source, medium, campaign, channel: 'paid_social' };
  }

  if (source === 'google' || medium === 'cpc' || medium === 'ppc') {
    return { platform: 'google', source, medium, campaign, channel: 'paid_search' };
  }
  if (source && ['facebook', 'instagram', 'meta'].includes(source)) {
    return { platform: 'facebook', source, medium, campaign, channel: 'paid_social' };
  }
  if (medium === 'email' || source === 'email' || source === 'newsletter') {
    return { platform: 'email', source, medium, campaign, channel: 'email' };
  }
  if (!source && !medium && !campaign) {
    return { platform: 'direct', source, medium, campaign, channel: 'direct' };
  }

  return { platform: 'other', source, medium, campaign, channel: source || 'other' };
}

function mapGa4Items(items: EcommerceLineItem[] = []) {
  return items.map((item) => ({
    item_id: item.productId,
    item_name: item.name,
    price: item.price,
    quantity: item.quantity ?? 1,
  }));
}

function pushDataLayer(payload: Record<string, unknown>): void {
  if (!isBrowser() || !hasAnalyticsConsent()) return;
  window.dataLayer = window.dataLayer || [];
  window.dataLayer.push(payload);
}

async function postFirstPartyEvent(
  eventName: MarketingEventName,
  eventId: string,
  body: Record<string, unknown>
): Promise<void> {
  const base = apiBase();
  if (!base || !isBrowser() || !hasAnalyticsConsent()) return;

  try {
    await fetch(`${base}/analytics/event`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ eventName, eventId, ...body }),
      keepalive: true,
    });
  } catch {
    /* non-fatal */
  }
}

async function buildUserDataHashes(options: TrackEventOptions) {
  if (options.userData?.emailSha256 || options.userData?.phoneSha256) {
    return options.userData;
  }

  const [emailSha256, phoneSha256] = await Promise.all([
    options.email ? hashEmail(options.email) : Promise.resolve(undefined),
    options.phone ? hashPhone(options.phone) : Promise.resolve(undefined),
  ]);

  if (!emailSha256 && !phoneSha256) return undefined;
  return {
    ...(emailSha256 ? { emailSha256 } : {}),
    ...(phoneSha256 ? { phoneSha256 } : {}),
  };
}

/**
 * Track a funnel event to dataLayer (GTM) and first-party API.
 */
export async function trackMarketingEvent(
  eventName: MarketingEventName,
  options: TrackEventOptions = {}
): Promise<void> {
  if (!isBrowser() || !hasAnalyticsConsent()) return;

  const attribution = getMarketingAttributionForOrder();
  const platformInfo = inferMarketingPlatform(attribution);
  const eventId = generateEventId(eventName);
  const path = options.path ?? window.location.pathname + window.location.search;
  const pageTitle = options.pageTitle ?? document.title;
  const userData = await buildUserDataHashes(options);
  const consent = readMarketingConsent();

  const items = options.items || [];
  const value = options.value;
  const currency = options.currency || 'GBP';

  const clickIds =
    consent.marketing && attribution?.clickIds
      ? {
          gclid: attribution.clickIds.gclid,
          fbclid: attribution.clickIds.fbclid,
          msclkid: attribution.clickIds.msclkid,
          ttclid: attribution.clickIds.ttclid,
        }
      : undefined;

  const ga4Ecommerce: Record<string, unknown> = {
    currency,
    ...(value != null ? { value } : {}),
    ...(options.orderNumber ? { transaction_id: options.orderNumber } : {}),
    ...(items.length > 0 ? { items: mapGa4Items(items) } : {}),
  };

  pushDataLayer({ ecommerce: null });
  pushDataLayer({
    event: eventName,
    marketing_platform: platformInfo.platform,
    marketing_source: platformInfo.source ?? null,
    marketing_medium: platformInfo.medium ?? null,
    marketing_campaign: platformInfo.campaign ?? null,
    page_path: path,
    page_title: pageTitle,
    ecommerce: ga4Ecommerce,
    ...(userData && hasMarketingConsent()
      ? {
          user_data: {
            sha256_email_address: userData.emailSha256 ?? undefined,
            sha256_phone_number: userData.phoneSha256 ?? undefined,
          },
        }
      : {}),
  });

  await postFirstPartyEvent(eventName, eventId, {
    sessionId: attribution?.sessionId,
    visitorId: attribution?.visitorId,
    occurredAt: new Date().toISOString(),
    path,
    pageTitle,
    platform: platformInfo.platform,
    source: platformInfo.source,
    medium: platformInfo.medium,
    campaign: platformInfo.campaign,
    channel: platformInfo.channel,
    value: value ?? null,
    currency,
    orderNumber: options.orderNumber,
    deviceType: detectDeviceType(),
    items,
    userData,
    clickIds,
  });
}

export function trackPageView(): void {
  void trackMarketingEvent('page_view', {
    path: isBrowser() ? window.location.pathname + window.location.search : undefined,
    pageTitle: isBrowser() ? document.title : undefined,
  });
}

export function trackAddToCart(item: EcommerceLineItem, cartValue?: number): void {
  void trackMarketingEvent('add_to_cart', {
    value: cartValue,
    items: [item],
  });
}

export function trackBeginCheckout(items: EcommerceLineItem[], value: number, contact?: {
  email?: string;
  phone?: string;
}): void {
  void trackMarketingEvent('begin_checkout', {
    value,
    items,
    email: contact?.email,
    phone: contact?.phone,
  });
}

export async function trackPurchase(
  orderNumber: string,
  value: number,
  items: EcommerceLineItem[],
  contact?: { email?: string; phone?: string }
): Promise<void> {
  await trackMarketingEvent('purchase', {
    orderNumber,
    value,
    items,
    email: contact?.email,
    phone: contact?.phone,
  });
}
