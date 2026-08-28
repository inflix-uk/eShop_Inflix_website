import type {
  ContentBlock,
  FaqItemContent,
  HomepageBlock,
  WidgetFaqContent,
} from "@/app/services/homepageDataService";

export type FaqSchemaItem = {
  question?: string;
  answer?: string;
};

/** Plain text for schema.org (strip HTML tags from CMS answers). */
export function stripHtmlForSchema(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/\s+/g, " ")
    .trim();
}

export function normalizeFaqItems(items: FaqSchemaItem[] | undefined): FaqSchemaItem[] {
  if (!Array.isArray(items)) return [];
  return items.filter(
    (item) =>
      stripHtmlForSchema(String(item.question || "")).length > 0 &&
      stripHtmlForSchema(String(item.answer || "")).length > 0
  );
}

export function buildFaqPageJsonLdString(items: FaqSchemaItem[]): string | null {
  const node = buildFaqPageJsonLd(items);
  return node ? JSON.stringify(node) : null;
}

export function buildFaqPageJsonLd(
  items: FaqSchemaItem[]
): Record<string, unknown> | null {
  const normalized = normalizeFaqItems(items);
  if (normalized.length === 0) return null;

  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: normalized.map((item) => ({
      "@type": "Question",
      name: stripHtmlForSchema(String(item.question || "")),
      acceptedAnswer: {
        "@type": "Answer",
        text: stripHtmlForSchema(String(item.answer || "")),
      },
    })),
  };
}

function isFaqWidgetContent(
  content: ContentBlock["content"]
): content is WidgetFaqContent {
  return (
    typeof content === "object" &&
    content !== null &&
    "widgetType" in content &&
    (content as WidgetFaqContent).widgetType === "faq"
  );
}

/** Collect FAQ items from homepage CMS blocks (all FAQ widgets). */
export function extractFaqItemsFromHomepageBlocks(
  blocks: HomepageBlock[]
): FaqItemContent[] {
  const items: FaqItemContent[] = [];
  for (const row of blocks) {
    for (const column of row.columns || []) {
      for (const block of column.blocks || []) {
        if (block.type !== "widget" || !isFaqWidgetContent(block.content)) {
          continue;
        }
        for (const item of block.content.items || []) {
          items.push(item);
        }
      }
    }
  }
  return items;
}

export function buildHomepageFaqJsonLdStrings(
  blocks: HomepageBlock[]
): string[] {
  const jsonLd = buildFaqPageJsonLdString(extractFaqItemsFromHomepageBlocks(blocks));
  return jsonLd ? [jsonLd] : [];
}
