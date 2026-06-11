import { cache } from "react";

const HEALTH_PATH = "/health";
const HEALTH_TIMEOUT_MS = 2000;

/**
 * Base URL for server-side CMS fetches. Prefer `NEXT_PUBLIC_API_URL` (browser + SSR);
 * fall back to server-only vars often set on Vercel without the NEXT_PUBLIC_ prefix.
 * Avoid relying on localhost for production SSR — set a public API URL in env.
 */
/** API origin for server-side fetches (robots.txt, health, etc.). */
export function resolveApiBase(): string {
  const trim = (s: string) => s.trim().replace(/\/$/, "");
  const fromPublic = trim(process.env.NEXT_PUBLIC_API_URL || "");
  if (fromPublic) return fromPublic;
  return trim(process.env.API_URL || process.env.BACKEND_URL || "");
}

async function fetchHealthOnce(base: string): Promise<boolean> {
  const url = `${base}${HEALTH_PATH}`;
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), HEALTH_TIMEOUT_MS);
  try {
    const res = await fetch(url, {
      method: "GET",
      cache: "force-cache",
      next: { revalidate: 120 },
      headers: { Accept: "application/json" },
      signal: controller.signal,
    });
    return res.ok;
  } catch {
    return false;
  } finally {
    clearTimeout(id);
  }
}

/**
 * Server-side liveness probe against Express `GET /health`.
 * Deduplicated per React request via `cache()`.
 */
export const isBackendAvailable = cache(async (): Promise<boolean> => {
  const apiBase = resolveApiBase();
  if (!apiBase) {
    console.error(
      "[isBackendAvailable] Missing API base URL. Set NEXT_PUBLIC_API_URL (recommended), API_URL, or BACKEND_URL for SSR."
    );
    return false;
  }

  try {
    return await fetchHealthOnce(apiBase);
  } catch {
    return false;
  }
});
