"use client";

import { useEffect } from "react";
import { setFavicon, clearFavicon } from "@/app/lib/faviconManager";

/** Sync document favicon when the resolved CMS URL changes. */
export function useFavicon(url: string | null | undefined) {
  useEffect(() => {
    if (url?.trim()) {
      setFavicon(url.trim());
    } else {
      clearFavicon();
    }
  }, [url]);
}
