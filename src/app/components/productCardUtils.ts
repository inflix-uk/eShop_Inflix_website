import type { Product } from "../../../types";
import { buildProductHref } from "@/app/utils/productUrl";

export type ProductCardDisplay = {
  name: string;
  condition: string;
  /** Up to 2 condition badges for the card (best first). */
  conditionBadges: string[];
  /** Count of further conditions beyond the badges ("+N"). */
  extraConditionCount: number;
  /** Full list, e.g. for a tooltip. */
  conditionsLabel: string;
  /** Condition of the cheapest in-stock variant, shown with "From £X" when several conditions exist. */
  cheapestCondition: string | null;
  productHref: string;
  thumbnailSrc: string | null;
  thumbnailAlt: string;
  thumbnailTitle?: string;
  displayPrice: number;
  displayOriginalPrice: number;
  discountPercentage: number;
  hasGroupPrice: boolean;
  averageRating: number;
};

export function getProductThumbnailSrc(product: Product): string | null {
  const thumb = product.thumbnail_image;
  if (!thumb) return null;
  if (thumb.url?.trim()) return thumb.url.trim();
  if (!thumb.path?.trim()) return null;
  const base = (process.env.NEXT_PUBLIC_API_URL || "").replace(/\/+$/, "");
  if (!base) return thumb.path.trim();
  return `${base}/${thumb.path.replace(/^\/+/, "")}`;
}

export function getInitialStockStatus(product: Product): boolean {
  return product.hasStock !== undefined ? product.hasStock : true;
}

/**
 * One listing card per condition: a product sold as Brand New / Excellent / Good / Fair
 * becomes four cards, each with that condition's own price, stock and a link that opens
 * the product page on that condition. Products with one (or unknown) condition are
 * returned unchanged. Safe to call twice: already-split cards are left alone.
 */
export function expandProductsByCondition<T extends Product>(
  products: T[] | null | undefined
): T[] {
  const list = Array.isArray(products) ? products : [];
  const out: T[] = [];
  for (const product of list) {
    const listings = product?.conditionListings;
    if (product?.listing || !Array.isArray(listings) || listings.length < 2) {
      out.push(product);
      continue;
    }
    for (const l of listings) {
      const price = Number(l.price) > 0 ? Number(l.price) : 0;
      const original = Number(l.originalPrice) > 0 ? Number(l.originalPrice) : price;
      out.push({
        ...product,
        condition: l.label,
        conditions: [l.label],
        cheapestCondition: null,
        price: price || undefined,
        minSalePrice: price,
        minPrice: Number(l.minPrice) > 0 ? Number(l.minPrice) : original,
        originalPrice: original || undefined,
        hasStock: l.inStock,
        // Used by "Most Popular" sort: share of this condition's variants in stock.
        availabilityPercentage:
          l.variantCount > 0 ? Math.round((l.inStockCount / l.variantCount) * 100) : 0,
        availableVariants: l.inStockCount,
        listing: { conditionSlug: l.slug, variantSlug: l.variantSlug || "" },
      } as T);
    }
  }
  return out;
}

/** Unique React key for a card (split cards share the product _id). */
export function productListingKey(product: Product, index?: number): string {
  const base = product?._id ?? String(index ?? "");
  return product?.listing ? `${base}:${product.listing.conditionSlug}` : base;
}

export const PRODUCT_CARDS_PER_PAGE = 50;

export function getPaginatedProducts<T>(
  products: T[] | null | undefined,
  page: number,
  perPage = PRODUCT_CARDS_PER_PAGE
): T[] {
  const list = Array.isArray(products) ? products : [];
  const safePage =
    Number.isFinite(page) && page > 0 ? Math.floor(page) : 1;
  const start = (safePage - 1) * perPage;
  return list.slice(start, start + perPage);
}

const MAX_CONDITION_BADGES = 2;

export function getProductConditions(product: Product): string[] {
  const list = Array.isArray(product.conditions)
    ? product.conditions.filter((c) => typeof c === "string" && c.trim())
    : [];
  if (list.length > 0) return list;
  return product.condition ? [product.condition] : [];
}

function firstPositivePrice(...values: unknown[]): number {
  for (const value of values) {
    const amount = typeof value === "number" ? value : Number(value);
    if (Number.isFinite(amount) && amount > 0) return amount;
  }
  return 0;
}

export function getProductCardDisplayData(product: Product): ProductCardDisplay {
  const hasGroupPrice = typeof product.groupPrice === "number";
  const displayPrice = firstPositivePrice(
    product.price,
    product.minSalePrice,
    product.minPrice
  );
  const displayOriginalPrice = firstPositivePrice(
    product.originalPrice,
    product.minPrice,
    displayPrice
  );
  const discountPercentage =
    displayOriginalPrice > 0
      ? Math.max(
          0,
          Math.round(
            ((displayOriginalPrice - displayPrice) / displayOriginalPrice) * 100
          )
        )
      : 0;

  const conditions = getProductConditions(product);
  const conditionBadges = conditions.slice(0, MAX_CONDITION_BADGES);

  return {
    name: product.name,
    condition: product.condition,
    conditionBadges,
    extraConditionCount: conditions.length - conditionBadges.length,
    conditionsLabel: conditions.join(", "),
    cheapestCondition:
      conditions.length > 1 ? product.cheapestCondition || null : null,
    // Split per-condition cards open the product page on that condition's variant.
    productHref: product.listing?.variantSlug
      ? `${buildProductHref(product.producturl)}/${encodeURIComponent(product.listing.variantSlug)}`
      : buildProductHref(product.producturl),
    thumbnailSrc: getProductThumbnailSrc(product),
    thumbnailAlt: product.thumbnail_image?.altText || product.name || "Product Image",
    thumbnailTitle: product.thumbnail_image?.description || undefined,
    displayPrice,
    displayOriginalPrice,
    discountPercentage,
    hasGroupPrice,
    averageRating: product.averageRating
      ? Math.round(product.averageRating * 10) / 10
      : 0,
  };
}
