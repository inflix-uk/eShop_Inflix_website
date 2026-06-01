/** Escape values embedded in HTML attribute literals from admin CMS fields. */
export function escapeHtmlAttr(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

/**
 * Admin sometimes saves verification tokens as plain text (no tags).
 * React cannot hydrate raw text nodes inside `<head>`.
 */
export function normalizeBareHeadLine(line: string): string {
  const s = line.trim();
  if (!s) return "";

  if (/^\s*</.test(s)) return s;

  const ahrefs = s.match(/^ahrefs-site-verification[_-]?([a-zA-Z0-9]+)$/i);
  if (ahrefs) {
    return `<meta name="ahrefs-site-verification" content="${escapeHtmlAttr(ahrefs[1])}" />`;
  }

  if (/^https?:\/\//i.test(s)) {
    return `<script src="${escapeHtmlAttr(s)}" async></script>`;
  }

  if (!/[<>]/.test(s)) {
    return `<meta name="google-site-verification" content="${escapeHtmlAttr(s)}" />`;
  }

  return s;
}

/** Normalize a blob of trusted admin head HTML before parsing into React. */
export function normalizeHeadScriptsHtml(html: string): string {
  const trimmed = String(html ?? "").trim();
  if (!trimmed) return "";

  if (!/[<>]/.test(trimmed)) {
    return normalizeBareHeadLine(trimmed);
  }

  return trimmed
    .split(/\n+/)
    .map((line) => {
      const t = line.trim();
      if (!t) return "";
      if (/^\s*</.test(t)) return t;
      return normalizeBareHeadLine(t);
    })
    .filter(Boolean)
    .join("\n");
}
