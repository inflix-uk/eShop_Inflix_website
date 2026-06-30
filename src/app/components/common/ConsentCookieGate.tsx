"use client";

import dynamic from "next/dynamic";

const CookieConsent = dynamic(
  () => import("@/app/components/common/ConsentCookie"),
  { ssr: false }
);

/** Server `layout.tsx` cannot use `dynamic(..., { ssr: false })`; this client gate wraps it. */
export default function ConsentCookieGate() {
  return <CookieConsent />;
}
