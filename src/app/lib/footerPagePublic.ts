import {
  fetchFooterPageBySlugFresh,
  type FooterPage,
} from "@/app/services/footerPageService";

export { FooterPageShell } from "@/app/components/footer-pages/FooterPageShell";

/** Map admin parent / legacy category slugs to public URL first segment. */
const PUBLIC_PARENT_SEGMENT: Record<string, string> = {
  product: "products",
  products: "products",
  blog: "blogs",
  blogs: "blogs",
  category: "categories",
  categories: "categories",
};

/** Parent segments used when resolving CMS pages under reserved app routes. */
export const FOOTER_PARENT_ROUTE_ALIASES: Record<string, string[]> = {
  products: ["products", "product"],
  blogs: ["blogs", "blog"],
  categories: ["categories", "category"],
};

export function normalizeFooterSlug(slug: string): string {
  try {
    return decodeURIComponent(slug).toLowerCase().trim();
  } catch {
    return String(slug || "").toLowerCase().trim();
  }
}

/** Public storefront path for a CMS footer page. */
export function buildFooterPagePublicPath(
  childSlug: string,
  parentSlug?: string | null
): string {
  const child = String(childSlug || "").trim();
  if (!child) return "/";
  if (!parentSlug || !String(parentSlug).trim()) {
    return `/${child}`;
  }
  const parent = normalizeFooterSlug(parentSlug);
  const segment = PUBLIC_PARENT_SEGMENT[parent] || parent;
  return `/${segment}/${child}`;
}

export function isPublishedFooterPage(
  page: FooterPage | null | undefined
): page is FooterPage {
  if (!page) return false;
  const pub = String(page.publishStatus ?? "").toLowerCase().trim();
  if (pub !== "published") return false;
  return Array.isArray(page.blocks) && page.blocks.length > 0;
}

/** Resolve child CMS page under a parent route segment (parentPageId or legacy categorySlug). */
export async function fetchNestedFooterPage(
  parentSegment: string,
  childSlug: string
): Promise<FooterPage | null> {
  const child = normalizeFooterSlug(childSlug);
  const parent = normalizeFooterSlug(parentSegment);
  const aliases = FOOTER_PARENT_ROUTE_ALIASES[parent] ?? [parent];

  for (const parentSlug of aliases) {
    const page = await fetchFooterPageBySlugFresh(child, parentSlug);
    if (page) return page;
  }
  return null;
}
