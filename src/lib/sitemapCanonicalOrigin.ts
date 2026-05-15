/** Canonical sitemap origin without www (e.g. https://aromadesire.com). */
export function canonicalSitemapOrigin(input: string): string {
  const value = String(input || "").trim().replace(/\/$/, "");
  if (!value) return "";
  try {
    const u = new URL(/^https?:\/\//i.test(value) ? value : `https://${value}`);
    if (u.hostname.toLowerCase().startsWith("www.")) {
      u.hostname = u.hostname.slice(4);
    }
    return u.origin;
  } catch {
    return value;
  }
}
