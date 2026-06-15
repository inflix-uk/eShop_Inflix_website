"use client";

import type { Product } from "../../../types";
import ProductCardEnhancersDefault from "./ProductCardEnhancersDefault";
import ProductCardView from "./ProductCardView";
import {
  getInitialStockStatus,
  getProductCardDisplayData,
} from "./productCardUtils";
import { useProductCardDesign } from "@/app/context/ProductCardDesignContext";

type ProductCardProps = {
  product: Product;
};

export default function ProductCard({ product }: ProductCardProps) {
  const display = getProductCardDisplayData(product);
  const initialInStock = getInitialStockStatus(product);
  const cardDesign = useProductCardDesign();

  return (
    <ProductCardEnhancersDefault product={product}>
      <ProductCardView
        display={display}
        isInStock={initialInStock}
        variant="default"
        cardDesign={cardDesign}
      />
    </ProductCardEnhancersDefault>
  );
}
