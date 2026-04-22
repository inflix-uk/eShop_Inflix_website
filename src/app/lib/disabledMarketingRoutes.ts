/**
 * Top-level paths temporarily disabled (404). Keep in sync when re-enabling routes.
 * Match is case-insensitive; no leading/trailing slashes.
 */
const DISABLED = new Set([
  "subscribe-newsletter",
  "why-buying-a-refurbished-iphone-is-a-good-idea",
  "buy-now-pay-later",
  "customer-reviews",
  "recycle-mobile-phone",
  "sustainability",
  "18-months-warranty",
  "faqs",
  "about-zextons",
  "deals-and-discounts",
]);

export function isDisabledMarketingSlug(slug: string): boolean {
  const key = slug.trim().replace(/^\/+|\/+$/g, "").toLowerCase();
  return DISABLED.has(key);
}
