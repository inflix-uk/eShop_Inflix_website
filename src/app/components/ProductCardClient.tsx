"use client";

import type { Product } from "../../../types";
import ProductCardEnhancersDefault from "./ProductCardEnhancersDefault";
import ProductCardView from "./ProductCardView";
import {
  getInitialStockStatus,
  getProductCardDisplayData,
} from "./productCardUtils";

type ProductCardClientProps = {
  product: Product;
};

export default function ProductCardClient({ product }: ProductCardClientProps) {
  const display = getProductCardDisplayData(product);
  const initialInStock = getInitialStockStatus(product);

  return (
    <ProductCardEnhancersDefault product={product}>
      <ProductCardView
        display={display}
        isInStock={initialInStock}
        variant="default"
      />
    </ProductCardEnhancersDefault>
  );
}
