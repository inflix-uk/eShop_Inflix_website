"use client";

import { useEffect } from "react";

/** Matches admin ProductCentralVariantAttributes Flaticon CSS list. */
const FLATICON_STYLESHEETS = [
  "https://cdn-uicons.flaticon.com/2.6.0/uicons-regular-rounded/css/uicons-regular-rounded.css",
  "https://cdn-uicons.flaticon.com/2.6.0/uicons-bold-rounded/css/uicons-bold-rounded.css",
  "https://cdn-uicons.flaticon.com/2.6.0/uicons-solid-rounded/css/uicons-solid-rounded.css",
  "https://cdn-uicons.flaticon.com/2.6.0/uicons-regular-straight/css/uicons-regular-straight.css",
  "https://cdn-uicons.flaticon.com/2.6.0/uicons-bold-straight/css/uicons-bold-straight.css",
  "https://cdn-uicons.flaticon.com/2.6.0/uicons-solid-straight/css/uicons-solid-straight.css",
  "https://cdn-uicons.flaticon.com/2.6.0/uicons-brands/css/uicons-brands.css",
];

/**
 * App Router does not apply `head.tsx`; custom HTML icons (&lt;i class="fi ..."&gt;) need these sheets.
 */
export default function FlaticonStylesheetLoader() {
  useEffect(() => {
    FLATICON_STYLESHEETS.forEach((href) => {
      if (document.querySelector(`link[rel="stylesheet"][href="${href}"]`)) return;
      const link = document.createElement("link");
      link.rel = "stylesheet";
      link.href = href;
      document.head.appendChild(link);
    });
  }, []);

  return null;
}
