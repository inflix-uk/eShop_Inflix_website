import {
  CMS_UPSTREAM_TIMEOUT_MS,
  combineAbortSignals,
} from "./cmsTimedFetch";

/**
 * Server-side fetch without stale cache fallback.
 * Do not use from Client Components.
 */
export async function cmsServerFetch(
  url: string,
  init?: RequestInit
): Promise<Response> {
  const timeoutController = new AbortController();
  const id = setTimeout(
    () => timeoutController.abort(),
    CMS_UPSTREAM_TIMEOUT_MS
  );
  const { signal: outerSignal, ...restInit } = init ?? {};
  const signal = outerSignal
    ? combineAbortSignals([timeoutController.signal, outerSignal])
    : timeoutController.signal;
  try {
    return await fetch(url, {
      ...restInit,
      cache: "no-store",
      signal,
    });
  } finally {
    clearTimeout(id);
  }
}

export async function cmsServerFetchJson<T = unknown>(
  url: string,
  init?: RequestInit
): Promise<T> {
  const res = await cmsServerFetch(url, {
    ...init,
    headers: {
      Accept: "application/json",
      ...((init?.headers as Record<string, string>) || {}),
    },
  });

  const text = await res.text();
  const trimmed = text.trim();
  if (!trimmed) {
    throw new Error(`cmsServerFetchJson: empty body ${url}`);
  }

  const parsed = JSON.parse(trimmed) as T;
  return parsed;
}
