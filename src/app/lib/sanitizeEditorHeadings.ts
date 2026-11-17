/**
 * True if HTML fragment has no visible text (handles &nbsp;, <br>, empty spans, etc.).
 */
function headingInnerIsEffectivelyEmpty(inner: string): boolean {
  const text = inner
    .replace(/<[^>]+>/g, " ")
    .replace(/&(?:nbsp|#160|#x0*a0);/gi, " ")
    .replace(/&#\d+;/g, " ")
    .replace(/&#x[0-9a-f]+;/gi, " ")
    .replace(/\s+/g, "")
    .replace(/[\u00a0\u200b\uFEFF]/gi, "");
  return text.length === 0;
}

/** Strip heading nodes that carry no real text (ghost headings in SEO audits). */
export function sanitizeEditorHeadings(html: string): string {
  let out = html || "";
  let prev: string;
  const h2re = /<h2\b[^>]*>([\s\S]*?)<\/h2\s*>/gi;
  const h3re = /<h3\b[^>]*>([\s\S]*?)<\/h3\s*>/gi;
  do {
    prev = out;
    out = out.replace(h2re, (full, inner) =>
      headingInnerIsEffectivelyEmpty(inner) ? "" : full
    );
    out = out.replace(h3re, (full, inner) =>
      headingInnerIsEffectivelyEmpty(inner) ? "" : full
    );
  } while (out !== prev);
  return out;
}

function normalizeHeadingPlainText(s: string): string {
  return s
    .replace(/<[^>]+>/g, " ")
    .replace(/&(?:nbsp|#160|#x0*a0);/gi, " ")
    .replace(/&#\d+;/g, " ")
    .replace(/&#x[0-9a-f]+;/gi, " ")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

/**
 * Removes the first <h1> from CMS HTML when it only repeats the SEO meta title
 * (so the title stays in <title> / metadata but is not duplicated on the page).
 */
export function stripLeadingH1IfMatchesMeta(
  html: string,
  metaTitle: string | null | undefined
): string {
  const body = html || "";
  const mt = metaTitle?.trim();
  if (!mt) return body;
  const m = body.match(/<h1\b[^>]*>([\s\S]*?)<\/h1\s*>/i);
  if (!m) return body;
  const inner = m[1];
  if (normalizeHeadingPlainText(inner) === normalizeHeadingPlainText(mt)) {
    return body.replace(/<h1\b[^>]*>[\s\S]*?<\/h1\s*>/i, "").trim();
  }
  return body;
}
