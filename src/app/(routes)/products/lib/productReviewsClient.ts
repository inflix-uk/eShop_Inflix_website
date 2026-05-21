import axios from "axios";

export type ProductReviewRow = {
  _id?: string;
  name?: string;
  email?: string;
  comment?: string;
  review?: string;
  rating?: number;
  status?: string;
  DateTime?: string;
  createdAt?: string;
};

export type ProductReviewsSummary = {
  reviews: ProductReviewRow[];
  averageRating: number;
  totalReviews: number;
  reviewsCount: Record<number, number>;
};

export function summarizeProductReviews(
  reviews: ProductReviewRow[] | null | undefined
): ProductReviewsSummary {
  const list = Array.isArray(reviews) ? reviews : [];
  if (list.length === 0) {
    return { reviews: [], averageRating: 0, totalReviews: 0, reviewsCount: {} };
  }

  const total = list.length;
  const average =
    list.reduce((acc, review) => acc + (Number(review.rating) || 0), 0) / total;

  const reviewsCount = list.reduce<Record<number, number>>((acc, review) => {
    const stars = Number(review.rating) || 0;
    if (stars >= 1 && stars <= 5) {
      acc[stars] = (acc[stars] || 0) + 1;
    }
    return acc;
  }, {});

  return {
    reviews: list,
    averageRating: Number(average.toFixed(1)) || 0,
    totalReviews: total,
    reviewsCount,
  };
}

export function getProductIdString(product: {
  _id?: unknown;
} | null | undefined): string {
  if (!product?._id) return "";
  const id = product._id;
  if (typeof id === "string") return id;
  if (typeof id === "object" && typeof id.toString === "function") {
    return id.toString();
  }
  return String(id);
}

/** Approved reviews for storefront (matches backend getProductByproducturl). */
export async function fetchApprovedProductReviews(
  apiBase: string,
  productId: string
): Promise<ProductReviewRow[]> {
  if (!apiBase || !productId) return [];
  const base = apiBase.endsWith("/") ? apiBase : `${apiBase}/`;
  const res = await axios.get(`${base}get/all/product/reviews/${productId}`);
  if (res.data?.status === 201) {
    return Array.isArray(res.data?.product?.reviewDetails)
      ? res.data.product.reviewDetails
      : [];
  }
  return [];
}
