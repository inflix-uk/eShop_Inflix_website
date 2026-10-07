/**
 * Product text fields can hold the literal text "null" / "undefined": older
 * admin forms sent an empty field that way and it was stored as written.
 * Treat it as empty so it never reaches the page or the structured data.
 */
export function cleanCmsText(value: unknown): string {
  if (value === null || value === undefined) return "";
  const text = String(value);
  const lower = text.trim().toLowerCase();
  return lower === "null" || lower === "undefined" ? "" : text;
}
