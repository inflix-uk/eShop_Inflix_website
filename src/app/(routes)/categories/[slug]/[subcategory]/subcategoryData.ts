export function subcategoryDetailsUrl(parentSlug: string, subCategoryName: string): string {
  const base = String(process.env.NEXT_PUBLIC_API_URL || "").replace(/\/+$/, "");
  return `${base}/get/subcategory/somedetails/${encodeURIComponent(subCategoryName)}?category=${encodeURIComponent(parentSlug)}`;
}

/** A real subcategory has a numeric index. The old miss payload used null and 200. */
export function isRealSubcategory(details: unknown): boolean {
  if (!details || typeof details !== "object") return false;
  return Number.isInteger((details as { subCategoryIndex?: unknown }).subCategoryIndex);
}
