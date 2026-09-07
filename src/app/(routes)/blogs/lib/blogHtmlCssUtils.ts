/** Admin sometimes pastes full HTML documents; extract body markup for innerHTML. */
export function extractHtmlDocumentFragment(html: string): string {
  let s = String(html ?? "").trim();
  if (!s) return "";

  const bodyMatch = s.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
  if (bodyMatch) {
    return bodyMatch[1].trim();
  }

  if (/<!DOCTYPE|<html[\s>]/i.test(s)) {
    s = s
      .replace(/<!DOCTYPE[^>]*>/gi, "")
      .replace(/<\/?html[^>]*>/gi, "")
      .replace(/<head\b[^<]*(?:(?!<\/head>)<[^<]*)*<\/head>/gi, "")
      .replace(/<\/?body[^>]*>/gi, "");
  }

  return s.trim();
}

export type BlogBlockRow = {
  columns?: unknown;
};

type BlogLike = {
  blocks?: BlogBlockRow[];
};

/** True when the post's main body is a Custom HTML/CSS widget (full-page layouts). */
export function blogHasHtmlCssPrimaryContent(blog: BlogLike | null | undefined): boolean {
  if (!blog?.blocks?.length) return false;

  for (const row of blog.blocks) {
    const columns = Array.isArray(row?.columns) ? row.columns : [];
    for (const column of columns) {
      const blocks =
        column &&
        typeof column === "object" &&
        "blocks" in column &&
        Array.isArray((column as { blocks?: unknown }).blocks)
          ? (column as { blocks: unknown[] }).blocks
          : [];
      for (const block of blocks) {
        if (
          block &&
          typeof block === "object" &&
          (block as { type?: string }).type === "widget" &&
          (block as { content?: { widgetType?: string; html?: string } }).content
            ?.widgetType === "htmlCss" &&
          String(
            (block as { content?: { html?: string } }).content?.html || ""
          ).trim().length > 0
        ) {
          return true;
        }
      }
    }
  }

  return false;
}

export function normalizeBlogBlockColumns(row: BlogBlockRow): Array<{
  width?: number | string;
  blocks: unknown[];
}> {
  if (!row || !Array.isArray(row.columns)) return [];
  return row.columns
    .filter((col): col is { width?: number | string; blocks?: unknown[] } =>
      Boolean(col && typeof col === "object")
    )
    .map((col) => ({
      width: col.width,
      blocks: Array.isArray(col.blocks) ? col.blocks : [],
    }));
}

/**
 * Prefix admin widget CSS to a host selector instead of wrapping with `@scope`.
 * iOS WebKit (Safari + iPhone Chrome) drops or mishandles `@scope` + `:scope`
 * remaps, so cream/white text never applied and default black text sat on the
 * black CMS body background. Attribute prefixes work on WebKit and Blink.
 */
function splitSelectors(selectorText: string): string[] {
  const parts: string[] = [];
  let current = "";
  let depth = 0;
  for (let i = 0; i < selectorText.length; i++) {
    const ch = selectorText[i];
    if (ch === "(" || ch === "[") depth++;
    else if (ch === ")" || ch === "]") depth = Math.max(0, depth - 1);
    else if (ch === "," && depth === 0) {
      parts.push(current);
      current = "";
      continue;
    }
    current += ch;
  }
  if (current.trim()) parts.push(current);
  return parts;
}

function isDocumentRootSelector(selector: string): boolean {
  return /^(:root|html|body)$/i.test(selector);
}

function isDocumentRootChain(selector: string): boolean {
  const parts = selector.split(/[\s>]+/).filter(Boolean);
  return parts.length > 0 && parts.every((part) => isDocumentRootSelector(part));
}

function rewriteOneSelector(selector: string, host: string): string {
  const trimmed = selector.trim();
  if (!trimmed) return "";
  if (isDocumentRootSelector(trimmed) || isDocumentRootChain(trimmed)) {
    return host;
  }
  const withoutDoc = trimmed
    .replace(/^((:root|html|body)(\s+|>\s*)+)+/i, "")
    .trim();
  if (withoutDoc && withoutDoc !== trimmed) {
    return `${host} ${withoutDoc}`;
  }
  return `${host} ${trimmed}`;
}

function rewriteSelectorList(selectorText: string, host: string): string {
  return splitSelectors(selectorText)
    .map((part) => rewriteOneSelector(part, host))
    .filter(Boolean)
    .join(", ");
}

function skipComment(css: string, index: number): number {
  if (!css.startsWith("/*", index)) return index;
  const end = css.indexOf("*/", index + 2);
  return end === -1 ? css.length : end + 2;
}

function consumeBlock(css: string, openBraceIndex: number): number {
  let depth = 1;
  let i = openBraceIndex + 1;
  while (i < css.length && depth > 0) {
    i = skipComment(css, i);
    if (i >= css.length) break;
    const ch = css[i];
    if (ch === "{") depth++;
    else if (ch === "}") depth--;
    i++;
  }
  return i;
}

const PASSTHROUGH_AT_RULES = new Set([
  "keyframes",
  "font-face",
  "property",
  "counter-style",
  "page",
  "font-feature-values",
  "font-palette-values",
]);

function atRuleName(prelude: string): string {
  return (prelude.match(/^@([a-zA-Z-]+)/)?.[1] || "").toLowerCase();
}

function isPassthroughAtRule(name: string): boolean {
  return (
    PASSTHROUGH_AT_RULES.has(name) ||
    name.endsWith("-keyframes")
  );
}

/** Scope every rule to `host` (e.g. `[data-cms-html-css="abc"]`). */
export function scopeCssToHost(css: string, host: string): string {
  const source = String(css ?? "");
  let i = 0;
  let result = "";

  while (i < source.length) {
    const nextComment = skipComment(source, i);
    if (nextComment !== i) {
      result += source.slice(i, nextComment);
      i = nextComment;
      continue;
    }

    if (/\s/.test(source[i])) {
      result += source[i];
      i++;
      continue;
    }

    if (source[i] === "@") {
      let j = i + 1;
      while (j < source.length && source[j] !== "{" && source[j] !== ";") {
        const skipped = skipComment(source, j);
        if (skipped !== j) {
          j = skipped;
          continue;
        }
        j++;
      }
      const prelude = source.slice(i, j);
      const name = atRuleName(prelude);

      if (source[j] === ";") {
        result += source.slice(i, j + 1);
        i = j + 1;
        continue;
      }

      if (source[j] !== "{") {
        result += source.slice(i);
        break;
      }

      const end = consumeBlock(source, j);
      const inner = source.slice(j + 1, end - 1);
      result += isPassthroughAtRule(name)
        ? source.slice(i, end)
        : `${prelude}{${scopeCssToHost(inner, host)}}`;
      i = end;
      continue;
    }

    const brace = source.indexOf("{", i);
    if (brace === -1) {
      result += source.slice(i);
      break;
    }

    const end = consumeBlock(source, brace);
    const selectors = source.slice(i, brace);
    const decls = source.slice(brace + 1, end - 1);
    const rewritten = rewriteSelectorList(selectors, host);
    result += rewritten ? `${rewritten}{${decls}}` : source.slice(i, end);
    i = end;
  }

  return result;
}
