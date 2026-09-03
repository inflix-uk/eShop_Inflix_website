"use client";

import dynamic from "next/dynamic";

const DeferredGoogleAds = dynamic(
  () => import("@/app/components/analytics/DeferredGoogleAds"),
  { ssr: false }
);

export default function DeferredGoogleAdsGate({
  conversionId,
}: {
  conversionId?: string | null;
}) {
  if (!conversionId?.trim()) return null;
  return <DeferredGoogleAds conversionId={conversionId} />;
}
