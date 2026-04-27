/**
 * Public CMS fetch: always fresh (no stale server cache fallback).
 */
export function cmsPublicFetchInit(
  extra?: Omit<RequestInit, "cache" | "next">
): RequestInit {
  return { ...extra, cache: "no-store" };
}
