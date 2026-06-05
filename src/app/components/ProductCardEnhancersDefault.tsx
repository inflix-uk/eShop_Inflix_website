"use client";

import type { ReactNode } from "react";
import type { Product } from "../../../types";
import { useAppDispatch } from "../lib/hooks";
import { addProduct } from "@/app/lib/features/recentlyviewedproducts/recentlyViewedSlice";

type ProductCardEnhancersDefaultProps = {
  product: Product;
  children: ReactNode;
};

export default function ProductCardEnhancersDefault({
  product,
  children,
}: ProductCardEnhancersDefaultProps) {
  const dispatch = useAppDispatch();

  return (
    <div onClick={() => dispatch(addProduct(product))}>{children}</div>
  );
}
