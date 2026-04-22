"use client";

import { useLayoutEffect } from "react";
import { setFavicon, clearFavicon } from "@/app/lib/faviconManager";
import { getLogoSettingsPublic } from "@/app/services/logoService";

function stripQuery(u: string): string {
  const i = u.indexOf("?");
  return i === -1 ? u : u.slice(0, i);
}

type Props = {
  /** Resolved absolute favicon URL from SSR (no ?v=). */
  ssrFaviconResolvedUrl: string | null;
  ssrFaviconVersion: number | null;
};

/**
 * Reconcile with CMS after navigation. Skips DOM churn when data matches SSR
 * (avoids old localStorage / double icon swap flicker on full page load).
 */
export default function FaviconRuntimeSync({
  ssrFaviconResolvedUrl,
  ssrFaviconVersion,
}: Props) {
  useLayoutEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const settings = await getLogoSettingsPublic();
        if (cancelled) return;

        const fetched = settings?.faviconUrl?.trim();
        const fv = settings?.faviconVersion ?? null;

        if (!fetched) {
          clearFavicon();
          return;
        }

        const ssrUrl = ssrFaviconResolvedUrl?.trim() ?? null;
        const sameAsset =
          ssrUrl &&
          stripQuery(fetched) === stripQuery(ssrUrl) &&
          (fv ?? null) === (ssrFaviconVersion ?? null);

        if (sameAsset) {
          try {
            const hrefWithV = `${fetched}${fetched.includes("?") ? "&" : "?"}v=${fv ?? ""}`;
            localStorage.setItem("favicon", hrefWithV);
          } catch {
            /* ignore */
          }
          return;
        }

        setFavicon(fetched);
      } catch {
        if (!cancelled) clearFavicon();
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [ssrFaviconResolvedUrl, ssrFaviconVersion]);

  return null;
}
