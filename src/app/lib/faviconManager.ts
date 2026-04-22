"use client";

/**
 * CMS favicon — strip stale link nodes, apply strong cache-bust, persist for inline head script.
 */

const STORAGE_KEY = "favicon";

function apiOrigin(): string {
  const raw = process.env.NEXT_PUBLIC_API_URL || "";
  return raw.replace(/\/$/, "");
}

/** Resolve CMS path or absolute URL to absolute href. */
export function toAbsoluteFaviconUrl(url: string): string {
  if (!url?.trim()) return "";
  const u = url.trim();
  if (u.startsWith("http://") || u.startsWith("https://")) return u;
  const base = apiOrigin();
  if (!base) return u.startsWith("/") ? u : `/${u}`;
  const p = u.startsWith("/") ? u : `/${u}`;
  return `${base}${p}`;
}

function removeAllFaviconLinks(): void {
  document
    .querySelectorAll(
      'link[rel="icon"],link[rel="shortcut icon"],link[rel="apple-touch-icon"],link[rel="apple-touch-icon-precomposed"]'
    )
    .forEach((el) => el.remove());
}

export function clearFavicon(): void {
  removeAllFaviconLinks();
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    /* ignore */
  }
}

/** Apply favicon (icon, shortcut, apple-touch) and persist busted URL for pre-hydration script. */
export function setFavicon(url: string): void {
  if (!url?.trim()) {
    clearFavicon();
    return;
  }

  const absolute = toAbsoluteFaviconUrl(url.trim());
  if (!absolute) {
    clearFavicon();
    return;
  }

  const sep = absolute.includes("?") ? "&" : "?";
  const finalUrl = `${absolute}${sep}v=${Date.now()}`;

  removeAllFaviconLinks();

  const basePath = absolute.split("?")[0].toLowerCase();
  const iconType = basePath.endsWith(".ico") ? "image/x-icon" : "image/png";
  const appleType = "image/png";

  const pairs: [string, string][] = [
    ["icon", iconType],
    ["shortcut icon", iconType],
    ["apple-touch-icon", appleType],
  ];

  for (const [rel, mime] of pairs) {
    const link = document.createElement("link");
    link.rel = rel;
    link.type = mime;
    link.href = finalUrl;
    document.head.appendChild(link);
  }

  try {
    localStorage.setItem(STORAGE_KEY, finalUrl);
  } catch {
    /* ignore */
  }
}
