/**
 * Meta Pixel stub / real-queue swap.
 * Stub is discard-only: never flush queued pre-consent events after opt-in.
 */

declare global {
  interface Window {
    fbq?: FbqFn;
    _fbq?: FbqFn;
    __inflixFbeventsInjected?: boolean;
  }
}

type FbqFn = ((...args: unknown[]) => void) & {
  queue?: unknown[];
  loaded?: boolean;
  version?: string;
  _stub?: boolean;
  callMethod?: (...args: unknown[]) => void;
  push?: (...args: unknown[]) => void;
};

export function installFbqStub(): void {
  if (typeof window === 'undefined') return;
  const existing = window.fbq;
  if (typeof existing === 'function' && !existing._stub) return;

  const n = function fbqStub() {
    /* discard */
  } as FbqFn;
  n.queue = [];
  n.loaded = true;
  n.version = '2.0';
  n._stub = true;
  n.callMethod = function () {
    /* discard */
  };
  n.push = n.callMethod;
  window.fbq = n;
  window._fbq = n;
}

/**
 * When marketing is granted, drop the stub without flushing and load fbevents.js
 * so GTM can init. When marketing is revoked, reinstall the discard stub.
 */
export function syncFacebookPixelForConsent(marketing: boolean): void {
  if (typeof window === 'undefined') return;

  if (!marketing) {
    installFbqStub();
    return;
  }

  const current = window.fbq;
  if (current && current._stub) {
    try {
      delete (window as Window & { fbq?: FbqFn }).fbq;
      delete (window as Window & { _fbq?: FbqFn })._fbq;
    } catch {
      window.fbq = undefined;
      window._fbq = undefined;
    }
  }

  loadOfficialFbevents();
}

function loadOfficialFbevents(): void {
  if (window.__inflixFbeventsInjected) return;
  if (document.getElementById('facebook-jssdk')) {
    window.__inflixFbeventsInjected = true;
    return;
  }

  window.__inflixFbeventsInjected = true;

  const fbq: FbqFn = function (...args: unknown[]) {
    if (typeof fbq.callMethod === 'function') {
      fbq.callMethod(...args);
    } else {
      (fbq.queue = fbq.queue || []).push(args);
    }
  } as FbqFn;
  if (!window.fbq) {
    window.fbq = fbq;
    window._fbq = fbq;
    fbq.push = fbq;
    fbq.loaded = true;
    fbq.version = '2.0';
    fbq.queue = [];
  }

  const script = document.createElement('script');
  script.id = 'facebook-jssdk';
  script.async = true;
  script.src = 'https://connect.facebook.net/en_US/fbevents.js';
  const first = document.getElementsByTagName('script')[0];
  first?.parentNode?.insertBefore(script, first);
}

export function trackMetaPurchase(
  value: number,
  currency: string,
  orderNumber: string
): void {
  if (typeof window === 'undefined') return;
  const fbq = window.fbq;
  if (typeof fbq !== 'function' || fbq._stub) return;
  try {
    fbq('track', 'Purchase', { value, currency }, { eventID: orderNumber });
  } catch {
    /* non-fatal */
  }
}
