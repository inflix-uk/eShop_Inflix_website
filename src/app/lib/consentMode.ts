/**
 * Google Consent Mode v2.
 * Default denied MUST fire before GTM. A second `default` would wipe a user update.
 */

type GtagFn = (...args: unknown[]) => void;

declare global {
  interface Window {
    dataLayer?: Record<string, unknown>[];
    gtag?: GtagFn;
    __inflixConsentDefaultSet?: boolean;
  }
}

const DEFAULT_CONSENT = {
  analytics_storage: 'denied',
  ad_storage: 'denied',
  ad_user_data: 'denied',
  ad_personalization: 'denied',
  wait_for_update: 500,
} as const;

/**
 * Inline <head> snippet — must run before GTM (beforeInteractive).
 * Also installs a discard-only fbq stub so GTM tags that call fbq() do not throw
 * and do not queue pre-consent events.
 */
export const CONSENT_DEFAULT_INLINE_SCRIPT = `(function(){try{
window.dataLayer=window.dataLayer||[];
function gtag(){dataLayer.push(arguments);}
window.gtag=gtag;
if(!window.__inflixConsentDefaultSet){
gtag('consent','default',{
analytics_storage:'denied',
ad_storage:'denied',
ad_user_data:'denied',
ad_personalization:'denied',
wait_for_update:500
});
gtag('set','ads_data_redaction',true);
gtag('set','url_passthrough',true);
window.__inflixConsentDefaultSet=true;
}
if(typeof window.fbq!=='function'){
var n=function(){};
n.queue=[];
n.loaded=true;
n.version='2.0';
n._stub=true;
n.callMethod=n.push=function(){};
window.fbq=n;
window._fbq=n;
}
}catch(e){}})();`;

function ensureGtag(): GtagFn {
  window.dataLayer = window.dataLayer || [];
  if (typeof window.gtag !== 'function') {
    window.gtag = function gtag(...args: unknown[]) {
      window.dataLayer!.push(args as unknown as Record<string, unknown>);
    };
  }
  return window.gtag;
}

/** Call once before GTM inject — deny-by-default Consent Mode v2. Idempotent. */
export function setDefaultConsentMode(): void {
  if (typeof window === 'undefined') return;
  if (window.__inflixConsentDefaultSet) {
    const gtag = ensureGtag();
    gtag('set', 'ads_data_redaction', true);
    gtag('set', 'url_passthrough', true);
    return;
  }
  const gtag = ensureGtag();
  gtag('consent', 'default', { ...DEFAULT_CONSENT });
  gtag('set', 'ads_data_redaction', true);
  gtag('set', 'url_passthrough', true);
  window.__inflixConsentDefaultSet = true;
}

/**
 * Update Consent Mode after user choice / on load when prefs already set.
 * analytics_storage ↔ Analytics toggle only.
 * ad_storage / ad_user_data / ad_personalization ↔ Marketing toggle only.
 */
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

export function buildGoogleConsentModePayload(
  analytics: boolean,
  marketing: boolean
): {
  analytics_storage: 'granted' | 'denied';
  ad_storage: 'granted' | 'denied';
  ad_user_data: 'granted' | 'denied';
  ad_personalization: 'granted' | 'denied';
} {
  return {
    analytics_storage: analytics ? 'granted' : 'denied',
    ad_storage: marketing ? 'granted' : 'denied',
    ad_user_data: marketing ? 'granted' : 'denied',
    ad_personalization: marketing ? 'granted' : 'denied',
  };
}
