"use client";

import { createContext, useContext } from "react";
import type { ProductCardDesign } from "@/app/services/productCardSettingsService";

const ProductCardDesignContext = createContext<ProductCardDesign>("classic");

export function ProductCardDesignProvider({
  design,
  children,
}: {
  design: ProductCardDesign;
  children: React.ReactNode;
}) {
  return (
    <ProductCardDesignContext.Provider value={design}>
      {children}
    </ProductCardDesignContext.Provider>
  );
}

export function useProductCardDesign(): ProductCardDesign {
  return useContext(ProductCardDesignContext);
}
