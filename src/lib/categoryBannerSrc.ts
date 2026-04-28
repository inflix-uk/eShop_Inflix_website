/**
 * Resolve image src for category/subcategory media stored as { url?, path? }.
 * Vercel Blob uploads set `url` (absolute HTTPS) and `path` (blob pathname only);
 * prefixing NEXT_PUBLIC_API_URL onto `path` breaks banner rendering.
 */
export function resolveCategoryImageSrc(media: {
  url?: string;
  path?: string;
} | null | undefined): string | null {
  if (!media) return null;
  const u = typeof media.url === "string" ? media.url.trim() : "";
  if (u) return u;
  const p = typeof media.path === "string" ? media.path.trim() : "";
  if (!p) return null;
  if (/^https?:\/\//i.test(p)) return p;
  const base = (process.env.NEXT_PUBLIC_API_URL || "").replace(/\/$/, "");
  return `${base}/${p.replace(/^\//, "")}`;
}
