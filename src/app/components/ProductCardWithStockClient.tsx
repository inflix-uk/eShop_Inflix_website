"use client";

import type { Product } from "../../../types";
import ProductCardEnhancers from "./ProductCardEnhancers";
import ProductCardView from "./ProductCardView";
import {
  getInitialStockStatus,
  getProductCardDisplayData,
} from "./productCardUtils";
import { useProductCardDesign } from "@/app/context/ProductCardDesignContext";
import { useStockStatus } from "../hooks/useStockStatus";

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
  const stockStatus = useStockStatus(checkStockRealTime ? product._id : "");
  const isInStock = checkStockRealTime ? stockStatus.hasStock : initialInStock;
  const cardDesign = useProductCardDesign();

  return (
    <ProductCardEnhancers product={product}>
      <ProductCardView
        display={display}
        isInStock={isInStock}
        variant="withStock"
        cardDesign={cardDesign}
      />
    </ProductCardEnhancers>
  );
}
