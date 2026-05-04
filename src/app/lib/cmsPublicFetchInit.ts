/**
 * Public CMS fetch — short ISR instead of `cache: "no-store"`.
 * Using `no-store` everywhere forced fully dynamic HTML and subresources with
 * `Cache-Control: no-store`, which blocks back/forward cache (Lighthouse bfcache).
 */
const CMS_PUBLIC_REVALIDATE_SECONDS = 60;

export function cmsPublicFetchInit(
  extra?: Omit<RequestInit, "cache" | "next"> & {
    next?: { revalidate?: number; tags?: string[] };
    cache?: RequestCache;
  }
): RequestInit & {
  cache: RequestCache;
  next: { revalidate: number; tags?: string[] };
} {
  const { next: extraNext, cache: cacheOverride, ...rest } = extra ?? {};
  return {
    ...rest,
    /** Next 15 defaults fetch to uncached; force-cache + revalidate opts into Data Cache + ISR. */
    cache: cacheOverride ?? "force-cache",
    next: {
      revalidate: CMS_PUBLIC_REVALIDATE_SECONDS,
      ...extraNext,
    },
  };
}

/**
 * Skip Next.js Data Cache — used for the homepage CMS bundle so `/` matches admin
 * immediately after saves (otherwise `force-cache` + revalidate can serve stale blocks
 * or widget toggles while `revalidate = 0` only affects the page shell).
 */
export function cmsLivePublicFetchInit(): RequestInit & {
  cache: RequestCache;
  next: { revalidate: number };
} {
  return {
    cache: "no-store",
    next: { revalidate: 0 },
  };
}
