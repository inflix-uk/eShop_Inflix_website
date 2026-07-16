/**
 * Homepage JSON-LD from admin "Meta Schema" rows + server fallback.
 */

const SCHEMA_CONTEXT = "https://schema.org";

/** Strip optional <script type="application/ld+json">…</script> wrapper from pasted admin content */
function unwrapScriptWrapper(raw: string): string {
  const t = raw.trim();
  const typed = t.match(
    /<script[^>]*type\s*=\s*["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/i
  );
  if (typed) return typed[1].trim();
  const any = t.match(/<script[^>]*>([\s\S]*?)<\/script>/i);
  if (any) return any[1].trim();
  return t;
}

/** Add @context (and @graph for bare arrays) so fragments like `{ "@type": "Organization", ... }` validate */
function ensureSchemaOrgContext(parsed: unknown): unknown {
  if (parsed === null || typeof parsed !== "object") return parsed;
  if (Array.isArray(parsed)) {
    return {
      "@context": SCHEMA_CONTEXT,
      "@graph": parsed,
    };
  }
  const o = parsed as Record<string, unknown>;
  if (!("@context" in o)) {
    return { "@context": SCHEMA_CONTEXT, ...o };
  }
  return parsed;
}

/** Escape `<` so values like `</script>` cannot break the outer script tag. */
function escapeJsonLdForScriptTag(json: string): string {
  return json.replace(/</g, "\\u003c");
}

/**
 * Turn Homepage SEO "Meta Schema" rows into JSON-LD for <script type="application/ld+json">.
 * - Strips surrounding <script>…</script> if pasted from examples.
 * - Valid JSON object or array: adds @context / @graph when missing, then stringifies.
 * - Plain http(s) URL → minimal WebPage node.
 * - Escapes `<` for safe embedding inside a script tag (avoids hydration breaks).
 */
export function metaSchemaEntryToJsonLdString(raw: string): string | null {
  const unwrapped = unwrapScriptWrapper(raw);
  if (!unwrapped) return null;

  const first = unwrapped[0];
  if (first === "{" || first === "[") {
    try {
      const parsed = JSON.parse(unwrapped) as unknown;
      const withContext = ensureSchemaOrgContext(parsed);
      return escapeJsonLdForScriptTag(JSON.stringify(withContext));
    } catch {
      return null;
    }
  }

  if (/^https?:\/\//i.test(unwrapped)) {
    return escapeJsonLdForScriptTag(
      JSON.stringify({
        "@context": SCHEMA_CONTEXT,
        "@type": "WebPage",
        url: unwrapped,
      })
    );
  }

  return null;
}

/**
 * Fallback when admin Meta Schema has no valid entries.
 * WebSite only — root layout already injects Organization JSON-LD.
 * @param siteUrl — absolute origin for this request (e.g. from {@link getCanonical} with path "").
 */
export function getDefaultHomepageJsonLdString(
  siteUrl: string,
  siteName = ""
): string {
  return JSON.stringify({
    "@context": SCHEMA_CONTEXT,
    "@type": "WebSite",
    ...(siteName ? { name: siteName } : {}),
    url: siteUrl.endsWith("/") ? siteUrl : `${siteUrl}/`,
  });
}

/**
 * CMS "meta schema" rows may paste full `<script type="application/ld+json">…</script>`.
 * Feeding that into another `<script>` breaks HTML parsing and causes hydration mismatches.
 * Returns JSON-only strings safe for `dangerouslySetInnerHTML` inside `application/ld+json`.
 */
export function normalizeMetaSchemaJsonLdStrings(
  entries: string[] | undefined
): string[] {
  if (!entries?.length) return [];
  return entries
    .map((e) => metaSchemaEntryToJsonLdString(e))
    .filter((s): s is string => Boolean(s));
}
