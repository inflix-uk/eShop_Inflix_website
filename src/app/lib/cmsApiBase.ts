/**
 * Normalized API origin for CMS/backend fetches (SSR + client).
 * Node undici often resolves `localhost` to ::1; Express may only listen on IPv4.
 */
function normalizeApiOrigin(raw: string): string {
  const trimmed = raw.trim().replace(/\/+$/, "");
  if (!trimmed) return "";
  return trimmed.replace(/^http:\/\/localhost(?=[:/]|$)/i, "http://127.0.0.1");
}

/** Prefer `NEXT_PUBLIC_CMS_API_URL`, then `NEXT_PUBLIC_API_URL`. */
export function resolveCmsApiBase(): string {
  const raw = String(
    process.env.NEXT_PUBLIC_CMS_API_URL || process.env.NEXT_PUBLIC_API_URL || ""
  );
  const normalized = normalizeApiOrigin(raw);
  if (normalized) return normalized;
  if (process.env.NODE_ENV !== "production") {
    return "http://127.0.0.1:3001";
  }
  return "";
}

/** Apply localhost → 127.0.0.1 for any resolved API origin string. */
export function normalizeApiOriginForFetch(origin: string): string {
  return normalizeApiOrigin(origin);
}
