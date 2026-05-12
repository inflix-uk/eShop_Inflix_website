/**
 * Normalize CMS/Mongo/JSON values for the admin “Sticky navbar” flag.
 * Strict `=== true` misses numeric `1` or string `"true"` from some APIs.
 */
export function parseStickyNavbarFlag(value: unknown): boolean {
  if (value === true || value === 1) return true;
  if (value === false || value === 0 || value == null) return false;
  if (typeof value === "string") {
    const s = value.trim().toLowerCase();
    if (["true", "1", "yes", "on"].includes(s)) return true;
    if (["false", "0", "no", "off", ""].includes(s)) return false;
  }
  return false;
}
