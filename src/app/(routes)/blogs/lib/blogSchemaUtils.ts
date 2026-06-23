import {
  extractHtmlDocumentFragment,
  normalizeBlogBlockColumns,
  type BlogBlockRow,
} from "./blogHtmlCssUtils";

/** YYYY-MM-DD in UTC for schema.org date fields. */
export function formatBlogSchemaDate(dateStr: string): string {
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) {
    return String(dateStr || "").slice(0, 10);
  }
  const yyyy = d.getUTCFullYear();
  const mm = String(d.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(d.getUTCDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

function coerceBlogDate(value: unknown): Date | null {
  if (value == null || value === "") return null;
  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : value;
  }
  if (typeof value === "number" && Number.isFinite(value)) {
    const d = new Date(value);
    return Number.isNaN(d.getTime()) ? null : d;
  }
  if (typeof value === "object" && value !== null && "$date" in value) {
    return coerceBlogDate((value as { $date: unknown }).$date);
  }
  if (typeof value === "string" && value.trim()) {
    const d = new Date(value);
    return Number.isNaN(d.getTime()) ? null : d;
  }
  return null;
}

export function getBlogSchemaDates(post: Record<string, unknown>): {
  datePublished: string;
  dateModified: string;
} {
  const published =
    coerceBlogDate(post.publishDate) ??
    coerceBlogDate(post.createdAt) ??
    new Date();
  const modified = coerceBlogDate(post.updatedAt) ?? published;
  const modifiedSafe =
    modified.getTime() < published.getTime() ? published : modified;

  return {
    datePublished: formatBlogSchemaDate(published.toISOString()),
    dateModified: formatBlogSchemaDate(modifiedSafe.toISOString()),
  };
}

/** Open Graph article times from admin publish/update timestamps. */
export function getBlogOpenGraphTimes(post: Record<string, unknown>): {
  publishedTime?: string;
  modifiedTime?: string;
} {
  const published =
    coerceBlogDate(post.publishDate) ?? coerceBlogDate(post.createdAt);
  const modified = coerceBlogDate(post.updatedAt) ?? published;
  const modifiedSafe =
    published && modified && modified.getTime() < published.getTime()
      ? published
      : modified;

  return {
    ...(published
      ? { publishedTime: formatBlogSchemaDate(published.toISOString()) }
      : {}),
    ...(modifiedSafe
      ? { modifiedTime: formatBlogSchemaDate(modifiedSafe.toISOString()) }
      : {}),
  };
}

function decodeBasicHtmlEntities(text: string): string {
  return text
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'");
}

/** Strip tags/scripts/styles and collapse whitespace for schema.org articleBody. */
export function htmlToPlainArticleText(html: string): string {
  let s = extractHtmlDocumentFragment(html);
  s = s.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "");
  s = s.replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, "");
  s = s.replace(/<[^>]+>/g, " ");
  s = decodeBasicHtmlEntities(s);
  return s.replace(/\s+/g, " ").trim();
}

function pushPlainText(parts: string[], value: unknown): void {
  if (typeof value !== "string") return;
  const plain = htmlToPlainArticleText(value);
  if (plain) parts.push(plain);
}

function collectPlainTextFromBlock(block: unknown, parts: string[]): void {
  if (!block || typeof block !== "object") return;
  const b = block as { type?: string; content?: unknown };

  switch (b.type) {
    case "text":
      if (typeof b.content === "string") {
        pushPlainText(parts, b.content);
      }
      break;
    case "paragraph":
    case "heading":
      if (b.content && typeof b.content === "object") {
        const text = (b.content as { text?: string }).text;
        if (text?.trim()) parts.push(text.trim());
      }
      break;
    case "image":
      if (b.content && typeof b.content === "object") {
        const c = b.content as {
          alt?: string;
          caption?: string;
          heading?: string;
        };
        if (c.heading?.trim()) parts.push(c.heading.trim());
        if (c.alt?.trim()) parts.push(c.alt.trim());
        if (c.caption?.trim()) parts.push(c.caption.trim());
      }
      break;
    case "widget":
      if (!b.content || typeof b.content !== "object") break;
      collectPlainTextFromWidget(b.content as Record<string, unknown>, parts);
      break;
    default:
      break;
  }
}

function collectPlainTextFromWidget(
  content: Record<string, unknown>,
  parts: string[]
): void {
  const widgetType = content.widgetType;

  if (widgetType === "htmlCss") {
    pushPlainText(parts, content.html);
    return;
  }

  if (widgetType === "faq" && Array.isArray(content.items)) {
    for (const item of content.items) {
      if (!item || typeof item !== "object") continue;
      const q = (item as { question?: string }).question;
      const a = (item as { answer?: string }).answer;
      if (q?.trim()) parts.push(q.trim());
      if (a?.trim()) pushPlainText(parts, a);
    }
    return;
  }

  for (const key of ["heading", "description", "sectionHeading", "sectionDescription", "caption"]) {
    const value = content[key];
    if (typeof value === "string" && value.trim()) {
      parts.push(value.trim());
    }
  }
}

/**
 * Plain-text article body for BlogPosting JSON-LD — from `content`, block editor,
 * or Custom HTML/CSS widgets (admin-published data).
 */
export function extractBlogArticlePlainText(
  post: Record<string, unknown>
): string {
  const parts: string[] = [];

  const legacyContent =
    typeof post.content === "string" ? post.content.trim() : "";
  if (legacyContent) {
    pushPlainText(parts, legacyContent);
  }

  const rows = Array.isArray(post.blocks) ? post.blocks : [];
  for (const row of rows) {
    for (const column of normalizeBlogBlockColumns(row as BlogBlockRow)) {
      for (const block of column.blocks) {
        collectPlainTextFromBlock(block, parts);
      }
    }
  }

  const joined = parts.join(" ").replace(/\s+/g, " ").trim();
  if (joined) return joined;

  const excerpt = typeof post.excerpt === "string" ? post.excerpt.trim() : "";
  if (excerpt) return excerpt;

  const metaDesc =
    typeof post.metaDescription === "string" ? post.metaDescription.trim() : "";
  return metaDesc;
}
