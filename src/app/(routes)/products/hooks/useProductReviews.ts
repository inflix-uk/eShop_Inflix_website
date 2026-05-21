"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  fetchApprovedProductReviews,
  getProductIdString,
  summarizeProductReviews,
  type ProductReviewRow,
  type ProductReviewsSummary,
} from "../lib/productReviewsClient";

const emptySummary: ProductReviewsSummary = {
  reviews: [],
  averageRating: 0,
  totalReviews: 0,
  reviewsCount: {},
};

export function useProductReviews(
  product: { _id?: unknown; reviewDetails?: ProductReviewRow[] } | null | undefined,
  apiBase: string
) {
  const productId = getProductIdString(product);

  const embeddedReviews = useMemo(() => {
    return Array.isArray(product?.reviewDetails) ? product.reviewDetails : [];
  }, [product?.reviewDetails]);

  const [summary, setSummary] = useState<ProductReviewsSummary>(() =>
    summarizeProductReviews(embeddedReviews)
  );
  const [loading, setLoading] = useState(false);

  const loadReviews = useCallback(async () => {
    if (!productId) {
      setSummary(summarizeProductReviews([]));
      return;
    }

    setLoading(true);
    try {
      const fromApi = await fetchApprovedProductReviews(apiBase, productId);
      const merged = fromApi.length > 0 ? fromApi : embeddedReviews;
      setSummary(summarizeProductReviews(merged));
    } catch (error) {
      console.error("Error fetching product reviews:", error);
      setSummary(summarizeProductReviews(embeddedReviews));
    } finally {
      setLoading(false);
    }
  }, [apiBase, productId, embeddedReviews]);

  useEffect(() => {
    setSummary(summarizeProductReviews(embeddedReviews));
    void loadReviews();
  }, [productId, loadReviews, embeddedReviews]);

  return {
    reviews: summary.reviews,
    averageRating: summary.averageRating,
    totalReviews: summary.totalReviews,
    reviewsCount: summary.reviewsCount,
    loading,
    reloadReviews: loadReviews,
  };
}
