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
