"use client";

import Script from "next/script";

const PAYPAL_CLIENT_ID =
  process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID ||
  "Aft9jSD19fVZmU7VJd1je7hCfZ-JyG6WDhqCpJsCENqXlQuRpZYyJYqc7zP20_U0H_vB0NK_ZU407K3F";

const PAYPAL_SDK_SRC = `https://www.paypal.com/sdk/js?client-id=${PAYPAL_CLIENT_ID}&currency=GBP&components=messages`;

const KLARNA_CLIENT_ID =
  process.env.NEXT_PUBLIC_KLARNA_CLIENT_ID ||
  "klarna_live_client_KVRVI2UlR2pJMWd6dko5OHBnZlNraSR4SSQhQjQ2IyosYjUyOWRmNTItNjQ5ZC00MjEwLTlmNmItNGVmN2ZiMDc5YmY3LDEsZlg3ZjJmeXRvL1NqR0lYemJteTZmZkFQT3pUY3NXQWNEZHd2LzRpenlKVT0";

type PaymentVendorScriptsProps = {
  /** PayPal Pay Later messaging — only when a `data-pp-message` placement exists on the page */
  enablePayPal?: boolean;
  /** Klarna on-site messaging — only when `klarna-placement` elements exist */
  enableKlarna?: boolean;
};

/**
 * Klarna + PayPal vendor scripts. Load only on pages that render BNPL placements
 * (checkout with cart items). Avoids PayPal SDK v5 errors on booking-only checkout,
 * empty carts, and product pages without placements.
 */
export default function PaymentVendorScripts({
  enablePayPal = false,
  enableKlarna = false,
}: PaymentVendorScriptsProps) {
  if (!enablePayPal && !enableKlarna) return null;

  return (
    <>
      {enableKlarna && (
        <Script
          id="klarna-sdk"
          src="https://js.klarna.com/web-sdk/v1/klarna.js"
          data-environment="production"
          data-client-id={KLARNA_CLIENT_ID}
          strategy="lazyOnload"
          onError={() => {
            console.warn("[Klarna SDK] Failed to load");
          }}
        />
      )}
      {enablePayPal && (
        <Script
          id="paypal-sdk"
          src={PAYPAL_SDK_SRC}
          data-namespace="PayPalSDK"
          strategy="lazyOnload"
          onError={() => {
            console.warn("[PayPal SDK] Failed to load");
          }}
        />
      )}
    </>
  );
}
