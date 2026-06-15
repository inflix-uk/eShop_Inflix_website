"use client";

import type { Product } from "../../../types";
import ProductCardEnhancers from "./ProductCardEnhancers";
import ProductCardView from "./ProductCardView";
import {
  getInitialStockStatus,
  getProductCardDisplayData,
} from "./productCardUtils";
import { useProductCardDesign } from "@/app/context/ProductCardDesignContext";

type ProductCardWithStockClientProps = {
  product: Product;
  checkStockRealTime?: boolean;
};

export default function ProductCardWithStockClient({
  product,
  checkStockRealTime = false,
}: ProductCardWithStockClientProps) {
  const display = getProductCardDisplayData(product);
  const initialInStock = getInitialStockStatus(product);
  const cardDesign = useProductCardDesign();

  return (
    <ProductCardEnhancers
      product={product}
      checkStockRealTime={checkStockRealTime}
      initialInStock={initialInStock}
    >
      <ProductCardView
        display={display}
        isInStock={initialInStock}
        variant="withStock"
        cardDesign={cardDesign}
      />
    </ProductCardEnhancers>
  );
}
