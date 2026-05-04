"use client";

import dynamic from "next/dynamic";

const DeferredGoogleTagManager = dynamic(
  () => import("@/app/components/analytics/DeferredGoogleTagManager"),
  { ssr: false }
);

/** Server `layout.tsx` cannot use `dynamic(..., { ssr: false })`; this client gate wraps it. */
export default function DeferredGoogleTagManagerGate() {
  return <DeferredGoogleTagManager />;
}
