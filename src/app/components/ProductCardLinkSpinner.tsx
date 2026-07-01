"use client";

import { useLinkStatus } from "next/link";

/**
 * Instant click feedback for a product card.
 *
 * Rendered INSIDE a product card's <Link>. `useLinkStatus()` (Next.js 15.3+)
 * reports the pending state of that link's navigation, so the moment a user
 * clicks the card this overlays a spinner — even before the destination route
 * commits and the product page's loading.tsx takes over. Returns null while
 * idle, so it has zero visual/layout impact until a click happens.
 */
export default function ProductCardLinkSpinner() {
  const { pending } = useLinkStatus();

  if (!pending) return null;

  return (
    <span
      className="absolute inset-0 z-[2] flex items-center justify-center rounded-lg bg-white/60 backdrop-blur-[1px]"
      aria-hidden="true"
    >
      <span className="h-8 w-8 animate-spin rounded-full border-4 border-gray-300 border-t-gray-700" />
    </span>
  );
}
