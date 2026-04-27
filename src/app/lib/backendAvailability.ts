import { cmsTimedFetch } from "@/app/lib/cmsTimedFetch";
import { cache } from "react";

function apiBase(): string {
  return (process.env.NEXT_PUBLIC_API_URL || "").replace(/\/$/, "");
}

/**
 * Server-side backend availability probe.
 * Returns false fast when API is unreachable so UI shells can be skipped entirely.
 */
export const isBackendAvailable = cache(async (): Promise<boolean> => {
  const base = apiBase();
  if (!base) return false;
  try {
    const res = await cmsTimedFetch(`${base}/get/logo/public`, {
      method: "GET",
      cache: "no-store",
      headers: { Accept: "application/json" },
    });
    return res.ok;
  } catch {
    return false;
  }
});
