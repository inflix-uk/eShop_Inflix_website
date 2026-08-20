import { getCanonical } from "@/lib/getCanonical";

export type ItemListProductEntry = {
  name?: string;
  producturl?: string;
};

export type BuildItemListOptions = {
  /** Absolute or path used for list page canonical (path under site, e.g. categories/car-fragrance). */
  listPath: string;
  name?: string | null;
  description?: string | null;
  products: ItemListProductEntry[];
};

function escapeJsonLdForScriptTag(json: string): string {
  return json.replace(/</g, "\\u003c");
}

/**
 * Google summary-page ItemList for category/listing pages.
 * Requires at least 2 products with a producturl. Returns null otherwise.
 */
export async function buildProductItemListJsonLdString(
  options: BuildItemListOptions
): Promise<string | null> {
  const listPath = String(options.listPath || "")
    .replace(/^\/+/, "")
    .replace(/\/+$/, "");
  if (!listPath) return null;

  const entries = (Array.isArray(options.products) ? options.products : [])
    .map((p) => {
      const slug = String(p?.producturl || "")
        .trim()
        .replace(/^\/+/, "")
        .replace(/\/+$/, "");
      const name = String(p?.name || "").trim();
      if (!slug) return null;
      return { slug, name };
    })
    .filter((p): p is { slug: string; name: string } => Boolean(p));

  // Google ItemList: at least two ListItem entries
  if (entries.length < 2) return null;

  const listUrl = await getCanonical(`/${listPath}`);
  const itemListElement = await Promise.all(
    entries.map(async (entry, index) => {
      const url = await getCanonical(`/products/${entry.slug}`);
      const item: Record<string, unknown> = {
        "@type": "ListItem",
        position: index + 1,
        url,
      };
      if (entry.name) item.name = entry.name;
      return item;
    })
  );

  const schema: Record<string, unknown> = {
    "@context": "https://schema.org/",
    "@type": "ItemList",
    url: listUrl,
    numberOfItems: itemListElement.length,
    itemListElement,
  };

  const name = String(options.name || "").trim();
  const description = String(options.description || "").trim();
  if (name) schema.name = name;
  if (description) schema.description = description;

  return escapeJsonLdForScriptTag(JSON.stringify(schema));
}

/** True if any admin JSON-LD entry is already an ItemList. */
export function adminSchemasIncludeItemList(
  jsonLdStrings: string[] | undefined
): boolean {
  if (!jsonLdStrings?.length) return false;
  return jsonLdStrings.some((raw) => {
    try {
      const obj = JSON.parse(raw) as { "@type"?: string | string[] };
      const type = obj?.["@type"];
      if (typeof type === "string") return type === "ItemList";
      if (Array.isArray(type)) return type.includes("ItemList");
      return false;
    } catch {
      return /"@type"\s*:\s*"ItemList"/.test(raw);
    }
  });
}
