"use client";

import type { ReactNode } from "react";
import type { Product } from "../../../types";
import { useAppDispatch } from "../lib/hooks";
import { addProduct } from "@/app/lib/features/recentlyviewedproducts/recentlyViewedSlice";
import { useStockStatus } from "../hooks/useStockStatus";

type ProductCardEnhancersProps = {
  product: Product;
  checkStockRealTime?: boolean;
  initialInStock: boolean;
  children: ReactNode;
};

export default function ProductCardEnhancers({
  product,
  checkStockRealTime = false,
  initialInStock,
  children,
}: ProductCardEnhancersProps) {
  const dispatch = useAppDispatch();
  const stockStatus = useStockStatus(checkStockRealTime ? product._id : "");
  const isInStock = checkStockRealTime ? stockStatus.hasStock : initialInStock;

  return (
    <div
      className="block h-full min-w-0 w-full max-w-full"
      onClick={() => dispatch(addProduct(product))}
    >
      <div className="relative h-full">
        {children}
        {checkStockRealTime && !isInStock && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-[2]">
            <div className="bg-black bg-opacity-70 text-white px-4 py-2 rounded-lg transform -rotate-12">
              <span className="text-lg font-bold">Out of Stock</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
