"use client";

import Script from "next/script";

/** PayPal messaging SDK — only needed where Pay Later UI is shown (checkout / PDP). */
const PAYPAL_SDK_SRC =
  "https://www.paypal.com/sdk/js?client-id=Aft9jSD19fVZmU7VJd1je7hCfZ-JyG6WDhqCpJsCENqXlQuRpZYyJYqc7zP20_U0H_vB0NK_ZU407K3F&currency=GBP&components=messages";

const KLARNA_CLIENT_ID =
  "klarna_live_client_KVRVI2UlR2pJMWd6dko5OHBnZlNraSR4SSQhQjQ2IyosYjUyOWRmNTItNjQ5ZC00MjEwLTlmNmItNGVmN2ZiMDc5YmY3LDEsZlg3ZjJmeXRvL1NqR0lYemJteTZmZkFQT3pUY3NXQWNEZHd2LzRpenlKVT0";

/**
 * Klarna + PayPal vendor scripts. Keep out of root layout so homepage and
 * non-commerce routes avoid multi‑MB parse/eval on the main thread.
 */
export default function PaymentVendorScripts() {
  return (
    <>
      <Script
        id="klarna-sdk"
        src="https://js.klarna.com/web-sdk/v1/klarna.js"
        data-environment="production"
        data-client-id={KLARNA_CLIENT_ID}
        strategy="lazyOnload"
      />
      <Script
        id="paypal-sdk"
        src={PAYPAL_SDK_SRC}
        data-namespace="PayPalSDK"
        strategy="lazyOnload"
      />
    </>
  );
}
