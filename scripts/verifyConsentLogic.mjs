/**
 * Frontend consent-logic checks (mirrors cookieConsent.ts / consentMode.ts).
 * Run: node scripts/verifyConsentLogic.mjs
 */

let passed = 0;
let failed = 0;

function pass(label) {
  passed += 1;
  console.log(`✅ ${label}`);
}

function fail(label, detail) {
  failed += 1;
  console.error(`❌ ${label}${detail ? ` — ${detail}` : ''}`);
}

function assertEqual(label, actual, expected) {
  if (JSON.stringify(actual) === JSON.stringify(expected)) pass(label);
  else fail(label, `expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
}

function resolveGranularConsentStatus(analytics, marketing) {
  if (!analytics && !marketing) return 'preferences';
  return 'customized';
}

function isGranted(value) {
  return value === 'true';
}

function readConsentPreferencesFromStore(getCookie) {
  const statusRaw = getCookie('cookieConsent') || '';
  const hasStatus = Boolean(statusRaw);
  if (!hasStatus) {
    return { necessary: true, analytics: false, marketing: false, status: '', hasChoice: false };
  }
  const analyticsCookie = getCookie('analytics');
  const marketingCookie = getCookie('marketing');
  const analyticsMissing = analyticsCookie == null || analyticsCookie === '';
  const marketingMissing = marketingCookie == null || marketingCookie === '';
  if (statusRaw === 'accepted' && analyticsMissing && marketingMissing) {
    return { necessary: true, analytics: true, marketing: true, status: 'accepted', hasChoice: true };
  }
  if (statusRaw === 'rejected') {
    return { necessary: true, analytics: false, marketing: false, status: 'rejected', hasChoice: true };
  }
  let analytics = isGranted(analyticsCookie);
  let marketing = isGranted(marketingCookie);
  if (analyticsMissing && getCookie('performance') != null) analytics = isGranted(getCookie('performance'));
  if (marketingMissing && getCookie('targeting') != null) marketing = isGranted(getCookie('targeting'));
  return { necessary: true, analytics, marketing, status: statusRaw, hasChoice: true };
}

function buildGoogleConsentModePayload(analytics, marketing) {
  return {
    analytics_storage: analytics ? 'granted' : 'denied',
    ad_storage: marketing ? 'granted' : 'denied',
    ad_user_data: marketing ? 'granted' : 'denied',
    ad_personalization: marketing ? 'granted' : 'denied',
  };
}

function stripMarketingAttributionFields(clickIds, marketing) {
  if (!clickIds) return undefined;
  const next = { ...clickIds };
  if (!marketing) {
    delete next.fbc;
    delete next.fbp;
  }
  return Object.keys(next).length > 0 ? next : undefined;
}

function trackAnalyticsPurchase(analytics) {
  return analytics === true;
}

function trackAdsConversion(marketing) {
  return marketing === true;
}

function buildEnhancedUserData(contact, marketing) {
  if (!marketing || !contact) return undefined;
  const email = contact.email ? String(contact.email).trim().toLowerCase() : '';
  if (!email.includes('@')) return undefined;
  return { email };
}

assertEqual('resolveGranularConsentStatus both off → preferences', resolveGranularConsentStatus(false, false), 'preferences');
assertEqual('resolveGranularConsentStatus any on → customized', resolveGranularConsentStatus(true, false), 'customized');
assertEqual('resolveGranularConsentStatus marketing only → customized', resolveGranularConsentStatus(false, true), 'customized');

assertEqual(
  'no choice → denied',
  readConsentPreferencesFromStore(() => undefined),
  { necessary: true, analytics: false, marketing: false, status: '', hasChoice: false }
);

assertEqual(
  'legacy accepted without category cookies → both true',
  readConsentPreferencesFromStore((name) => (name === 'cookieConsent' ? 'accepted' : undefined)),
  { necessary: true, analytics: true, marketing: true, status: 'accepted', hasChoice: true }
);

assertEqual(
  'rejected → both false',
  readConsentPreferencesFromStore((name) => {
    if (name === 'cookieConsent') return 'rejected';
    if (name === 'analytics') return 'true';
    return undefined;
  }),
  { necessary: true, analytics: false, marketing: false, status: 'rejected', hasChoice: true }
);

assertEqual(
  'analytics-only grants only analytics_storage',
  buildGoogleConsentModePayload(true, false),
  {
    analytics_storage: 'granted',
    ad_storage: 'denied',
    ad_user_data: 'denied',
    ad_personalization: 'denied',
  }
);

assertEqual(
  'marketing-only grants the three ad keys and denies analytics_storage',
  buildGoogleConsentModePayload(false, true),
  {
    analytics_storage: 'denied',
    ad_storage: 'granted',
    ad_user_data: 'granted',
    ad_personalization: 'granted',
  }
);

assertEqual(
  'strip fbc/fbp without marketing, keep gclid',
  stripMarketingAttributionFields({ gclid: 'KEEP', fbc: 'x', fbp: 'y' }, false),
  { gclid: 'KEEP' }
);

assertEqual('trackAnalyticsPurchase blocked without analytics', trackAnalyticsPurchase(false), false);
assertEqual('trackAnalyticsPurchase allowed with analytics', trackAnalyticsPurchase(true), true);
assertEqual('trackAdsConversion blocked without marketing', trackAdsConversion(false), false);
assertEqual('trackAdsConversion allowed with marketing', trackAdsConversion(true), true);
assertEqual(
  'enhanced user_data undefined without marketing',
  buildEnhancedUserData({ email: 'a@b.com' }, false),
  undefined
);
assertEqual(
  'enhanced user_data present with marketing',
  buildEnhancedUserData({ email: 'A@B.com' }, true),
  { email: 'a@b.com' }
);

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed > 0 ? 1 : 0);
