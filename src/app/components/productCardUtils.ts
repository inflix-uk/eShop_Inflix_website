import type { Product } from "../../../types";
import { buildProductHref } from "@/app/utils/productUrl";

export type ProductCardDisplay = {
  name: string;
  condition: string;
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

export const PRODUCT_CARDS_PER_PAGE = 50;

export function getPaginatedProducts<T>(
  products: T[],
  page: number,
  perPage = PRODUCT_CARDS_PER_PAGE
): T[] {
  const safePage =
    Number.isFinite(page) && page > 0 ? Math.floor(page) : 1;
  const start = (safePage - 1) * perPage;
  return products.slice(start, start + perPage);
}

export function getProductCardDisplayData(product: Product): ProductCardDisplay {
  const hasGroupPrice = typeof product.groupPrice === "number";
  const displayPrice =
    typeof product.price === "number" ? product.price : product.minSalePrice;
  const displayOriginalPrice =
    typeof product.originalPrice === "number"
      ? product.originalPrice
      : product.minPrice;
  const discountPercentage =
    displayOriginalPrice > 0
      ? Math.max(
          0,
          Math.round(
            ((displayOriginalPrice - displayPrice) / displayOriginalPrice) * 100
          )
        )
      : 0;

  return {
    name: product.name,
    condition: product.condition,
    productHref: buildProductHref(product.producturl),
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
