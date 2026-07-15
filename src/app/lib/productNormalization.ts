import type { Product } from "../../../types";
import { getHomepageImageUrl } from "@/app/services/homepageDataService";

export const LATEST_SLIDER_COUNT = 6;

export function normalizeProductThumb(p: Product): Product {
  const thumb = p.thumbnail_image;
  if (!thumb) return p;
  const raw = (thumb as { url?: string; path?: string }).url || (thumb as { path?: string }).path;
  if (!raw) return p;
  if (raw.startsWith("http://") || raw.startsWith("https://")) return p;
  return {
    ...p,
    thumbnail_image: {
      ...thumb,
      url: getHomepageImageUrl(raw),
    },
  };
}

function thumbnailPathFromAggregate(thumb: unknown): string {
  if (!thumb) return "";
  if (typeof thumb === "string") return thumb;
  if (typeof thumb === "object" && thumb !== null) {
    const o = thumb as Record<string, string>;
    return o.url || o.path || "";
  }
  return "";
}

/** Map `/get/latest/products/homepage` aggregate docs to `Product` for cards. */
export function mapHomepageAggregateToProduct(p: Record<string, unknown>): Product {
  const id = String(p._id ?? "");
  const minP = Number(p.minPrice);
  const minS = Number(p.minSalePrice);
  const resolvedPrice = Number(p.price);
  const resolvedOriginalPrice = Number(p.originalPrice);
  const resolvedGroupPrice = Number(p.groupPrice);
  const safeMin = Number.isFinite(minP) && minP > 0 ? minP : 1;
  const safeSale = Number.isFinite(minS) && minS >= 0 ? minS : safeMin;
  const totalStock = Number(p.totalStock);
  const hasStock = Number.isFinite(totalStock) ? totalStock > 0 : true;
  const path = thumbnailPathFromAggregate(p.thumbnail_image);

  return {
    _id: id,
    name: String(p.name ?? ""),
    category: String(p.category ?? ""),
    subCategory: String(p.subCategory ?? ""),
    brand: p.brand != null ? String(p.brand) : undefined,
    condition: String(p.condition ?? "Refurbished"),
    is_featured: Boolean(p.is_featured),
    thumbnail_image: {
      filename: "",
      path,
      url: path && path.startsWith("http") ? path : undefined,
    },
    createdAt: String(p.createdAt ?? ""),
    updatedAt: String(p.updatedAt ?? ""),
    producturl: String(p.producturl ?? ""),
    minPrice: safeMin,
    minSalePrice: safeSale,
    price: Number.isFinite(resolvedPrice) ? resolvedPrice : undefined,
    originalPrice: Number.isFinite(resolvedOriginalPrice)
      ? resolvedOriginalPrice
      : undefined,
    groupPrice: Number.isFinite(resolvedGroupPrice) ? resolvedGroupPrice : null,
    averageRating:
      typeof p.averageRating === "number" && Number.isFinite(p.averageRating)
        ? p.averageRating
        : null,
    hasStock,
  };
}

const API_URL = process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, "") || "";

/**
 * Server-side function to prefetch products for SSR.
 * Does not include user-specific pricing (that happens on client hydration).
 */
export async function prefetchProductsForSlider(
  productSource: string | undefined,
  productIds: (string | number)[] | undefined
): Promise<Product[]> {
  if (!API_URL) return [];

  try {
    if (productSource === "latest") {
      const res = await fetch(`${API_URL}/get/latest/products/homepage`, {
        cache: "no-store",
      });
      if (!res.ok) return [];
      const data = await res.json().catch(() => ({}));
      const raw: Record<string, unknown>[] = Array.isArray(data.products)
        ? data.products
        : [];
      const sliced = raw.slice(0, LATEST_SLIDER_COUNT);
      return sliced.map((p) => normalizeProductThumb(mapHomepageAggregateToProduct(p)));
    }

    const ids = (productIds || []).map(String).filter(Boolean);
    if (ids.length === 0) return [];

    const qs = encodeURIComponent(ids.join(","));
    const res = await fetch(`${API_URL}/get/products/by-ids/public?ids=${qs}`, {
      cache: "no-store",
    });
    if (!res.ok) return [];
    const data = await res.json().catch(() => ({}));
    const raw: Product[] = Array.isArray(data.products) ? data.products : [];
    return raw.map(normalizeProductThumb);
  } catch {
    return [];
  }
}
