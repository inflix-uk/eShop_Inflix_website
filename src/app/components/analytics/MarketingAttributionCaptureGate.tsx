"use client";

import { Suspense } from "react";
import dynamic from "next/dynamic";

const MarketingAttributionCapture = dynamic(
  () => import("@/app/components/analytics/MarketingAttributionCapture"),
  { ssr: false }
);

/** Suspense boundary required for useSearchParams in App Router. */
export default function MarketingAttributionCaptureGate() {
  return (
    <Suspense fallback={null}>
      <MarketingAttributionCapture />
    </Suspense>
  );
}
