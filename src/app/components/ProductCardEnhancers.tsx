"use client";

import type { ReactNode } from "react";
import type { Product } from "../../../types";
import { useAppDispatch } from "../lib/hooks";
import { addProduct } from "@/app/lib/features/recentlyviewedproducts/recentlyViewedSlice";

type ProductCardEnhancersProps = {
  product: Product;
  children: ReactNode;
};

export default function ProductCardEnhancers({
  product,
  children,
}: ProductCardEnhancersProps) {
  const dispatch = useAppDispatch();

  return (
    <div
      className="block h-full min-w-0 w-full max-w-full"
      onClick={() => dispatch(addProduct(product))}
    >
      <div className="relative h-full">{children}</div>
    </div>
  );
}
