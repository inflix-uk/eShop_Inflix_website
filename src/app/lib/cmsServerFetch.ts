import {
  CMS_UPSTREAM_TIMEOUT_MS,
  combineAbortSignals,
} from "./cmsTimedFetch";

type CmsServerFetchInit = RequestInit & {
  next?: { revalidate?: number; tags?: string[] };
};

const CMS_SERVER_REVALIDATE_SECONDS = 120;

/**
 * Server-side CMS/upstream fetch with short ISR (not `no-store`) so document
 * responses stay eligible for back/forward cache.
 * Do not use from Client Components.
 */
export async function cmsServerFetch(
  url: string,
  init?: CmsServerFetchInit
): Promise<Response> {
  const timeoutController = new AbortController();
  const id = setTimeout(
    () => timeoutController.abort(),
    CMS_UPSTREAM_TIMEOUT_MS
  );
  const {
    signal: outerSignal,
    next: extraNext,
    cache: _ignoreCache,
    ...restInit
  } = init ?? {};
  const signal = outerSignal
    ? combineAbortSignals([timeoutController.signal, outerSignal])
    : timeoutController.signal;
  try {
    return await fetch(url, {
      ...restInit,
      signal,
      cache: "force-cache",
      next: {
        revalidate: CMS_SERVER_REVALIDATE_SECONDS,
        ...extraNext,
      },
    });
  } finally {
    clearTimeout(id);
  }
}

async function cmsServerFetchLive(
  url: string,
  init?: CmsServerFetchInit
): Promise<Response> {
  const timeoutController = new AbortController();
  const id = setTimeout(
    () => timeoutController.abort(),
    CMS_UPSTREAM_TIMEOUT_MS
  );
  const { signal: outerSignal, next: _ignoredNext, ...restInit } = init ?? {};
  const signal = outerSignal
    ? combineAbortSignals([timeoutController.signal, outerSignal])
    : timeoutController.signal;
  try {
    return await fetch(url, {
      ...restInit,
      signal,
      cache: "no-store",
      next: { revalidate: 0 },
    });
  } finally {
    clearTimeout(id);
  }
}

export async function cmsServerFetchJson<T = unknown>(
  url: string,
  init?: CmsServerFetchInit,
  options?: { live?: boolean }
): Promise<T> {
  const mergedInit = {
    ...init,
    headers: {
      Accept: "application/json",
      ...((init?.headers as Record<string, string>) || {}),
    },
  };
  const res = options?.live
    ? await cmsServerFetchLive(url, mergedInit)
    : await cmsServerFetch(url, mergedInit);

  const text = await res.text();
  const trimmed = text.trim();
  if (!trimmed) {
    throw new Error(`cmsServerFetchJson: empty body ${url}`);
  }

  const parsed = JSON.parse(trimmed) as T;
  return parsed;
}
