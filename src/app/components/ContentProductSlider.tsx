"use client";

import { useCallback, useEffect, useState, useRef, useMemo } from "react";
import SwiperComponent from "@/app/components/SwiperComponent";
import ProductCardWithStockClient from "@/app/components/ProductCardWithStockClient";
import type { Product } from "../../../types";
import { type ProductSliderBlockContent } from "@/app/services/homepageDataService";
import {
  bleedStyle,
  useBlogContentFullBleed,
} from "@/app/(routes)/blogs/new/[slug]/useBlogContentFullBleed";
import { useAuth } from "@/app/context/Auth";
import { useDeferUntilVisible } from "@/app/lib/useDeferUntilVisible";
import {
  normalizeProductThumb,
  mapHomepageAggregateToProduct,
  LATEST_SLIDER_COUNT,
} from "@/app/lib/productNormalization";

const API_URL = process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, "") || "";

export default function ContentProductSlider({
  content,
  initialProducts = [],
}: {
  content: ProductSliderBlockContent;
  initialProducts?: Product[];
}) {
  const auth = useAuth();
  const isLatest = content.productSource === "latest";
  const ids = useMemo(
    () => (content.productIds || []).map(String).filter(Boolean),
    [content.productIds]
  );
  const title =
    (content.sectionTitle && String(content.sectionTitle).trim()) || "Products";

  const [items, setItems] = useState<Product[]>(initialProducts);
  const [loading, setLoading] = useState(() => 
    initialProducts.length === 0 && (isLatest || ids.length > 0)
  );

  const rootRef = useRef<HTMLDivElement>(null);
  const shouldFetch = useDeferUntilVisible(rootRef, { rootMargin: "320px 0px" });
  const bleedActive = (isLatest || ids.length > 0) && (loading || items.length > 0);
  const bleed = useBlogContentFullBleed(rootRef, bleedActive);

  const fetchProducts = useCallback(async () => {
    if (!API_URL) {
      setItems([]);
      setLoading(false);
      return;
    }

    const pricingGroupId = auth?.user?.pricingGroup
      ? String(auth.user.pricingGroup)
      : "";
    const userId = auth?.user?._id ? String(auth.user._id) : "";
    const queryParams = new URLSearchParams();
    if (pricingGroupId) queryParams.set("groupId", pricingGroupId);
    if (userId) queryParams.set("userId", userId);
    const scopeQuery = queryParams.toString() ? `?${queryParams.toString()}` : "";

    if (isLatest) {
      setLoading(true);
      try {
        const listEndpoint = scopeQuery
          ? `${API_URL}/api/products${scopeQuery}`
          : `${API_URL}/get/latest/products/homepage`;
        const res = await fetch(listEndpoint, {
          cache: "no-store",
        });
        const data = await res.json().catch(() => ({}));
        const raw: Record<string, unknown>[] = Array.isArray(data.products)
          ? data.products
          : [];
        const sliced = raw.slice(0, LATEST_SLIDER_COUNT);
        setItems(
          sliced.map((p) => normalizeProductThumb(mapHomepageAggregateToProduct(p)))
        );
      } catch {
        setItems([]);
      } finally {
        setLoading(false);
      }
      return;
    }

    if (ids.length === 0) {
      setItems([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const qs = encodeURIComponent(ids.join(","));
      const endpoint = scopeQuery
        ? `${API_URL}/api/products${scopeQuery}`
        : `${API_URL}/get/products/by-ids/public?ids=${qs}`;
      const res = await fetch(endpoint, {
        cache: "no-store",
      });
      const data = await res.json();
      const raw: Product[] = Array.isArray(data.products) ? data.products : [];
      const normalized = raw.map(normalizeProductThumb);
      if (scopeQuery) {
        const byId = new Map(normalized.map((item) => [String(item._id), item]));
        const filteredToIds =
          ids.length > 0
            ? ids.map((id) => byId.get(String(id))).filter(Boolean)
            : normalized;
        setItems(filteredToIds as Product[]);
      } else {
        setItems(normalized);
      }
    } catch {
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [isLatest, ids.join(","), auth?.user?.pricingGroup, auth?.user?._id]);

  const hasUserPricing = Boolean(auth?.user?.pricingGroup);
  const needsRefetch = initialProducts.length === 0 || hasUserPricing;

  useEffect(() => {
    if (!shouldFetch) return;
    if (!needsRefetch) return;
    fetchProducts();
  }, [fetchProducts, shouldFetch, needsRefetch]);

  if (!isLatest && ids.length === 0) {
    return null;
  }

  if (loading && items.length === 0) {
    return (
      <div
        ref={rootRef}
        className="w-full min-w-0 max-w-full"
        style={bleedStyle(bleed)}
      >
        <div className="py-8 text-center text-sm text-gray-500" aria-live="polite">
          Loading products…
        </div>
      </div>
    );
  }

  if (items.length === 0) {
    return null;
  }

  return (
    <div
      ref={rootRef}
      className="w-full min-w-0 max-w-full"
      style={bleedStyle(bleed)}
    >
      <SwiperComponent
        title={title}
        items={items}
        renderCard={(product) => (
          <ProductCardWithStockClient product={product} checkStockRealTime={true} />
        )}
        linkText="View All"
      />
    </div>
  );
}
